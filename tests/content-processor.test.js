/**
 * Content Processor Service Tests
 * 
 * Tests for the content processing service.
 */

const { processContent } = require('../server/src/services/content/contentProcessor');
const { run, query } = require('../server/database');

// Mock database functions
jest.mock('../server/database', () => ({
  run: jest.fn().mockResolvedValue({ lastID: 1 }),
  get: jest.fn(),
  query: jest.fn()
}));

// Mock logger
jest.mock('../server/src/utils/logger', () => ({
  createLogger: jest.fn().mockReturnValue({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  })
}), { virtual: true });

describe('Content Processor Service', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  test('processes content and stores it in the database', async () => {
    // Create mock content
    const mockContent = {
      date: '2023-05-01',
      sections: {
        'ocho-columnas': [
          {
            title: 'Test Article 1',
            content: 'Content for test article 1',
            source: 'Test Source 1'
          },
          {
            title: 'Test Article 2',
            content: 'Content for test article 2',
            source: 'Test Source 2'
          }
        ],
        'primeras-planas': [
          {
            title: 'Test Article 3',
            content: 'Content for test article 3',
            source: 'Test Source 3'
          }
        ]
      }
    };
    
    // Process the content
    await processContent(mockContent);
    
    // Check if run was called for each article
    expect(run).toHaveBeenCalledTimes(3); // Once for each article
    
    // Check if run was called with the correct parameters for the first article
    expect(run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ARTICLE'),
      expect.arrayContaining([
        'Test Article 1',
        'Content for test article 1',
        expect.any(String), // Summary
        'Test Source 1',
        'ocho-columnas',
        '2023-05-01'
      ])
    );
  });
  
  test('generates summaries for articles', async () => {
    // Create mock content with a long article
    const longContent = 'This is a very long article content that should be summarized. '.repeat(20);
    const mockContent = {
      date: '2023-05-01',
      sections: {
        'ocho-columnas': [
          {
            title: 'Long Article',
            content: longContent,
            source: 'Test Source'
          }
        ]
      }
    };
    
    // Process the content
    await processContent(mockContent);
    
    // Check if run was called with a summarized version of the content
    expect(run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ARTICLE'),
      expect.arrayContaining([
        'Long Article',
        longContent,
        expect.stringMatching(/^This is a very long article/), // Summary should start with the beginning of the content
        'Test Source',
        'ocho-columnas',
        '2023-05-01'
      ])
    );
    
    // The summary should be shorter than the content
    const summary = run.mock.calls[0][1][2];
    expect(summary.length).toBeLessThan(longContent.length);
  });
  
  test('handles empty sections gracefully', async () => {
    // Create mock content with empty sections
    const mockContent = {
      date: '2023-05-01',
      sections: {
        'ocho-columnas': [],
        'primeras-planas': []
      }
    };
    
    // Process the content
    await processContent(mockContent);
    
    // Check if run was not called
    expect(run).not.toHaveBeenCalled();
  });
  
  test('handles malformed content gracefully', async () => {
    // Create malformed mock content
    const mockContent = {
      date: '2023-05-01',
      sections: {
        'ocho-columnas': [
          {
            // Missing title
            content: 'Content without title',
            source: 'Test Source'
          },
          {
            title: 'Article without content',
            // Missing content
            source: 'Test Source'
          },
          {
            title: 'Article without source',
            content: 'Content without source'
            // Missing source
          }
        ]
      }
    };
    
    // Process the content
    await processContent(mockContent);
    
    // Check if run was called for each article, even if malformed
    expect(run).toHaveBeenCalledTimes(3);
    
    // Check if default values were used for missing fields
    expect(run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ARTICLE'),
      expect.arrayContaining([
        'Sin título', // Default title
        'Content without title',
        expect.any(String),
        'Test Source',
        'ocho-columnas',
        '2023-05-01'
      ])
    );
    
    expect(run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ARTICLE'),
      expect.arrayContaining([
        'Article without content',
        '', // Empty content
        '', // Empty summary
        'Test Source',
        'ocho-columnas',
        '2023-05-01'
      ])
    );
    
    expect(run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO ARTICLE'),
      expect.arrayContaining([
        'Article without source',
        'Content without source',
        expect.any(String),
        'Desconocido', // Default source
        'ocho-columnas',
        '2023-05-01'
      ])
    );
  });
  
  test('handles database errors gracefully', async () => {
    // Mock run to throw an error
    run.mockRejectedValueOnce(new Error('Database error'));
    
    // Create mock content
    const mockContent = {
      date: '2023-05-01',
      sections: {
        'ocho-columnas': [
          {
            title: 'Test Article',
            content: 'Content for test article',
            source: 'Test Source'
          }
        ]
      }
    };
    
    // Process the content and expect it not to throw
    await expect(processContent(mockContent)).resolves.not.toThrow();
    
    // Check if run was called
    expect(run).toHaveBeenCalled();
  });
});