import { BaseDriver } from './base';
import { DatabaseDriver } from '../types';

export class SQLiteDriver extends BaseDriver implements DatabaseDriver {
  private dbPath: string;

  constructor(database: string) {
    super();
    this.dbPath = database;
  }

  async connect(): Promise<void> {
    const sqlite3 = require('sqlite3');
    this.db = new sqlite3.Database(this.dbPath, (err: any) => {
      if (err) {
        throw new Error(`Failed to connect to SQLite database: ${err.message}`);
      }
    });
  }

  async disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err: any) => {
          if (err) {
            reject(new Error(`Failed to close database: ${err.message}`));
          } else {
            this.db = null;
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  async execute(sql: string, params?: any[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    
    return new Promise((resolve, reject) => {
      if (params && params.length > 0) {
        this.db.run(sql, params, (err: any) => {
          if (err) {
            reject(new Error(`SQL execution failed: ${err.message}`));
          } else {
            resolve();
          }
        });
      } else {
        this.db.run(sql, (err: any) => {
          if (err) {
            reject(new Error(`SQL execution failed: ${err.message}`));
          } else {
            resolve();
          }
        });
      }
    });
  }

  async query(sql: string, params?: any[]): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    
    return new Promise((resolve, reject) => {
      if (params && params.length > 0) {
        this.db.all(sql, params, (err: any, rows: any[]) => {
          if (err) {
            reject(new Error(`SQL query failed: ${err.message}`));
          } else {
            resolve(rows);
          }
        });
      } else {
        this.db.all(sql, (err: any, rows: any[]) => {
          if (err) {
            reject(new Error(`SQL query failed: ${err.message}`));
          } else {
            resolve(rows);
          }
        });
      }
    });
  }

  getMigrationsTableName(): string {
    return 'schema_migrations';
  }
}