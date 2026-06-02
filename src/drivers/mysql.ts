import { BaseDriver } from './base';
import { DatabaseDriver } from '../types';

export class MySQLDriver extends BaseDriver implements DatabaseDriver {
  private connectionString: string;

  constructor(database: string) {
    super();
    this.connectionString = database;
  }

  async connect(): Promise<void> {
    const mysql = require('mysql2/promise');
    this.db = await mysql.createConnection(this.connectionString);
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
      await this.db.execute(sql, params);
    } catch (error: any) {
      throw new Error(`MySQL execution failed: ${error.message}`);
    }
  }

  async query(sql: string, params?: any[]): Promise<any[]> {
    if (!this.db) {
      throw new Error('Database not connected');
    }
    
    try {
      const [rows] = await this.db.execute(sql, params);
      return rows;
    } catch (error: any) {
      throw new Error(`MySQL query failed: ${error.message}`);
    }
  }

  async createTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS ${this.getMigrationsTableName()} (
        version VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `;
    await this.execute(sql);
  }
}