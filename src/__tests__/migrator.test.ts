import { Migrator } from '../migrator';
import { readConfig, writeConfig, loadMigrations, createMigrationFile } from '../utils';
import fs from 'fs';
import path from 'path';

// Mock the database drivers
jest.mock('../drivers/sqlite');
jest.mock('../drivers/postgresql');
jest.mock('../drivers/mysql');

describe('Migrator', () => {
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

    // Create test config
    const config = {
      driver: 'sqlite',
      database: ':memory:',
      migrationsDir,
      tableName: 'schema_migrations',
      transaction: true,
    };
    writeConfig(config, configPath);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should load migrations from directory', () => {
    // Create test migration files
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
    
    fs.writeFileSync(path.join(migrationsDir, '20240602120000_create_users.sql'), migration1);
    fs.writeFileSync(path.join(migrationsDir, '20240602120001_create_posts.sql'), migration2);

    const config = readConfig(configPath);
    const migrations = loadMigrations(config);

    expect(migrations).toHaveLength(2);
    expect(migrations[0].name).toBe('create_users');
    expect(migrations[0].up).toContain('CREATE TABLE users');
    expect(migrations[0].down).toContain('DROP TABLE users');
    expect(migrations[1].name).toBe('create_posts');
    expect(migrations[1].up).toContain('CREATE TABLE posts');
    expect(migrations[1].down).toBeUndefined();
  });

  test('should create migration file', () => {
    const config = readConfig(configPath);
    const filepath = createMigrationFile(config, 'test_migration');

    expect(filepath).toContain('20240602');
    expect(filepath).toContain('test_migration.sql');
    expect(fs.existsSync(filepath)).toBe(true);

    const content = fs.readFileSync(filepath, 'utf-8');
    expect(content).toContain('-- Up migration');
    expect(content).toContain('-- test_migration');
    expect(content).toContain('-- Down migration');
  });

  test('should get empty status when no migrations', async () => {
    const config = readConfig(configPath);
    const migrator = new Migrator(config);

    // Mock database methods
    const mockConnect = jest.fn().mockResolvedValue(undefined);
    const mockDisconnect = jest.fn().mockResolvedValue(undefined);
    const mockGetMigrations = jest.fn().mockResolvedValue([]);

    // @ts-ignore
    migrator.driver.connect = mockConnect;
    // @ts-ignore
    migrator.driver.disconnect = mockDisconnect;
    // @ts-ignore
    migrator.driver.getMigrations = mockGetMigrations;

    await migrator.connect();
    const status = await migrator.getStatus();
    await migrator.disconnect();

    expect(status.applied).toHaveLength(0);
    expect(status.pending).toHaveLength(0);
    expect(mockConnect).toHaveBeenCalled();
    expect(mockDisconnect).toHaveBeenCalled();
    expect(mockGetMigrations).toHaveBeenCalled();
  });

  test('should get migrations when there are files', async () => {
    // Create test migration files
    const migrationContent = `
      -- Up migration
      CREATE TABLE test (id INTEGER PRIMARY KEY);
    `;
    fs.writeFileSync(path.join(migrationsDir, '20240602120000_test.sql'), migrationContent);

    const config = readConfig(configPath);
    const migrator = new Migrator(config);

    // Mock database methods
    const mockConnect = jest.fn().mockResolvedValue(undefined);
    const mockDisconnect = jest.fn().mockResolvedValue(undefined);
    const mockGetMigrations = jest.fn().mockResolvedValue([]);

    // @ts-ignore
    migrator.driver.connect = mockConnect;
    // @ts-ignore
    migrator.driver.disconnect = mockDisconnect;
    // @ts-ignore
    migrator.driver.getMigrations = mockGetMigrations;

    await migrator.connect();
    const status = await migrator.getStatus();
    await migrator.disconnect();

    expect(status.applied).toHaveLength(0);
    expect(status.pending).toHaveLength(1);
    expect(status.pending[0].name).toBe('test');
    expect(mockConnect).toHaveBeenCalled();
    expect(mockDisconnect).toHaveBeenCalled();
    expect(mockGetMigrations).toHaveBeenCalled();
  });

  test('should get next migration', async () => {
    // Create test migration files
    const migrationContent = `
      -- Up migration
      CREATE TABLE test (id INTEGER PRIMARY KEY);
    `;
    fs.writeFileSync(path.join(migrationsDir, '20240602120000_test.sql'), migrationContent);

    const config = readConfig(configPath);
    const migrator = new Migrator(config);

    // Mock database methods
    const mockConnect = jest.fn().mockResolvedValue(undefined);
    const mockDisconnect = jest.fn().mockResolvedValue(undefined);
    const mockGetMigrations = jest.fn().mockResolvedValue([]);

    // @ts-ignore
    migrator.driver.connect = mockConnect;
    // @ts-ignore
    migrator.driver.disconnect = mockDisconnect;
    // @ts-ignore
    migrator.driver.getMigrations = mockGetMigrations;

    await migrator.connect();
    const next = await migrator.getNext();
    await migrator.disconnect();

    expect(next).toBeTruthy();
    expect(next?.name).toBe('test');
    expect(mockConnect).toHaveBeenCalled();
    expect(mockDisconnect).toHaveBeenCalled();
    expect(mockGetMigrations).toHaveBeenCalled();
  });

  test('should return null when no next migration', async () => {
    const config = readConfig(configPath);
    const migrator = new Migrator(config);

    // Mock database methods
    const mockConnect = jest.fn().mockResolvedValue(undefined);
    const mockDisconnect = jest.fn().mockResolvedValue(undefined);
    const mockGetMigrations = jest.fn().mockResolvedValue([]);

    // @ts-ignore
    migrator.driver.connect = mockConnect;
    // @ts-ignore
    migrator.driver.disconnect = mockDisconnect;
    // @ts-ignore
    migrator.driver.getMigrations = mockGetMigrations;

    await migrator.connect();
    const next = await migrator.getNext();
    await migrator.disconnect();

    expect(next).toBeNull();
    expect(mockConnect).toHaveBeenCalled();
    expect(mockDisconnect).toHaveBeenCalled();
    expect(mockGetMigrations).toHaveBeenCalled();
  });

  test('should validate config', () => {
    // Test missing required field
    expect(() => {
      const invalidConfig = { driver: 'sqlite' };
      writeConfig(invalidConfig, configPath);
    }).toThrow('Missing required field: database');
  });

  test('should validate driver', () => {
    expect(() => {
      const invalidConfig = {
        driver: 'invalid',
        database: './test.db',
        migrationsDir: './migrations',
      };
      writeConfig(invalidConfig, configPath);
    }).toThrow('Invalid driver: invalid. Must be one of: sqlite, postgresql, mysql');
  });

  test('should provide defaults for optional fields', () => {
    const config = {
      driver: 'sqlite',
      database: './test.db',
      migrationsDir: './migrations',
    };
    writeConfig(config, configPath);

    const loadedConfig = readConfig(configPath);
    expect(loadedConfig.tableName).toBe('schema_migrations');
    expect(loadedConfig.transaction).toBe(true);
  });
});