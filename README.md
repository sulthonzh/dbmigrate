# dbmigrate - Zero-Dep Database Migration Tool

A zero-dependency CLI tool for managing database schema migrations across SQLite, PostgreSQL, and MySQL.

## Why You Need This

Most migration tools are either:
- Over-engineered with tons of dependencies
- Database-specific, forcing you to switch tools
- Require complex configuration
- Don't handle rollback cleanly

**dbmigrate** solves this with:
- ✅ Zero dependencies - works anywhere Node.js runs
- ✅ Multi-database support - SQLite, PostgreSQL, MySQL
- ✅ Clean rollback support
- ✅ Simple configuration - just a `.dbmigrate.json` file
- ✅ Transaction safety - all operations are transactional
- ✅ Hot-reload migrations - add new migrations without rebase

## Quick Start

```bash
# Install globally
npm install -g dbmigrate

# Or use npx
npx dbmigrate --help
```

## Usage

### Initialize a migration project
```bash
# Create a new migration project in current directory
dbmigrate init

# Initialize with specific database connection
dbmigrate init --driver sqlite --database ./data.db
```

### Create a new migration
```bash
# Create migration file
dbmigrate create add_users_table

# Creates: migrations/20240602123456_add_users_table.sql
```

### Run migrations
```bash
# Run all pending migrations
dbmigrate migrate

# Rollback last migration
dbmigrate rollback

# Rollback to specific migration
dbmigrate rollback --to 20240602120000_initial_setup

# Dry run - see what would be applied
dbmigrate migrate --dry-run
```

### Check migration status
```bash
# See applied migrations
dbmigrate status

# Show next migration
dbmigrate next
```

## Configuration

Create `.dbmigrate.json` in your project root:

```json
{
  "driver": "sqlite",
  "database": "./data.db",
  "migrationsDir": "./migrations",
  "tableName": "schema_migrations",
  "transaction": true
}
```

### Drivers

- **sqlite**: SQLite database (file or `:memory:`)
- **postgresql**: PostgreSQL connection string
- **mysql**: MySQL connection string

### Configuration Examples

```json
// SQLite
{
  "driver": "sqlite",
  "database": "./myapp.db"
}

// PostgreSQL
{
  "driver": "postgresql",
  "database": "postgres://user:pass@localhost:5432/mydb"
}

// MySQL
{
  "driver": "mysql",
  "database": "mysql://user:pass@localhost:3306/mydb"
}
```

## Migration Files

Migration files follow the pattern: `TIMESTAMP_description.sql`

Example:
```
migrations/
├── 20240602120000_initial_setup.sql
├── 20240602120001_add_users_table.sql
└── 20240602120002_add_indexes.sql
```

### Migration Structure

```sql
-- Up migration
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Down migration (optional)
DROP TABLE users;
```

### Multi-step Migrations

```sql
-- Migrate up
CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) DEFAULT 0
);

CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- Migrate down
DROP TABLE categories;
DROP TABLE products;
```

## Commands

### init
Initialize a new migration project
```bash
dbmigrate init [options]

Options:
  --driver <driver>    Database driver (sqlite|postgresql|mysql)
  --database <url>     Database connection string/file path
  --migrations-dir <dir>  Directory for migration files (default: ./migrations)
  --table <name>       Migration tracking table (default: schema_migrations)
  --no-transaction    Disable transactions
```

### create
Create a new migration file
```bash
dbmigrate create <description> [options]

Options:
  --dir <dir>         Migration directory
  --template <file>   Custom SQL template
```

### migrate
Run pending migrations
```bash
dbmigrate migrate [options]

Options:
  --dry-run           Show what would be applied
  --force            Skip confirmation
  --verbose          Show detailed output
```

### rollback
Rollback migrations
```bash
dbmigrate rollback [options]

Options:
  --to <timestamp>    Rollback to specific migration
  --steps <number>    Rollback N steps (default: 1)
  --force            Skip confirmation
```

### status
Show migration status
```bash
dbmigrate status [options]

Options:
  --json             Output in JSON format
  --pending-only     Show only pending migrations
```

### next
Show the next migration to apply
```bash
dbmigrate next
```

### reset
Reset the migration table (dangerous!)
```bash
dbmigrate reset [options]

Options:
  --force            Skip confirmation
```

## Examples

### Example 1: SQLite Blog App

```bash
# Initialize SQLite database
dbmigrate init --driver sqlite --database ./blog.db

# Create migration for posts table
dbmigrate create add_posts_table

# Edit migration file:
CREATE TABLE posts (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  published BOOLEAN DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

# Create migration for comments table
dbmigrate create add_comments_table

# Edit migration file:
CREATE TABLE comments (
  id INTEGER PRIMARY KEY,
  post_id INTEGER,
  author TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id)
);

# Run migrations
dbmigrate migrate

# Check status
dbmigrate status

# Add a new column
dbmigrate create add_slug_to_posts

-- Edit migration file:
ALTER TABLE posts ADD COLUMN slug TEXT UNIQUE;

-- Down migration:
ALTER TABLE posts DROP COLUMN slug;

# Apply new migration
dbmigrate migrate
```

### Example 2: PostgreSQL API

```bash
# Initialize PostgreSQL
dbmigrate init --driver postgresql --database "postgres://user:pass@localhost:5432/api"

# Create migration for users
dbmigrate create users_schema

-- Migration file:
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);

-- Down migration:
DROP INDEX idx_users_email;
DROP TABLE users;

# Run with transactions (default)
dbmigrate migrate

# Rollback if needed
dbmigrate rollback
```

## Features

### Transaction Safety
All migrations run in transactions by default. If any step fails, the entire migration is rolled back.

```json
{
  "transaction": true
}
```

### Hot Reload
Add new migration files without rebase. dbmigrate automatically detects new migrations.

### Rollback Support
Every migration can have a down operation for clean rollback.

### Environment Variables
Support for environment variables in configuration:

```json
{
  "driver": "${DB_DRIVER:-sqlite}",
  "database": "${DB_URL:-./data.db}"
}
```

### Version Pinning
Pin to a specific schema version:

```bash
# Apply migrations up to version 20240602120000
dbmigrate migrate --to 20240602120000
```

## API Usage

```javascript
import { Migrator } from 'dbmigrate';

// Initialize migrator
const migrator = new Migrator({
  driver: 'sqlite',
  database: './app.db',
  migrationsDir: './migrations'
});

// Run migrations
await migrator.migrate();

// Rollback
await migrator.rollback();

// Get status
const status = await migrator.getStatus();
```

## Error Handling

dbmigrate provides clear error messages:
- **Connection errors**: Database not accessible
- **Migration errors**: SQL syntax issues
- **Conflict errors**: Migration already applied/applied
- **Configuration errors**: Invalid config files

## Development

Built with:
- Node.js (native)
- Zero external dependencies
- TypeScript for type safety
- Comprehensive test suite

## License

MIT - feel free to use in any project.

## Contributing

1. Fork the repo
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## Support

Issues: https://github.com/sulthonzh/dbmigrate/issues