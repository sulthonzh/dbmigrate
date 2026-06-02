import { DatabaseDriver, MigrationStatus } from '../types';

export abstract class BaseDriver implements DatabaseDriver {
  protected db: any;

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract execute(sql: string, params?: any[]): Promise<any>;
  abstract query(sql: string, params?: any[]): Promise<any>;

  async createTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${this.getMigrationsTableName()} (
        version VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await this.execute(sql);
  }

  getMigrationsTableName(): string {
    return 'schema_migrations';
  }

  async getMigrations(): Promise<MigrationStatus[]> {
    try {
      const rows = await this.query(
        `SELECT version, name, applied_at FROM ${this.getMigrationsTableName()} ORDER BY version`
      );
      return rows.map((row: any) => ({
        timestamp: parseInt(row.version),
        name: row.name,
        version: row.version,
        appliedAt: new Date(row.applied_at),
      }));
    } catch (error) {
      if (this.isTableNotFoundError(error)) {
        await this.createTable();
        return [];
      }
      throw error;
    }
  }

  async markMigration(migration: { timestamp: number; name: string; version: string }): Promise<void> {
    await this.execute(
      `INSERT INTO ${this.getMigrationsTableName()} (version, name) VALUES (?, ?)`,
      [migration.version, migration.name]
    );
  }

  async unmarkMigration(migration: { timestamp: number; name: string; version: string }): Promise<void> {
    await this.execute(
      `DELETE FROM ${this.getMigrationsTableName()} WHERE version = ?`,
      [migration.version]
    );
  }

  protected isTableNotFoundError(error: any): boolean {
    const errorMessages = [
      'no such table',
      'relation does not exist',
      'table not found',
      'table does not exist'
    ];
    return errorMessages.some(msg => error.message.toLowerCase().includes(msg));
  }

  protected formatTimestamp(timestamp: number): string {
    return timestamp.toString().padStart(14, '0');
  }
}