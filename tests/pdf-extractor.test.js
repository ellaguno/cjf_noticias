/**
 * PDF Extractor Tests
 * 
 * Tests for the PDF extraction functionality.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const { downloadPDF, extractContent, processContent, processArticleSection, processImageSection } = require('../scripts/pdf-extractor');
const pdfExtractor = require('../server/src/services/pdf/pdfExtractor');
const indexExtractor = require('../server/src/services/pdf/indexExtractor');

// Mock axios
jest.mock('axios');

// Mock fs
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  createWriteStream: jest.fn(),
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
  mkdirSync: jest.fn()
}));

// Mock pdf-parse
jest.mock('pdf-parse', () => jest.fn());

// Mock database functions
jest.mock('../server/database', () => ({
  run: jest.fn().mockResolvedValue({ lastID: 1 }),
  get: jest.fn(),
  query: jest.fn()
}));

// Mock server PDF extractor
jest.mock('../server/src/services/pdf/pdfExtractor', () => ({
  downloadPDF: jest.fn(),
  extractContent: jest.fn(),
  extractTextContent: jest.fn(),
  extractImages: jest.fn(),
  getPDFPath: jest.fn(),
  pdfExists: jest.fn(),
  getLatestPDF: jest.fn(),
  indexExtractor: require('../server/src/services/pdf/indexExtractor')
}));

// Mock logger
jest.mock('../server/src/utils/logger', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  })
}));

describe('PDF Extractor', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock fs.existsSync to return true
    fs.existsSync.mockReturnValue(true);
    
    // Mock fs.createWriteStream
    const mockWriteStream = {
      on: jest.fn().mockImplementation(function(event, callback) {
        if (event === 'finish') {
          callback();
        }
        return this;
      }),
      pipe: jest.fn()
    };
    fs.createWriteStream.mockReturnValue(mockWriteStream);
  });
  
  test('downloadPDF should download and save the PDF', async () => {
    // Mock axios response
    const mockResponse = {
      data: {
        pipe: jest.fn()
      }
    };
    axios.mockResolvedValue(mockResponse);
    
    // Call the function
    const result = await downloadPDF();
    
    // Check if axios was called with the correct URL
    expect(axios).toHaveBeenCalledWith({
      method: 'GET',
      url: expect.any(String),
      responseType: 'stream'
    });
    
    // Check if createWriteStream was called
    expect(fs.createWriteStream).toHaveBeenCalled();
    
    // Check if pipe was called
    expect(mockResponse.data.pipe).toHaveBeenCalled();
    
    // Check if the function returns a path
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });
  
  test('extractContent should use the server implementation to extract content', async () => {
    // Mock the server implementation
    const mockContent = {
      date: '2023-05-01',
      sections: {
        'ocho-columnas': 'Content for ocho columnas',
        'primeras-planas': 'Content for primeras planas',
        'columnas-politicas': 'Content for columnas políticas',
        'informacion-general': 'Content for información general',
        'cartones': 'Content for cartones',
        'suprema-corte': 'Content for suprema corte',
        'tribunal-electoral': 'Content for tribunal electoral',
        'dof': 'Content for dof',
        'consejo-judicatura': 'Content for consejo de la judicatura'
      },
      images: [
        '/path/to/image1.png',
        '/path/to/image2.png'
      ],
      index: [
        { id: 'ocho-columnas', name: 'OCHO COLUMNAS', pages: { start: 2, end: 4 } },
        { id: 'primeras-planas', name: 'PRIMERAS PLANAS', pages: { start: 5, end: 25 } }
      ]
    };
    
    pdfExtractor.extractContent.mockResolvedValue(mockContent);
    
    // Call the function
    const result = await extractContent('test.pdf');
    
    // Check if the server implementation was called
    expect(pdfExtractor.extractContent).toHaveBeenCalledWith('test.pdf');
    
    // Check the result
    expect(result).toHaveProperty('date');
    expect(result).toHaveProperty('sections');
    expect(result.sections).toHaveProperty('ocho-columnas');
    expect(result.sections).toHaveProperty('primeras-planas');
    expect(result.sections).toHaveProperty('columnas-politicas');
    expect(result.sections).toHaveProperty('informacion-general');
    expect(result.sections).toHaveProperty('cartones');
    expect(result.sections).toHaveProperty('suprema-corte');
    expect(result.sections).toHaveProperty('tribunal-electoral');
    expect(result.sections).toHaveProperty('dof');
    expect(result.sections).toHaveProperty('consejo-judicatura');
  });
  
  test('processContent should process different section types correctly', async () => {
    // Mock database.run
    const { run } = require('../server/database');
    
    // Create mock content
    const mockContent = {
      date: '2023-05-01',
      sections: {
        'ocho-columnas': 'Content for ocho columnas',
        'primeras-planas': 'Content for primeras planas',
        'columnas-politicas': 'Content for columnas políticas',
        'informacion-general': 'Content for información general',
        'cartones': 'Content for cartones',
        'suprema-corte': 'Content for suprema corte',
        'tribunal-electoral': 'Content for tribunal electoral',
        'dof': 'Content for dof',
        'consejo-judicatura': 'Content for consejo de la judicatura'
      },
      images: [
        '/path/to/portada-el-universal.png',
        '/path/to/portada-reforma.png',
        '/path/to/carton-1.png',
        '/path/to/carton-2.png'
      ],
      index: [
        { id: 'ocho-columnas', name: 'OCHO COLUMNAS', pages: { start: 2, end: 4 } },
        { id: 'primeras-planas', name: 'PRIMERAS PLANAS', pages: { start: 5, end: 25 } }
      ]
    };
    
    // Call the function
    await processContent(mockContent);
    
    // Check if run was called for each section
    // We expect more calls now because we're processing articles and images separately
    expect(run).toHaveBeenCalled();
    
    // Check if run was called with the correct parameters for articles
    expect(run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ARTICLE'),
      expect.arrayContaining(['2023-05-01'])
    );
    
    // Check if run was called with the correct parameters for images
    expect(run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO IMAGE'),
      expect.arrayContaining(['2023-05-01'])
    );
  });
  
  test('processArticleSection should handle articles with links', async () => {
    // Mock database.run
    const { run } = require('../server/database');
    
    // Create mock content with links
    const mockContent = 'Article title\nThis is an article with a link (https://example.com) embedded in it.';
    
    // Call the function
    await processArticleSection('ocho-columnas', mockContent, '2023-05-01');
    
    // Check if run was called with content that includes HTML links
    expect(run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ARTICLE'),
      expect.arrayContaining([expect.any(String), expect.any(String), expect.any(String), 'CJF', 'ocho-columnas', '2023-05-01'])
    );
  });
  
  test('processImageSection should handle different image types', async () => {
    // Mock database.run
    const { run } = require('../server/database');
    
    // Create mock images
    const mockImages = [
      '/path/to/portada-el-universal.png',
      '/path/to/carton-1.png'
    ];
    
    // Call the function for newspaper front pages
    await processImageSection('primeras-planas', mockImages, '2023-05-01');
    
    // Check if run was called with the correct parameters for newspaper front pages
    expect(run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO IMAGE'),
      expect.arrayContaining([expect.stringContaining('portada-'), expect.stringContaining('Portada'), expect.any(String), 'primeras-planas', '2023-05-01'])
    );
    
    // Reset mock
    run.mockClear();
    
    // Call the function for cartoons
    await processImageSection('cartones', mockImages, '2023-05-01');
    
    // Check if run was called with the correct parameters for cartoons
    expect(run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO IMAGE'),
      expect.arrayContaining([expect.stringContaining('carton-'), expect.stringContaining('Cartón'), expect.any(String), 'cartones', '2023-05-01'])
    );
  });
});