const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Get database path from environment variables or use default
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../storage/database.sqlite');

// Ensure storage directory exists
const storageDir = path.dirname(dbPath);
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    throw err;
  }
  console.log('Connected to SQLite database at', dbPath);
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Initialize database tables
async function setupDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create ARTICLE table
      db.run(`
        CREATE TABLE IF NOT EXISTS ARTICLE (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          content TEXT,
          summary TEXT,
          source TEXT,
          url TEXT,
          section_id TEXT NOT NULL,
          publication_date TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) return reject(err);
      });

      // Create IMAGE table
      db.run(`
        CREATE TABLE IF NOT EXISTS IMAGE (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          filename TEXT NOT NULL,
          original_url TEXT,
          title TEXT,
          description TEXT,
          article_id INTEGER,
          section_id TEXT NOT NULL,
          publication_date TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (article_id) REFERENCES ARTICLE(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) return reject(err);
      });

      // Create USER table
      db.run(`
        CREATE TABLE IF NOT EXISTS USER (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          email TEXT UNIQUE,
          role TEXT NOT NULL DEFAULT 'editor',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) return reject(err);
      });

      // Create AUDIT_LOG table
      db.run(`
        CREATE TABLE IF NOT EXISTS AUDIT_LOG (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          action TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id INTEGER,
          details TEXT,
          timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES USER(id) ON DELETE SET NULL
        )
      `, (err) => {
        if (err) return reject(err);
      });

      // Create EXTERNAL_SOURCES table
      db.run(`
        CREATE TABLE IF NOT EXISTS EXTERNAL_SOURCES (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          base_url TEXT NOT NULL,
          rss_url TEXT,
          logo_url TEXT,
          api_key TEXT,
          is_active INTEGER DEFAULT 1,
          fetch_frequency INTEGER DEFAULT 60,
          last_fetch TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) return reject(err);
      });

      // Create SETTINGS table
      db.run(`
        CREATE TABLE IF NOT EXISTS SETTINGS (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          description TEXT,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) return reject(err);
      });

      // Insert default settings if they don't exist
      db.run(`
        INSERT OR IGNORE INTO SETTINGS (key, value, description)
        VALUES ('pdf_url', 'https://www.cjf.gob.mx/SinInformativa/resumenInformativo.pdf', 'URL of the daily PDF report')
      `, (err) => {
        if (err) return reject(err);
      });

      db.run(`
        INSERT OR IGNORE INTO SETTINGS (key, value, description)
        VALUES ('extraction_time', '08:00', 'Daily time to extract content from PDF')
      `, (err) => {
        if (err) return reject(err);
      });

      // Create indexes for better performance
      db.run(`CREATE INDEX IF NOT EXISTS idx_article_section ON ARTICLE(section_id)`, (err) => {
        if (err) return reject(err);
      });

      db.run(`CREATE INDEX IF NOT EXISTS idx_article_date ON ARTICLE(publication_date)`, (err) => {
        if (err) return reject(err);
      });

      db.run(`CREATE INDEX IF NOT EXISTS idx_image_section ON IMAGE(section_id)`, (err) => {
        if (err) return reject(err);
      });

      db.run(`CREATE INDEX IF NOT EXISTS idx_image_date ON IMAGE(publication_date)`, (err) => {
        if (err) return reject(err);
      });

      // Add columns to existing ARTICLE table if they don't exist
      db.run(`ALTER TABLE ARTICLE ADD COLUMN url TEXT`, (err) => {
        // Ignore error if column already exists
        if (err && !err.message.includes('duplicate column name')) {
          return reject(err);
        }
      });

      db.run(`ALTER TABLE ARTICLE ADD COLUMN source_url TEXT`, (err) => {
        // Ignore error if column already exists
        if (err && !err.message.includes('duplicate column name')) {
          return reject(err);
        }
      });

      db.run(`ALTER TABLE ARTICLE ADD COLUMN image_url TEXT`, (err) => {
        // Ignore error if column already exists
        if (err && !err.message.includes('duplicate column name')) {
          return reject(err);
        }
      });

      db.run(`ALTER TABLE ARTICLE ADD COLUMN external_source_id INTEGER`, (err) => {
        // Ignore error if column already exists
        if (err && !err.message.includes('duplicate column name')) {
          return reject(err);
        }
      });

      resolve();
    });
  });
}

// Helper function to run a query and return a promise
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        console.error('Database query error:', err.message);
        return reject(err);
      }
      resolve(rows);
    });
  });
}

// Helper function to run a single-result query
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        console.error('Database get error:', err.message);
        return reject(err);
      }
      resolve(row);
    });
  });
}

// Helper function to run an insert/update/delete query
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        console.error('Database run error:', err.message);
        return reject(err);
      }
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

module.exports = {
  db,
  setupDatabase,
  query,
  get,
  run
};