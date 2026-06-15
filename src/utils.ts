import fs from 'fs';
import path from 'path';
import { Config, Migration } from './types';

export function readConfig(configPath: string = './.dbmigrate.json'): Config {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(content);

    const required = ['driver', 'database', 'migrationsDir'];
    for (const field of required) {
      if (!config[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    const validDrivers = ['sqlite', 'postgresql', 'mysql'];
    if (!validDrivers.includes(config.driver)) {
      throw new Error(`Invalid driver: ${config.driver}. Must be one of: ${validDrivers.join(', ')}`);
    }

    return {
      tableName: config.tableName || 'schema_migrations',
      transaction: config.transaction !== false,
      ...config,
    };
  } catch (error: any) {
    throw new Error(`Failed to read config: ${error.message}`);
  }
}

export function writeConfig(config: Config, configPath: string = './.dbmigrate.json'): void {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error: any) {
    throw new Error(`Failed to write config: ${error.message}`);
  }
}

export function createMigrationFile(config: Config, description: string): string {
  const timestamp = Date.now();
  const version = timestamp.toString().padStart(14, '0');
  const filename = `${version}_${description}.sql`;
  const filepath = path.join(config.migrationsDir, filename);

  if (!fs.existsSync(config.migrationsDir)) {
    fs.mkdirSync(config.migrationsDir, { recursive: true });
  }

  const template = `-- Up migration
-- ${description}

-- Write your migration SQL here
-- Example:
-- CREATE TABLE example (
--   id INTEGER PRIMARY KEY,
--   name TEXT NOT NULL,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- Down migration (optional)
-- ${description} rollback

-- Write your rollback SQL here
-- Example:
-- DROP TABLE example;
`;

  fs.writeFileSync(filepath, template);
  return filepath;
}

export function loadMigrations(config: Config): Migration[] {
  if (!fs.existsSync(config.migrationsDir)) {
    return [];
  }

  const files = fs.readdirSync(config.migrationsDir);
  const migrations: Migration[] = [];

  for (const file of files) {
    if (file.endsWith('.sql')) {
      const match = file.match(/^(\d{14})_(.+)\.sql$/);
      if (match) {
        const timestamp = parseInt(match[1]);
        const name = match[2];
        const filepath = path.join(config.migrationsDir, file);

        const content = fs.readFileSync(filepath, 'utf-8');
        const sections = content.split(/^-- (Down migration|Up migration)\b/m);

        let up = '';
        let down = '';

        if (sections.length >= 3) {
          up = sections[sections.length - 1].trim();
          if (sections.length >= 5) {
            down = sections[1].trim();
          }
        } else {
          up = content.trim();
        }

        migrations.push({
          timestamp,
          name,
          path: filepath,
          version: timestamp.toString().padStart(14, '0'),
          up,
          down,
        });
      }
    }
  }

  return migrations.sort((a, b) => a.timestamp - b.timestamp);
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString().replace(/[:.]/g, '-');
}

export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}