/**
 * Database Migration Script
 * 
 * This script handles database schema migrations for the CJF Noticias application.
 * It tracks migrations in a MIGRATION table and applies new migrations as needed.
 * 
 * Usage:
 *   - To run all pending migrations: node scripts/db-migrate.js
 *   - To create a new migration: node scripts/db-migrate.js create <migration-name>
 */

const fs = require('fs');
const path = require('path');
const { db, run, query, get } = require('../server/database');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Constants
const MIGRATIONS_DIR = path.join(__dirname, '../migrations');
const MIGRATION_TABLE = 'MIGRATION';

// Ensure migrations directory exists
if (!fs.existsSync(MIGRATIONS_DIR)) {
  fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
}

/**
 * Initialize the migrations table if it doesn't exist
 */
async function initMigrationTable() {
  try {
    await run(`
      CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (error) {
    console.error('Error initializing migration table:', error.message);
    process.exit(1);
  }
}

/**
 * Get all applied migrations
 * @returns {Promise<Array>} List of applied migrations
 */
async function getAppliedMigrations() {
  try {
    return await query(`SELECT name FROM ${MIGRATION_TABLE} ORDER BY id`);
  } catch (error) {
    console.error('Error getting applied migrations:', error.message);
    process.exit(1);
  }
}

/**
 * Get all available migration files
 * @returns {Array} List of migration files
 */
function getAvailableMigrations() {
  try {
    return fs.readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.js'))
      .sort(); // Sort to ensure migrations are applied in order
  } catch (error) {
    console.error('Error getting available migrations:', error.message);
    process.exit(1);
  }
}

/**
 * Apply a migration
 * @param {string} migrationFile - Migration file name
 */
async function applyMigration(migrationFile) {
  const migrationPath = path.join(MIGRATIONS_DIR, migrationFile);
  const migration = require(migrationPath);
  
  console.log(`Applying migration: ${migrationFile}`);
  
  try {
    // Start a transaction
    await run('BEGIN TRANSACTION');
    
    // Apply the migration
    if (typeof migration.up === 'function') {
      await migration.up(db, { run, query, get });
    } else {
      throw new Error(`Migration ${migrationFile} does not have an 'up' function`);
    }
    
    // Record the migration
    await run(`INSERT INTO ${MIGRATION_TABLE} (name) VALUES (?)`, [migrationFile]);
    
    // Commit the transaction
    await run('COMMIT');
    
    console.log(`Migration applied successfully: ${migrationFile}`);
  } catch (error) {
    // Rollback on error
    await run('ROLLBACK');
    console.error(`Error applying migration ${migrationFile}:`, error.message);
    process.exit(1);
  }
}

/**
 * Run all pending migrations
 */
async function runMigrations() {
  await initMigrationTable();
  
  const appliedMigrations = await getAppliedMigrations();
  const appliedMigrationNames = appliedMigrations.map(m => m.name);
  const availableMigrations = getAvailableMigrations();
  
  const pendingMigrations = availableMigrations.filter(
    migration => !appliedMigrationNames.includes(migration)
  );
  
  if (pendingMigrations.length === 0) {
    console.log('No pending migrations to apply.');
    return;
  }
  
  console.log(`Found ${pendingMigrations.length} pending migrations.`);
  
  for (const migration of pendingMigrations) {
    await applyMigration(migration);
  }
  
  console.log('All migrations applied successfully.');
}

/**
 * Create a new migration file
 * @param {string} name - Migration name
 */
function createMigration(name) {
  if (!name) {
    console.error('Please provide a name for the migration.');
    process.exit(1);
  }
  
  // Format the migration name
  const timestamp = new Date().toISOString().replace(/[-:.]/g, '').split('T')[0];
  const fileName = `${timestamp}_${name.toLowerCase().replace(/\s+/g, '_')}.js`;
  const filePath = path.join(MIGRATIONS_DIR, fileName);
  
  // Create migration file template
  const template = `/**
 * Migration: ${name}
 * Created at: ${new Date().toISOString()}
 */

/**
 * Apply the migration
 * @param {Object} db - Database connection
 * @param {Object} helpers - Database helper functions
 */
exports.up = async function(db, { run, query, get }) {
  // Write your migration code here
  // Example:
  // await run(\`
  //   ALTER TABLE ARTICLE
  //   ADD COLUMN featured BOOLEAN DEFAULT 0
  // \`);
};

/**
 * Revert the migration
 * @param {Object} db - Database connection
 * @param {Object} helpers - Database helper functions
 */
exports.down = async function(db, { run, query, get }) {
  // Write code to revert the migration here
  // Example:
  // await run(\`
  //   ALTER TABLE ARTICLE
  //   DROP COLUMN featured
  // \`);
};
`;
  
  try {
    fs.writeFileSync(filePath, template);
    console.log(`Migration created: ${fileName}`);
  } catch (error) {
    console.error('Error creating migration file:', error.message);
    process.exit(1);
  }
}

/**
 * List all migrations and their status
 */
async function listMigrations() {
  await initMigrationTable();
  
  const appliedMigrations = await getAppliedMigrations();
  const appliedMigrationNames = appliedMigrations.map(m => m.name);
  const availableMigrations = getAvailableMigrations();
  
  console.log('Migrations:');
  availableMigrations.forEach(migration => {
    const status = appliedMigrationNames.includes(migration) ? 'Applied' : 'Pending';
    console.log(`- ${migration}: ${status}`);
  });
}

// Main execution
const command = process.argv[2];
const arg = process.argv[3];

(async () => {
  try {
    switch (command) {
      case 'create':
        createMigration(arg);
        break;
      case 'list':
        await listMigrations();
        break;
      default:
        await runMigrations();
        break;
    }
  } catch (error) {
    console.error('Unhandled error:', error);
    process.exit(1);
  }
})();