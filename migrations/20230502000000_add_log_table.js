/**
 * Migration: Add Log Table
 * Created at: 2023-05-02T00:00:00.000Z
 * 
 * This migration adds a LOG table to store application logs in the database.
 * This allows for centralized logging and easier access to logs through the admin interface.
 */

/**
 * Apply the migration
 * @param {Object} db - Database connection
 * @param {Object} helpers - Database helper functions
 */
exports.up = async function(db, { run, query, get }) {
  // Create LOG table
  await run(`
    CREATE TABLE IF NOT EXISTS LOG (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      details TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Create indexes for faster queries
  await run(`
    CREATE INDEX idx_log_level ON LOG(level)
  `);
  
  await run(`
    CREATE INDEX idx_log_created_at ON LOG(created_at)
  `);
  
  // Create a view for recent logs
  await run(`
    CREATE VIEW IF NOT EXISTS RECENT_LOGS AS
    SELECT * FROM LOG
    ORDER BY created_at DESC
    LIMIT 1000
  `);
  
  // Add a trigger to automatically delete old logs (older than 30 days)
  await run(`
    CREATE TRIGGER IF NOT EXISTS delete_old_logs
    AFTER INSERT ON LOG
    BEGIN
      DELETE FROM LOG
      WHERE created_at < datetime('now', '-30 days');
    END
  `);
};

/**
 * Revert the migration
 * @param {Object} db - Database connection
 * @param {Object} helpers - Database helper functions
 */
exports.down = async function(db, { run, query, get }) {
  // Drop the trigger
  await run(`DROP TRIGGER IF EXISTS delete_old_logs`);
  
  // Drop the view
  await run(`DROP VIEW IF EXISTS RECENT_LOGS`);
  
  // Drop the indexes
  await run(`DROP INDEX IF EXISTS idx_log_level`);
  await run(`DROP INDEX IF EXISTS idx_log_created_at`);
  
  // Drop the LOG table
  await run(`DROP TABLE IF EXISTS LOG`);
};