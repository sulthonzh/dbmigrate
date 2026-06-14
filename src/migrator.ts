import { Config, Migration, MigrationResult, DatabaseDriver } from './types';
import { SQLiteDriver } from './drivers/sqlite';
import { PostgreSQLDriver } from './drivers/postgresql';
import { MySQLDriver } from './drivers/mysql';
import { loadMigrations } from './utils';
import { Logger } from './logger';

export class Migrator {
  private config: Config;
  private driver: DatabaseDriver;
  private logger: Logger;

  constructor(config: Config, logger?: Logger) {
    this.config = config;
    this.logger = logger || console;
    this.driver = this.createDriver();
  }

  private createDriver(): DatabaseDriver {
    switch (this.config.driver) {
      case 'sqlite':
        return new SQLiteDriver(this.config.database);
      case 'postgresql':
        return new PostgreSQLDriver(this.config.database);
      case 'mysql':
        return new MySQLDriver(this.config.database);
      default:
        throw new Error(`Unsupported driver: ${this.config.driver}`);
    }
  }

  async connect(): Promise<void> {
    await this.driver.connect();
    await this.driver.createTable();
  }

  async disconnect(): Promise<void> {
    await this.driver.disconnect();
  }

  async getStatus(): Promise<{ applied: Migration[]; pending: Migration[] }> {
    await this.connect();
    
    const migrations = loadMigrations(this.config);
    const appliedStatus = await this.driver.getMigrations();
    
    const appliedVersions = appliedStatus.map(m => m.version);
    const pending = migrations.filter(m => !appliedVersions.includes(m.version));
    
    await this.disconnect();
    
    return { applied: appliedStatus.map((m: any) => ({
      timestamp: m.timestamp,
      name: m.name,
      version: m.version,
      path: '',
      up: ''
    })), pending };
  }

  async getPending(): Promise<Migration[]> {
    const { pending } = await this.getStatus();
    return pending;
  }

  async getNext(): Promise<Migration | null> {
    const pending = await this.getPending();
    return pending.length > 0 ? pending[0] : null;
  }

  async migrate(dryRun = false, verbose = false): Promise<MigrationResult> {
    await this.connect();
    
    const migrations = loadMigrations(this.config);
    const appliedStatus = await this.driver.getMigrations();
    
    const appliedVersions = appliedStatus.map(m => m.version);
    const pending = migrations.filter(m => !appliedVersions.includes(m.version));
    
    if (pending.length === 0) {
      await this.disconnect();
      return {
        success: true,
        migrations: [],
      };
    }

    if (dryRun) {
      await this.disconnect();
      return {
        success: true,
        migrations: pending.map(m => `${m.version}_${m.name}`),
      };
    }

    const appliedMigrations: string[] = [];
    let hasErrors = false;
    const errors: string[] = [];

    try {
      for (const migration of pending) {
        try {
          if (verbose) {
            this.logger.info(`Applying migration: ${migration.version}_${migration.name}`);
          }

          if (this.config.transaction) {
            await this.driver.execute('BEGIN TRANSACTION');
            
            try {
              await this.driver.execute(migration.up);
              await this.driver.markMigration(migration);
              await this.driver.execute('COMMIT');
              
              if (verbose) {
                this.logger.info(`✓ Applied: ${migration.version}_${migration.name}`);
              }
              appliedMigrations.push(`${migration.version}_${migration.name}`);
            } catch (error) {
              await this.driver.execute('ROLLBACK');
              throw error;
            }
          } else {
            await this.driver.execute(migration.up);
            await this.driver.markMigration(migration);
            
            if (verbose) {
              this.logger.info(`✓ Applied: ${migration.version}_${migration.name}`);
            }
            appliedMigrations.push(`${migration.version}_${migration.name}`);
          }
        } catch (error: any) {
          hasErrors = true;
          const errorMessage = `Failed to apply migration ${migration.version}_${migration.name}: ${error.message}`;
          errors.push(errorMessage);
          this.logger.error(errorMessage);

          if (!this.config.transaction) {
            break;
          }
        }
      }

      await this.disconnect();
      
      return {
        success: !hasErrors,
        migrations: appliedMigrations,
        errors: hasErrors ? errors : undefined,
      };
    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }

  async rollback(to?: string, steps = 1): Promise<MigrationResult> {
    await this.connect();
    
    const appliedStatus = await this.driver.getMigrations();
    let migrationsToRollback: any[] = [];

    if (to) {
      const targetIndex = appliedStatus.findIndex(m => m.version === to);
      if (targetIndex === -1) {
        throw new Error(`Migration ${to} not found in applied migrations`);
      }
      
      migrationsToRollback = appliedStatus.slice(targetIndex);
    } else {
      migrationsToRollback = appliedStatus.slice(-steps);
    }

    const rolledBackMigrations: string[] = [];
    let hasErrors = false;
    const errors: string[] = [];

    try {
      for (const migration of migrationsToRollback.reverse()) {
        try {
          const migrationFile = loadMigrations(this.config).find(m => m.version === migration.version);
          if (!migrationFile || !migrationFile.down) {
            throw new Error(`No down migration found for ${migration.version}_${migration.name}`);
          }

          if (this.config.transaction) {
            await this.driver.execute('BEGIN TRANSACTION');
            
            try {
              await this.driver.execute(migrationFile.down);
              await this.driver.unmarkMigration(migration);
              await this.driver.execute('COMMIT');
              
              this.logger.info(`✓ Rolled back: ${migration.version}_${migration.name}`);
              rolledBackMigrations.push(`${migration.version}_${migration.name}`);
            } catch (error) {
              await this.driver.execute('ROLLBACK');
              throw error;
            }
          } else {
            await this.driver.execute(migrationFile.down);
            await this.driver.unmarkMigration(migration);
            
            this.logger.info(`✓ Rolled back: ${migration.version}_${migration.name}`);
            rolledBackMigrations.push(`${migration.version}_${migration.name}`);
          }
        } catch (error: any) {
          hasErrors = true;
          const errorMessage = `Failed to rollback migration ${migration.version}_${migration.name}: ${error.message}`;
          errors.push(errorMessage);
          this.logger.error(errorMessage);

          if (!this.config.transaction) {
            break;
          }
        }
      }

      await this.disconnect();
      
      return {
        success: !hasErrors,
        migrations: rolledBackMigrations.reverse(),
        errors: hasErrors ? errors : undefined,
      };
    } catch (error) {
      await this.disconnect();
      throw error;
    }
  }

  async reset(): Promise<void> {
    await this.connect();
    
    try {
      await this.driver.execute(`DELETE FROM ${this.config.tableName}`);
      this.logger.info('All migrations reset');
    } finally {
      await this.disconnect();
    }
  }
}