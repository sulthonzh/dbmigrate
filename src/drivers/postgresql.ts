import { BaseDriver } from './base';
import { DatabaseDriver } from '../types';

export class PostgreSQLDriver extends BaseDriver implements DatabaseDriver {
  private connectionString: string;

  constructor(database: string) {
    super();
    this.connectionString = database;
  }

  async connect(): Promise<void> {
    const { Pool } = require('pg');
    this.db = new Pool({
      connectionString: this.connectionString,
    });
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      await this.db.end();
      this.db = null;
    }
  }

  async execute(sql: string, params?: any[]): Promise<void> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    
    try {
      await this.db.query(sql, params);
    } catch (error: any) {
      throw new Error(`PostgreSQL execution failed: ${error.message}`);
    }
  }

  async query(sql: string, params?: any[]): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    
    try {
      const result = await this.db.query(sql, params);
      return result.rows;
    } catch (error: any) {
      throw new Error(`PostgreSQL query failed: ${error.message}`);
    }
  }

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
}