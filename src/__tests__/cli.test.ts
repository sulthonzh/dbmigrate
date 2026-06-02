import { program } from '../cli';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

// Mock the CLI program for testing
jest.mock('commander');
jest.mock('readline');

describe('CLI', () => {
  const testDir = path.join(__dirname, 'temp');
  const configPath = path.join(testDir, '.dbmigrate.json');

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Reset mock calls
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should initialize config', () => {
    // Mock fs.writeFileSync
    const mockWriteFileSync = jest.spyOn(fs, 'writeFileSync');
    mockWriteFileSync.mockImplementation(() => {});

    // Mock ConsoleLogger
    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    };

    // Test init command
    const programMock = {
      name: jest.fn().mockReturnThis(),
      description: jest.fn().mockReturnThis(),
      version: jest.fn().mockReturnThis(),
      command: jest.fn().mockReturnThis(),
      option: jest.fn().mockReturnThis(),
      action: jest.fn().mockImplementation(async (options) => {
        // Mock the config creation
        const config = {
          driver: options.driver,
          database: options.database || `./data.db`,
          migrationsDir: options.migrationsDir,
          tableName: options.tableName || 'schema_migrations',
          transaction: options.transaction !== false,
        };

        mockLogger.log(`✓ Migration project initialized with driver: ${config.driver}`);
        mockLogger.log(`✓ Database: ${config.database}`);
        mockLogger.log(`✓ Migrations directory: ${config.migrationsDir}`);
        mockLogger.log(`✓ Transactions: ${config.transaction ? 'enabled' : 'disabled'}`);
      }),
      parse: jest.fn(),
    };

    // Test that the command is set up correctly
    expect(programMock.command).toHaveBeenCalledWith('init');
    expect(programMock.option).toHaveBeenCalledWith(
      expect.stringContaining('--driver'),
      expect.any(String),
      expect.any(String)
    );
    expect(programMock.option).toHaveBeenCalledWith(
      expect.stringContaining('--database'),
      expect.any(String),
      expect.any(Function)
    );
  });

  test('should create migration file', () => {
    // Mock file operations
    const mockWriteFileSync = jest.spyOn(fs, 'writeFileSync');
    mockWriteFileSync.mockImplementation(() => {});

    // Mock ConsoleLogger
    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    };

    // Mock fs.existsSync
    const mockExistsSync = jest.spyOn(fs, 'existsSync');
    mockExistsSync.mockReturnValue(false);

    // Mock fs.mkdirSync
    const mockMkdirSync = jest.spyOn(fs, 'mkdirSync');
    mockMkdirSync.mockImplementation(() => {});

    // Test create command
    const programMock = {
      name: jest.fn().mockReturnThis(),
      description: jest.fn().mockReturnThis(),
      version: jest.fn().mockReturnThis(),
      command: jest.fn().mockReturnThis(),
      argument: jest.fn().mockReturnThis(),
      option: jest.fn().mockReturnThis(),
      action: jest.fn().mockImplementation(async (description, options) => {
        // Mock config reading
        const config = {
          driver: 'sqlite',
          database: './data.db',
          migrationsDir: './migrations',
          tableName: 'schema_migrations',
          transaction: true,
        };

        if (options.dir) {
          config.migrationsDir = options.dir;
        }

        // Create migration file
        const timestamp = Date.now();
        const version = timestamp.toString().padStart(14, '0');
        const filename = `${version}_${description}.sql`;
        const filepath = path.join(config.migrationsDir, filename);

        // Create migrations directory if it doesn't exist
        if (!fs.existsSync(config.migrationsDir)) {
          fs.mkdirSync(config.migrationsDir, { recursive: true });
        }

        // Create migration template
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
        
        mockLogger.log(`✓ Created migration: ${filepath}`);
      }),
      parse: jest.fn(),
    };

    // Test that the command is set up correctly
    expect(programMock.command).toHaveBeenCalledWith('create');
    expect(programMock.argument).toHaveBeenCalledWith('<description>', 'Migration description');
    expect(programMock.option).toHaveBeenCalledWith(
      expect.stringContaining('--dir'),
      expect.any(String)
    );
  });

  test('should handle dry run', () => {
    // Mock ConsoleLogger
    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    };

    // Test migrate command with dry run
    const programMock = {
      name: jest.fn().mockReturnThis(),
      description: jest.fn().mockReturnThis(),
      version: jest.fn().mockReturnThis(),
      command: jest.fn().mockReturnThis(),
      option: jest.fn().mockReturnThis(),
      action: jest.fn().mockImplementation(async (options) => {
        if (options.dryRun) {
          mockLogger.log('=== DRY RUN ===');
          mockLogger.log('Pending migrations:');
          mockLogger.log('  - 20240602120000_test_migration');
          return;
        }
      }),
      parse: jest.fn(),
    };

    // Test that the command is set up correctly
    expect(programMock.command).toHaveBeenCalledWith('migrate');
    expect(programMock.option).toHaveBeenCalledWith(
      expect.stringContaining('--dry-run'),
      expect.any(String)
    );
  });

  test('should handle JSON output', () => {
    // Mock ConsoleLogger
    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    };

    // Test status command with JSON
    const programMock = {
      name: jest.fn().mockReturnThis(),
      description: jest.fn().mockReturnThis(),
      version: jest.fn().mockReturnThis(),
      command: jest.fn().mockReturnThis(),
      option: jest.fn().mockReturnThis(),
      action: jest.fn().mockImplementation(async (options) => {
        if (options.json) {
          console.log(JSON.stringify({
            applied: [
              {
                timestamp: 1717238400000,
                name: 'initial_setup',
                version: '17172384000000',
                appliedAt: new Date('2024-06-02T00:00:00.000Z')
              }
            ],
            pending: []
          }, null, 2));
          return;
        }
      }),
      parse: jest.fn(),
    };

    // Test that the command is set up correctly
    expect(programMock.command).toHaveBeenCalledWith('status');
    expect(programMock.option).toHaveBeenCalledWith(
      expect.stringContaining('--json'),
      expect.any(String)
    );
  });

  test('should handle rollback confirmation', async () => {
    // Mock ConsoleLogger
    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    };

    // Mock readline for prompt
    const mockReadline = {
      createInterface: jest.fn().mockReturnValue({
        question: jest.fn().mockImplementation((question, callback) => {
          callback('y'); // Simulate user confirming
        }),
        close: jest.fn()
      })
    };

    // Test rollback command
    const programMock = {
      name: jest.fn().mockReturnThis(),
      description: jest.fn().mockReturnThis(),
      version: jest.fn().mockReturnThis(),
      command: jest.fn().mockReturnThis(),
      option: jest.fn().mockReturnThis(),
      action: jest.fn().mockImplementation(async (options) => {
        if (!options.force) {
          const readline = require('readline');
          const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
          });

          const answer = await new Promise((resolve) => {
            rl.question('Rollback these migrations? (y/N): ', (answer: string) => {
              rl.close();
              resolve(answer.trim());
            });
          });

          if (answer.toLowerCase() !== 'y') {
            mockLogger.log('Cancelled');
            return;
          }
        }

        mockLogger.log('✓ Rolled back migration');
      }),
      parse: jest.fn(),
    };

    // Test that the command is set up correctly
    expect(programMock.command).toHaveBeenCalledWith('rollback');
    expect(programMock.option).toHaveBeenCalledWith(
      expect.stringContaining('--force'),
      expect.any(String)
    );
  });
});