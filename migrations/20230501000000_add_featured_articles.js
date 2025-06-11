/**
 * Migration: Add Featured Articles
 * Created at: 2023-05-01T00:00:00.000Z
 * 
 * This migration adds support for featured articles by adding a 'featured' column
 * to the ARTICLE table and creating a new FEATURED_ARTICLE table for the home page.
 */

/**
 * Apply the migration
 * @param {Object} db - Database connection
 * @param {Object} helpers - Database helper functions
 */
exports.up = async function(db, { run, query, get }) {
  // Add featured column to ARTICLE table
  await run(`
    ALTER TABLE ARTICLE
    ADD COLUMN featured BOOLEAN DEFAULT 0
  `);
  
  // Create FEATURED_ARTICLE table for managing featured articles on the home page
  await run(`
    CREATE TABLE IF NOT EXISTS FEATURED_ARTICLE (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (article_id) REFERENCES ARTICLE(id) ON DELETE CASCADE
    )
  `);
  
  // Create index for faster lookups
  await run(`
    CREATE INDEX idx_featured_article_position ON FEATURED_ARTICLE(position)
  `);
  
  // Create index on the featured column in ARTICLE table
  await run(`
    CREATE INDEX idx_article_featured ON ARTICLE(featured)
  `);
};

/**
 * Revert the migration
 * @param {Object} db - Database connection
 * @param {Object} helpers - Database helper functions
 */
exports.down = async function(db, { run, query, get }) {
  // Drop the FEATURED_ARTICLE table
  await run(`DROP TABLE IF EXISTS FEATURED_ARTICLE`);
  
  // Remove the featured column from ARTICLE table
  // Note: SQLite doesn't support DROP COLUMN directly, so we need to:
  // 1. Create a new table without the column
  // 2. Copy data from the old table
  // 3. Drop the old table
  // 4. Rename the new table
  
  // Create a new table without the featured column
  await run(`
    CREATE TABLE ARTICLE_NEW (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      summary TEXT,
      source TEXT,
      section_id TEXT NOT NULL,
      publication_date TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (section_id) REFERENCES SECTION(id)
    )
  `);
  
  // Copy data from the old table to the new table
  await run(`
    INSERT INTO ARTICLE_NEW (id, title, content, summary, source, section_id, publication_date, created_at, updated_at)
    SELECT id, title, content, summary, source, section_id, publication_date, created_at, updated_at
    FROM ARTICLE
  `);
  
  // Drop the old table
  await run(`DROP TABLE ARTICLE`);
  
  // Rename the new table
  await run(`ALTER TABLE ARTICLE_NEW RENAME TO ARTICLE`);
  
  // Recreate any indexes that were on the original table
  await run(`CREATE INDEX idx_article_section_id ON ARTICLE(section_id)`);
  await run(`CREATE INDEX idx_article_publication_date ON ARTICLE(publication_date)`);
};