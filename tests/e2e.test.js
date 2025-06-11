/**
 * End-to-End Tests
 * 
 * Tests for critical user journeys through the application.
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { setupDatabase, run, query } = require('../server/database');
const { downloadPDF, extractContent } = require('../server/src/services/pdf/pdfExtractor');
const { processContent } = require('../server/src/services/content/contentProcessor');

// Use a temporary test database
const TEST_DB_PATH = path.join(os.tmpdir(), 'cjf_noticias_e2e_test.sqlite');

// Mock the environment variable for the database path
process.env.DATABASE_PATH = TEST_DB_PATH;
process.env.PORT = 3002; // Use a different port for testing

// Mock external dependencies
jest.mock('../server/src/services/pdf/pdfExtractor', () => ({
  downloadPDF: jest.fn(),
  extractContent: jest.fn()
}));

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

// Insert test data for E2E tests
async function insertTestData() {
  const today = new Date().toISOString().split('T')[0];
  
  // Insert test sections
  const sections = [
    { id: 'ocho-columnas', name: 'Ocho Columnas' },
    { id: 'primeras-planas', name: 'Primeras Planas' },
    { id: 'columnas-politicas', name: 'Columnas Políticas' },
    { id: 'informacion-general', name: 'Información General' },
    { id: 'cartones', name: 'Cartones' },
    { id: 'suprema-corte', name: 'Suprema Corte de Justicia de la Nación' },
    { id: 'tribunal-electoral', name: 'Tribunal Electoral del Poder Judicial de la Federación' },
    { id: 'dof', name: 'DOF' },
    { id: 'consejo-judicatura', name: 'Consejo de la Judicatura Federal' }
  ];
  
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
  
  // Insert test user
  await run(
    `INSERT INTO USER (username, password, name, role, email) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      'testadmin',
      '$2a$10$XQCbABMqLEXHDJ/s4HRqGOQbZJp0gxS4MJDcJlE/nNsZstkgJlx3O', // hashed 'password123'
      'Test Admin',
      'admin',
      'admin@test.com'
    ]
  );
}

describe('End-to-End Tests', () => {
  describe('PDF Extraction to Database Storage Journey', () => {
    test('extracts PDF content and stores it in the database', async () => {
      // Mock the PDF download and extraction
      const mockPdfPath = path.join(os.tmpdir(), 'test.pdf');
      downloadPDF.mockResolvedValue(mockPdfPath);
      
      // Mock the extracted content
      const mockContent = {
        date: new Date().toISOString().split('T')[0],
        sections: {
          'ocho-columnas': [
            {
              title: 'E2E Test Article',
              content: 'This is an article created during E2E testing',
              source: 'E2E Test'
            }
          ]
        }
      };
      extractContent.mockResolvedValue(mockContent);
      
      // Simulate the PDF extraction process
      const pdfPath = await downloadPDF();
      const content = await extractContent(pdfPath);
      await processContent(content);
      
      // Verify that the article was stored in the database
      const articles = await query(
        `SELECT * FROM ARTICLE WHERE title = ?`,
        ['E2E Test Article']
      );
      
      // This will fail if the article wasn't stored
      expect(articles.length).toBeGreaterThan(0);
      expect(articles[0].title).toBe('E2E Test Article');
      expect(articles[0].content).toBe('This is an article created during E2E testing');
      expect(articles[0].source).toBe('E2E Test');
    });
  });
  
  describe('User Authentication Journey', () => {
    test('allows user to login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({
          username: 'testadmin',
          password: 'password123'
        });
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.username).toBe('testadmin');
    });
    
    test('rejects login with invalid credentials', async () => {
      const response = await request(app)
        .post('/api/admin/login')
        .send({
          username: 'testadmin',
          password: 'wrongpassword'
        });
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
    
    test('protects admin routes with authentication', async () => {
      // Try to access a protected route without authentication
      const response = await request(app)
        .get('/api/admin/users');
      
      expect(response.status).toBe(401);
      
      // Login to get a token
      const loginResponse = await request(app)
        .post('/api/admin/login')
        .send({
          username: 'testadmin',
          password: 'password123'
        });
      
      const token = loginResponse.body.token;
      
      // Try again with the token
      const authenticatedResponse = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${token}`);
      
      expect(authenticatedResponse.status).toBe(200);
    });
  });
  
  describe('Content Retrieval and Display Journey', () => {
    test('retrieves latest news', async () => {
      const response = await request(app)
        .get('/api/latest');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('date');
      expect(response.body).toHaveProperty('sections');
      expect(Array.isArray(response.body.sections)).toBe(true);
    });
    
    test('retrieves article by ID', async () => {
      // First, get an article ID
      const articlesResponse = await request(app)
        .get('/api/sections/ocho-columnas');
      
      const articleId = articlesResponse.body.articles[0].id;
      
      // Get the article by ID
      const response = await request(app)
        .get(`/api/articles/${articleId}`);
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', articleId);
      expect(response.body).toHaveProperty('title');
      expect(response.body).toHaveProperty('content');
    });
    
    test('searches for articles', async () => {
      const response = await request(app)
        .get('/api/search?q=test');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('query', 'test');
      expect(response.body).toHaveProperty('results');
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results.length).toBeGreaterThan(0);
    });
    
    test('retrieves section content', async () => {
      const response = await request(app)
        .get('/api/sections/ocho-columnas');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('section', 'ocho-columnas');
      expect(response.body).toHaveProperty('articles');
      expect(Array.isArray(response.body.articles)).toBe(true);
      expect(response.body.articles.length).toBeGreaterThan(0);
    });
  });
});