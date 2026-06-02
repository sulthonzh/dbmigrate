#!/usr/bin/env node

// Example: Blog database with SQLite
// This example shows how to set up a blog database using dbmigrate with SQLite

const path = require('path');
const fs = require('fs');

// Create migrations directory
const migrationsDir = path.join(__dirname, 'migrations');
if (!fs.existsSync(migrationsDir)) {
  fs.mkdirSync(migrationsDir, { recursive: true });
}

// Create configuration file
const config = {
  driver: 'sqlite',
  database: './blog.db',
  migrationsDir: migrationsDir,
  tableName: 'schema_migrations',
  transaction: true,
};

const configPath = path.join(__dirname, '.dbmigrate.json');
const configContent = JSON.stringify(config, null, 2);
fs.writeFileSync(configPath, configContent);

console.log('✅ Configuration created for SQLite blog database');
console.log('');
console.log('Database file:', config.database);
console.log('Migrations directory:', config.migrationsDir);
console.log('');
console.log('Next steps:');
console.log('1. Create migrations:');
console.log('   dbmigrate create create_users_table');
console.log('   dbmigrate create create_posts_table');
console.log('   dbmigrate create create_comments_table');
console.log('   dbmigrate create create_categories_table');
console.log('2. Edit migration files');
console.log('3. Run: dbmigrate migrate');
console.log('');
console.log('Example migration files will be created...');

// Create example migration files
const usersMigration = `
-- Up migration: Create users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);

-- Down migration: Drop users table
DROP INDEX idx_users_username;
DROP INDEX idx_users_email;
DROP TABLE users;
`;

const postsMigration = `
-- Up migration: Create posts table
CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT,
  excerpt TEXT,
  author_id INTEGER,
  category_id INTEGER,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_category ON posts(category_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_published ON posts(published_at);

-- Down migration: Drop posts table
DROP INDEX idx_posts_author;
DROP INDEX idx_posts_category;
DROP INDEX idx_posts_status;
DROP INDEX idx_posts_published;
DROP TABLE posts;
`;

const categoriesMigration = `
-- Up migration: Create categories table
CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_slug ON categories(slug);

-- Down migration: Drop categories table
DROP INDEX idx_categories_slug;
DROP TABLE categories;
`;

const commentsMigration = `
-- Up migration: Create comments table
CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  author_name TEXT,
  author_email TEXT,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_status ON comments(status);

-- Down migration: Drop comments table
DROP INDEX idx_comments_post;
DROP INDEX idx_comments_status;
DROP TABLE comments;
`;

fs.writeFileSync(path.join(migrationsDir, '20240602120000_create_users.sql'), usersMigration);
fs.writeFileSync(path.join(migrationsDir, '20240602120001_create_posts.sql'), postsMigration);
fs.writeFileSync(path.join(migrationsDir, '20240602120002_create_categories.sql'), categoriesMigration);
fs.writeFileSync(path.join(migrationsDir, '20240602120003_create_comments.sql'), commentsMigration);

console.log('✅ Example migration files created:');
console.log('   - 20240602120000_create_users.sql');
console.log('   - 20240602120001_create_posts.sql');
console.log('   - 20240602120002_create_categories.sql');
console.log('   - 20240602120003_create_comments.sql');
console.log('');
console.log('Edit these files and run: dbmigrate migrate');