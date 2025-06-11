/**
 * Database Tests
 * 
 * Tests for the database module to ensure proper functionality.
 */

const { setupDatabase, query, get, run } = require('../server/database');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Use a temporary test database
const TEST_DB_PATH = path.join(os.tmpdir(), 'cjf_noticias_test.sqlite');

// Mock the environment variable for the database path
process.env.DATABASE_PATH = TEST_DB_PATH;

// Clean up before tests
beforeAll(async () => {
  // Remove test database if it exists
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  
  // Initialize the database
  await setupDatabase();
});

// Clean up after tests
afterAll(() => {
  // Remove test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

describe('Database Module', () => {
  test('should create tables correctly', async () => {
    // Check if tables exist
    const tables = await query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);
    
    const tableNames = tables.map(t => t.name);
    
    expect(tableNames).toContain('ARTICLE');
    expect(tableNames).toContain('IMAGE');
    expect(tableNames).toContain('USER');
    expect(tableNames).toContain('AUDIT_LOG');
    expect(tableNames).toContain('SETTINGS');
  });
  
  test('should insert and retrieve data correctly', async () => {
    // Insert test article
    const articleData = {
      title: 'Test Article',
      content: 'This is a test article content',
      summary: 'Test summary',
      source: 'Test Source',
      section_id: 'ocho-columnas',
      publication_date: '2023-05-01'
    };
    
    const result = await run(
      `INSERT INTO ARTICLE (title, content, summary, source, section_id, publication_date) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        articleData.title,
        articleData.content,
        articleData.summary,
        articleData.source,
        articleData.section_id,
        articleData.publication_date
      ]
    );
    
    expect(result.lastID).toBeTruthy();
    
    // Retrieve the article
    const article = await get(
      `SELECT * FROM ARTICLE WHERE id = ?`,
      [result.lastID]
    );
    
    expect(article).toBeTruthy();
    expect(article.title).toBe(articleData.title);
    expect(article.content).toBe(articleData.content);
    expect(article.section_id).toBe(articleData.section_id);
    expect(article.publication_date).toBe(articleData.publication_date);
  });
  
  test('should handle transactions correctly', async () => {
    // Test transaction with multiple operations
    const db = require('../server/database').db;
    
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        db.run(
          `INSERT INTO ARTICLE (title, content, section_id, publication_date) 
           VALUES (?, ?, ?, ?)`,
          ['Transaction Test 1', 'Content 1', 'dof', '2023-05-02'],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              return reject(err);
            }
          }
        );
        
        db.run(
          `INSERT INTO ARTICLE (title, content, section_id, publication_date) 
           VALUES (?, ?, ?, ?)`,
          ['Transaction Test 2', 'Content 2', 'dof', '2023-05-02'],
          function(err) {
            if (err) {
              db.run('ROLLBACK');
              return reject(err);
            }
          }
        );
        
        db.run('COMMIT', function(err) {
          if (err) {
            db.run('ROLLBACK');
            return reject(err);
          }
          resolve();
        });
      });
    });
    
    // Verify both articles were inserted
    const articles = await query(
      `SELECT * FROM ARTICLE WHERE title LIKE 'Transaction Test%'`
    );
    
    expect(articles.length).toBe(2);
  });
  
  test('should enforce foreign key constraints', async () => {
    // Insert a test article
    const articleResult = await run(
      `INSERT INTO ARTICLE (title, content, section_id, publication_date) 
       VALUES (?, ?, ?, ?)`,
      ['FK Test Article', 'Content', 'dof', '2023-05-03']
    );
    
    const articleId = articleResult.lastID;
    
    // Insert an image with a valid article_id
    const validImageResult = await run(
      `INSERT INTO IMAGE (filename, article_id, section_id, publication_date) 
       VALUES (?, ?, ?, ?)`,
      ['valid.jpg', articleId, 'dof', '2023-05-03']
    );
    
    expect(validImageResult.lastID).toBeTruthy();
    
    // Try to insert an image with an invalid article_id
    let errorThrown = false;
    try {
      await run(
        `INSERT INTO IMAGE (filename, article_id, section_id, publication_date) 
         VALUES (?, ?, ?, ?)`,
        ['invalid.jpg', 9999, 'dof', '2023-05-03']
      );
    } catch (error) {
      errorThrown = true;
      expect(error.message).toContain('FOREIGN KEY constraint failed');
    }
    
    expect(errorThrown).toBe(true);
  });
});