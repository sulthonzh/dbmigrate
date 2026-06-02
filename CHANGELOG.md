# Changelog

All notable changes to dbmigrate will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-02

### Added
- Initial release of dbmigrate - Zero-dependency database migration tool
- Support for SQLite, PostgreSQL, and MySQL databases
- Command-line interface with the following commands:
  - `init` - Initialize a new migration project
  - `create` - Create new migration files
  - `migrate` - Run pending migrations
  - `rollback` - Rollback migrations
  - `status` - Show migration status
  - `next` - Show the next migration to apply
  - `reset` - Reset migration tracking (dangerous!)
- Transaction support for atomic migrations
- Dry-run mode for previewing migrations
- JSON output for machine-readable status
- Comprehensive test suite
- Examples for SQLite and PostgreSQL blog databases
- Zero dependencies - only requires Node.js >= 18.0.0
- TypeScript support with full type definitions
- ESLint and Jest configuration
- Detailed README with examples and documentation

### Features
- Multi-database support: SQLite, PostgreSQL, MySQL
- Migration file naming: `TIMESTAMP_description.sql`
- Up/down migration support
- Transaction safety (configurable)
- Rollback capability
- Hot-reload new migrations
- Environment variable support in config
- Comprehensive CLI with helpful error messages
- Examples and documentation
- TypeScript for type safety
- Zero external dependencies
- Extensible driver architecture

### Configuration Options
- Database driver selection
- Database connection string/file path
- Migration directory configuration
- Custom migration table name
- Transaction enable/disable
- Environment variable interpolation

### CLI Commands
- `init` - Set up a new migration project
- `create <description>` - Generate migration files
- `migrate [--dry-run] [--force] [--verbose]` - Apply migrations
- `rollback [--to <timestamp>] [--steps <number>] [--force]` - Rollback changes
- `status [--json] [--pending-only]` - View migration status
- `next` - Show next pending migration
- `reset [--force]` - Reset migration tracking

### Migration File Format
```
TIMESTAMP_description.sql
```

Example:
```
-- Up migration
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Down migration
DROP TABLE users;
```

### Database Support
- **SQLite**: File-based or in-memory databases
- **PostgreSQL**: Full PostgreSQL support with proper connection handling
- **MySQL**: MySQL support with connection pooling

### Development Setup
- Node.js >= 18.0.0
- TypeScript for compilation
- Jest for testing
- ESLint for code quality
- Example projects for SQLite and PostgreSQL

### Documentation
- Comprehensive README with examples
- API documentation for programmatic usage
- Migration file format documentation
- Configuration options explained
- Troubleshooting guide

### Testing
- Unit tests for core functionality
- Integration tests for CLI commands
- Test utilities for development
- Coverage reporting
- Mock database drivers for testing

### Examples
- Blog database with SQLite
- Blog database with PostgreSQL
- Migration file examples
- Configuration examples

### Security
- SQL injection protection through parameterized queries
- Transaction safety to prevent partial migrations
- Rollback support for safe changes
- Error handling and validation

### Performance
- Zero external dependencies
- Efficient file system operations
- Batch migration processing
- Transaction batching when possible
- Optimized database operations

### Future Enhancements
- [ ] Support for more database drivers
- [ ] Migration conflict resolution
- [` ] Batch migration operations
- [ ] Migration dependency management
- [` ] Seeding support
- [ ] Better CLI output formatting
- [ ] Interactive mode
- [ ] Database connection pooling
- [` ] Migration encryption
- [ ] Performance monitoring
- [ ] Plugin system for custom drivers

[1.0.0]: https://github.com/sulthonzh/dbmigrate/releases/tag/v1.0.0