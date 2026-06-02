import { readConfig, writeConfig, createMigrationFile, loadMigrations, formatTimestamp, formatDuration } from '../utils';
import fs from 'fs';
import path from 'path';

describe('Utils', () => {
  const testDir = path.join(__dirname, 'temp');
  const migrationsDir = path.join(testDir, 'migrations');
  const configPath = path.join(testDir, '.dbmigrate.json');

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should read config file', () => {
    const config = {
      driver: 'sqlite',
      database: './data.db',
      migrationsDir: './migrations',
      tableName: 'schema_migrations',
      transaction: true,
    };

    writeConfig(config, configPath);

    const loadedConfig = readConfig(configPath);
    expect(loadedConfig).toEqual(config);
  });

  test('should provide defaults for optional config fields', () => {
    const config = {
      driver: 'sqlite',
      database: './data.db',
      migrationsDir: './migrations',
    };

    writeConfig(config, configPath);

    const loadedConfig = readConfig(configPath);
    expect(loadedConfig.tableName).toBe('schema_migrations');
    expect(loadedConfig.transaction).toBe(true);
  });

  test('should throw error for missing required fields', () => {
    const invalidConfig = {
      driver: 'sqlite',
      database: './data.db',
      // Missing migrationsDir
    };

    writeConfig(invalidConfig, configPath);

    expect(() => {
      readConfig(configPath);
    }).toThrow('Missing required field: migrationsDir');
  });

  test('should throw error for invalid driver', () => {
    const invalidConfig = {
      driver: 'invalid',
      database: './data.db',
      migrationsDir: './migrations',
    };

    writeConfig(invalidConfig, configPath);

    expect(() => {
      readConfig(configPath);
    }).toThrow('Invalid driver: invalid. Must be one of: sqlite, postgresql, mysql');
  });

  test('should write config file', () => {
    const config = {
      driver: 'postgresql',
      database: 'postgres://user:pass@localhost:5432/mydb',
      migrationsDir: './migrations',
      tableName: 'schema_migrations',
      transaction: false,
    };

    writeConfig(config, configPath);

    expect(fs.existsSync(configPath)).toBe(true);
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('"driver": "postgresql"');
    expect(content).toContain('"database": "postgres://user:pass@localhost:5432/mydb"');
    expect(content).toContain('"transaction": false');
  });

  test('should create migration file', () => {
    const config = {
      driver: 'sqlite',
      database: './data.db',
      migrationsDir: migrationsDir,
      tableName: 'schema_migrations',
      transaction: true,
    };

    const filepath = createMigrationFile(config, 'test_migration');

    expect(filepath).toContain('20240602');
    expect(filepath).toContain('test_migration.sql');
    expect(fs.existsSync(filepath)).toBe(true);

    const content = fs.readFileSync(filepath, 'utf-8');
    expect(content).toContain('-- Up migration');
    expect(content).toContain('-- test_migration');
    expect(content).toContain('-- Down migration');
    expect(content).toContain('-- Write your migration SQL here');
  });

  test('should create migration directory if it does not exist', () => {
    const config = {
      driver: 'sqlite',
      database: './data.db',
      migrationsDir: path.join(testDir, 'new_migrations'),
      tableName: 'schema_migrations',
      transaction: true,
    };

    // Remove migrations directory to test creation
    if (fs.existsSync(config.migrationsDir)) {
      fs.rmSync(config.migrationsDir, { recursive: true, force: true });
    }

    const filepath = createMigrationFile(config, 'test_migration');

    expect(fs.existsSync(config.migrationsDir)).toBe(true);
    expect(fs.existsSync(filepath)).toBe(true);
  });

  test('should load migrations from directory', () => {
    const migration1 = `
      -- Up migration
      CREATE TABLE users (id INTEGER PRIMARY KEY);
      
      -- Down migration
      DROP TABLE users;
    `;
    const migration2 = `
      -- Up migration
      CREATE TABLE posts (id INTEGER PRIMARY KEY);
    `;
    const migration3 = `
      -- Up migration
      -- Another comment
      CREATE TABLE comments (
        id INTEGER PRIMARY KEY,
        user_id INTEGER,
        post_id INTEGER,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Down migration
      DROP TABLE comments;
    `;
    
    fs.writeFileSync(path.join(migrationsDir, '20240602120000_create_users.sql'), migration1);
    fs.writeFileSync(path.join(migrationsDir, '20240602120001_create_posts.sql'), migration2);
    fs.writeFileSync(path.join(migrationsDir, '20240602120002_add_comments.sql'), migration3);

    const config = {
      driver: 'sqlite',
      database: './data.db',
      migrationsDir: migrationsDir,
      tableName: 'schema_migrations',
      transaction: true,
    };

    const migrations = loadMigrations(config);

    expect(migrations).toHaveLength(3);
    expect(migrations[0].name).toBe('create_users');
    expect(migrations[0].up).toContain('CREATE TABLE users');
    expect(migrations[0].down).toContain('DROP TABLE users');
    expect(migrations[1].name).toBe('create_posts');
    expect(migrations[1].up).toContain('CREATE TABLE posts');
    expect(migrations[1].down).toBeUndefined();
    expect(migrations[2].name).toBe('add_comments');
    expect(migrations[2].up).toContain('CREATE TABLE comments');
    expect(migrations[2].down).toContain('DROP TABLE comments');
  });

  test('should ignore non-migration files', () => {
    const migration1 = `
      -- Up migration
      CREATE TABLE users (id INTEGER PRIMARY KEY);
    `;
    
    fs.writeFileSync(path.join(migrationsDir, '20240602120000_create_users.sql'), migration1);
    fs.writeFileSync(path.join(migrationsDir, 'README.md'), '# Migration files');
    fs.writeFileSync(path.join(migrationsDir, '.gitignore'), '*.log');
    fs.writeFileSync(path.join(migrationsDir, 'backup.txt'), 'backup file');

    const config = {
      driver: 'sqlite',
      database: './data.db',
      migrationsDir: migrationsDir,
      tableName: 'schema_migrations',
      transaction: true,
    };

    const migrations = loadMigrations(config);

    expect(migrations).toHaveLength(1);
    expect(migrations[0].name).toBe('create_users');
  });

  test('should return empty array when migrations directory does not exist', () => {
    const config = {
      driver: 'sqlite',
      database: './data.db',
      migrationsDir: path.join(testDir, 'nonexistent'),
      tableName: 'schema_migrations',
      transaction: true,
    };

    // Remove migrations directory to test non-existence
    if (fs.existsSync(config.migrationsDir)) {
      fs.rmSync(config.migrationsDir, { recursive: true, force: true });
    }

    const migrations = loadMigrations(config);

    expect(migrations).toHaveLength(0);
  });

  test('should sort migrations by timestamp', () => {
    const migration1 = `
      -- Up migration
      CREATE TABLE users (id INTEGER PRIMARY KEY);
    `;
    const migration2 = `
      -- Up migration
      CREATE TABLE posts (id INTEGER PRIMARY KEY);
    `;
    const migration3 = `
      -- Up migration
      CREATE TABLE comments (id INTEGER PRIMARY KEY);
    `;
    
    // Out of order timestamps to test sorting
    fs.writeFileSync(path.join(migrationsDir, '20240602120002_create_users.sql'), migration1);
    fs.writeFileSync(path.join(migrationsDir, '20240602120000_create_posts.sql'), migration2);
    fs.writeFileSync(path.join(migrationsDir, '20240602120001_create_comments.sql'), migration3);

    const config = {
      driver: 'sqlite',
      database: './data.db',
      migrationsDir: migrationsDir,
      tableName: 'schema_migrations',
      transaction: true,
    };

    const migrations = loadMigrations(config);

    expect(migrations).toHaveLength(3);
    expect(migrations[0].name).toBe('create_posts'); // 20240602120000
    expect(migrations[1].name).toBe('create_comments'); // 20240602120001
    expect(migrations[2].name).toBe('create_users'); // 20240602120002
  });

  test('should format timestamp correctly', () => {
    const timestamp = 1717238400000; // 2024-06-02T00:00:00.000Z
    const formatted = formatTimestamp(timestamp);
    expect(formatted).toBe('17172384000000');
  });

  test('should format duration in milliseconds', () => {
    const formatted = formatDuration(500);
    expect(formatted).toBe('500ms');
  });

  test('should format duration in seconds', () => {
    const formatted = formatDuration(1500);
    expect(formatted).toBe('1.5s');
  });

  test('should format duration in minutes and seconds', () => {
    const formatted = formatDuration(65000);
    expect(formatted).toBe('1m 5s');
  });

  test('should handle empty migrations directory', () => {
    const config = {
      driver: 'sqlite',
      database: './data.db',
      migrationsDir: migrationsDir,
      tableName: 'schema_migrations',
      transaction: true,
    };

    // Ensure migrations directory exists but is empty
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }

    const migrations = loadMigrations(config);

    expect(migrations).toHaveLength(0);
  });

  test('should handle malformed migration files', () => {
    const badMigration = `
      -- This is not a valid migration file
      -- It doesn't follow the expected naming pattern
      CREATE TABLE test (id INTEGER PRIMARY KEY);
    `;
    
    fs.writeFileSync(path.join(migrationsDir, 'bad_migration.sql'), badMigration);
    fs.writeFileSync(path.join(migrationsDir, '20240602120000_valid.sql'), 'CREATE TABLE valid (id INTEGER PRIMARY KEY);');

    const config = {
      driver: 'sqlite',
      database: './data.db',
      migrationsDir: migrationsDir,
      tableName: 'schema_migrations',
      transaction: true,
    };

    const migrations = loadMigrations(config);

    expect(migrations).toHaveLength(1);
    expect(migrations[0].name).toBe('valid');
  });

  test('should handle migration files with no down section', () => {
    const migration = `
      -- Up migration
      CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL);
    `;
    
    fs.writeFileSync(path.join(migrationsDir, '20240602120000_create_users.sql'), migration);

    const config = {
      driver: 'sqlite',
      database: './data.db',
      migrationsDir: migrationsDir,
      tableName: 'schema_migrations',
      transaction: true,
    };

    const migrations = loadMigrations(config);

    expect(migrations).toHaveLength(1);
    expect(migrations[0].name).toBe('create_users');
    expect(migrations[0].up).toContain('CREATE TABLE users');
    expect(migrations[0].down).toBeUndefined();
  });
});