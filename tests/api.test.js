/**
 * API Tests
 * 
 * Tests for the API endpoints to ensure proper functionality.
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Use a temporary test database
const TEST_DB_PATH = path.join(os.tmpdir(), 'cjf_noticias_api_test.sqlite');

// Mock the environment variable for the database path
process.env.DATABASE_PATH = TEST_DB_PATH;
process.env.PORT = 3001; // Use a different port for testing

// Import the database module
const { setupDatabase, run } = require('../server/database');

// Import the app after setting environment variables
const app = require('../server/index');

// Clean up before tests
beforeAll(async () => {
  // Remove test database if it exists
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  
  // Initialize the database
  await setupDatabase();
  
  // Insert test data
  await insertTestData();
});

// Clean up after tests
afterAll(() => {
  // Remove test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

// Insert test data for API tests
async function insertTestData() {
  const today = new Date().toISOString().split('T')[0];
  
  // Insert test articles
  await run(
    `INSERT INTO ARTICLE (title, content, summary, source, section_id, publication_date) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      'Test Article 1',
      'This is the content of test article 1',
      'Summary of test article 1',
      'Test Source',
      'ocho-columnas',
      today
    ]
  );
  
  await run(
    `INSERT INTO ARTICLE (title, content, summary, source, section_id, publication_date) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      'Test Article 2',
      'This is the content of test article 2',
      'Summary of test article 2',
      'Test Source',
      'suprema-corte',
      today
    ]
  );
  
  // Insert test images
  await run(
    `INSERT INTO IMAGE (filename, title, description, section_id, publication_date) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      'test-image-1.jpg',
      'Test Image 1',
      'Description of test image 1',
      'primeras-planas',
      today
    ]
  );
}

describe('API Endpoints', () => {
  test('GET /api - should return API info', async () => {
    const response = await request(app).get('/api');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('name');
    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('endpoints');
  });
  
  test('GET /api/latest - should return latest news', async () => {
    const response = await request(app).get('/api/latest');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('date');
    expect(response.body).toHaveProperty('sections');
    expect(Array.isArray(response.body.sections)).toBe(true);
  });
  
  test('GET /api/articles/:id - should return article by ID', async () => {
    // First, get an article ID
    const articlesResponse = await request(app).get('/api/sections/ocho-columnas');
    const articleId = articlesResponse.body.articles[0].id;
    
    const response = await request(app).get(`/api/articles/${articleId}`);
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', articleId);
    expect(response.body).toHaveProperty('title');
    expect(response.body).toHaveProperty('content');
    expect(response.body).toHaveProperty('section_id');
  });
  
  test('GET /api/sections - should return all sections', async () => {
    const response = await request(app).get('/api/sections');
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(9); // 9 sections
    expect(response.body[0]).toHaveProperty('id');
    expect(response.body[0]).toHaveProperty('name');
  });
  
  test('GET /api/sections/:sectionId - should return section content', async () => {
    const response = await request(app).get('/api/sections/ocho-columnas');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('section', 'ocho-columnas');
    expect(response.body).toHaveProperty('date');
    expect(response.body).toHaveProperty('articles');
    expect(Array.isArray(response.body.articles)).toBe(true);
  });
  
  test('GET /api/sections/:sectionId/preview - should return section preview', async () => {
    const response = await request(app).get('/api/sections/ocho-columnas/preview');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('section', 'ocho-columnas');
    expect(response.body).toHaveProperty('date');
    expect(response.body).toHaveProperty('items');
    expect(Array.isArray(response.body.items)).toBe(true);
  });
  
  test('GET /api/archive/dates - should return available dates', async () => {
    const response = await request(app).get('/api/archive/dates');
    
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
  });
  
  test('GET /api/search - should search articles', async () => {
    const response = await request(app).get('/api/search?q=test');
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('query', 'test');
    expect(response.body).toHaveProperty('results');
    expect(Array.isArray(response.body.results)).toBe(true);
    expect(response.body.results.length).toBeGreaterThan(0);
  });
  
  test('GET /api/search with invalid parameters - should return 400', async () => {
    const response = await request(app).get('/api/search');
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
  
  test('GET /api/nonexistent - should return 404', async () => {
    const response = await request(app).get('/api/nonexistent');
    
    expect(response.status).toBe(404);
  });
});