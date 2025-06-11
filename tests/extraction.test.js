/**
 * PDF Extraction Integration Tests
 * 
 * Tests for the PDF extraction services.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { downloadPDF, extractContent } = require('../server/src/services/pdf/pdfExtractor');
const { processContent } = require('../server/src/services/content/contentProcessor');
const { pdfExtractionJob } = require('../server/src/services/scheduler/scheduler');

// Mock axios
jest.mock('axios');

// Mock logger
jest.mock('../server/src/utils/logger', () => ({
  createLogger: jest.fn().mockReturnValue({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  })
}), { virtual: true });

// Mock fs
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  createWriteStream: jest.fn(),
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  appendFileSync: jest.fn()
}));

// Mock pdf-parse
jest.mock('pdf-parse', () => jest.fn());

// Mock database functions
jest.mock('../server/database', () => ({
  run: jest.fn().mockResolvedValue({ lastID: 1 }),
  get: jest.fn(),
  query: jest.fn()
}));

describe('PDF Extraction Integration', () => {
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
  
  test('Full extraction process should work end-to-end', async () => {
    // Mock axios response
    const mockResponse = {
      data: {
        pipe: jest.fn()
      }
    };
    axios.mockResolvedValue(mockResponse);
    
    // Mock pdf-parse
    const pdfParse = require('pdf-parse');
    pdfParse.mockResolvedValue({
      text: `
        OCHO COLUMNAS
        This is the content for ocho columnas
        
        PRIMERAS PLANAS
        This is the content for primeras planas
        
        COLUMNAS POLÍTICAS
        This is the content for columnas políticas
        
        INFORMACIÓN GENERAL
        This is the content for información general
        
        CARTONES
        This is the content for cartones
        
        SUPREMA CORTE DE JUSTICIA DE LA NACIÓN
        This is the content for suprema corte
        
        TRIBUNAL ELECTORAL DEL PODER JUDICIAL DE LA FEDERACIÓN
        This is the content for tribunal electoral
        
        DOF
        This is the content for dof
        
        CONSEJO DE LA JUDICATURA FEDERAL
        This is the content for consejo de la judicatura
      `
    });
    
    // Mock database.get for scheduler
    const { get } = require('../server/database');
    get.mockResolvedValueOnce({ value: '08:00' }); // For extraction time
    
    // Run the full extraction job
    await pdfExtractionJob();
    
    // Check if downloadPDF was called
    expect(axios).toHaveBeenCalled();
    
    // Check if extractContent was called
    expect(pdfParse).toHaveBeenCalled();
    
    // Check if processContent was called
    const { run } = require('../server/database');
    expect(run).toHaveBeenCalled();
  });
  
  test('PDF Extractor should handle errors gracefully', async () => {
    // Mock axios to throw an error
    axios.mockRejectedValue(new Error('Network error'));
    
    // Expect the function to throw an error
    await expect(downloadPDF()).rejects.toThrow('Network error');
  });
  
  test('Content Processor should handle empty content gracefully', async () => {
    // Create empty content
    const emptyContent = {
      date: '2023-05-01',
      sections: {}
    };
    
    // Process the empty content
    const result = await processContent(emptyContent);
    
    // Expect the result to have the correct structure
    expect(result).toHaveProperty('date', '2023-05-01');
    expect(result).toHaveProperty('sections');
    expect(result).toHaveProperty('images');
  });
});