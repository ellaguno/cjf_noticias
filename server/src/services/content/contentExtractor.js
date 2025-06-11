/**
 * Content Extractor Framework
 * 
 * Extensible framework for extracting content from multiple sources:
 * - PDF documents (CJF daily reports)
 * - RSS feeds
 * - Web pages
 * - Other document formats
 */

const path = require('path');
const { createLogger } = require('../../utils/logger');
const pdfExtractor = require('../pdf/pdfExtractor');

const logger = createLogger('content-extractor');

/**
 * Base content extractor interface
 */
class BaseExtractor {
  constructor(type, config = {}) {
    this.type = type;
    this.config = config;
  }

  /**
   * Extract content from source
   * @param {string} source Source URL or file path
   * @param {object} options Extraction options
   * @returns {Promise<object>} Extracted content
   */
  async extract(source, options = {}) {
    throw new Error('extract method must be implemented by subclasses');
  }

  /**
   * Validate if this extractor can handle the source
   * @param {string} source Source URL or file path
   * @returns {boolean} True if can handle, false otherwise
   */
  canHandle(source) {
    throw new Error('canHandle method must be implemented by subclasses');
  }
}

/**
 * PDF content extractor
 */
class PDFExtractor extends BaseExtractor {
  constructor(config = {}) {
    super('pdf', config);
  }

  canHandle(source) {
    return source.toLowerCase().endsWith('.pdf') || source.includes('.pdf');
  }

  async extract(source, options = {}) {
    try {
      logger.info(`Extracting content from PDF: ${source}`);
      
      // Use the improved PDF extractor
      const content = await pdfExtractor.extractContent(source);
      
      // Transform to standard format
      return {
        source: source,
        type: 'pdf',
        date: content.date,
        sections: content.sections,
        articles: content.articles,
        images: content.images,
        metadata: {
          ...content.metadata,
          extractor: 'pdf',
          totalSections: Object.keys(content.sections).length,
          totalArticles: Object.values(content.articles).reduce((sum, articles) => sum + articles.length, 0)
        }
      };
    } catch (error) {
      logger.error(`Error extracting PDF content: ${error.message}`);
      throw error;
    }
  }
}

/**
 * RSS feed extractor
 */
class RSSExtractor extends BaseExtractor {
  constructor(config = {}) {
    super('rss', config);
  }

  canHandle(source) {
    return source.includes('rss') || source.includes('feed') || source.includes('.xml');
  }

  async extract(source, options = {}) {
    try {
      logger.info(`Extracting content from RSS feed: ${source}`);
      
      // This would implement RSS parsing
      // For now, return a placeholder structure
      return {
        source: source,
        type: 'rss',
        date: new Date().toISOString().split('T')[0],
        articles: {
          'general': [] // RSS articles would be extracted here
        },
        metadata: {
          extractor: 'rss',
          feedUrl: source,
          extractedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error(`Error extracting RSS content: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Web page extractor
 */
class WebExtractor extends BaseExtractor {
  constructor(config = {}) {
    super('web', config);
  }

  canHandle(source) {
    return source.startsWith('http://') || source.startsWith('https://');
  }

  async extract(source, options = {}) {
    try {
      logger.info(`Extracting content from web page: ${source}`);
      
      // This would implement web scraping
      // For now, return a placeholder structure
      return {
        source: source,
        type: 'web',
        date: new Date().toISOString().split('T')[0],
        articles: {
          'general': [] // Web articles would be extracted here
        },
        metadata: {
          extractor: 'web',
          url: source,
          extractedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error(`Error extracting web content: ${error.message}`);
      throw error;
    }
  }
}

/**
 * Main content extractor manager
 */
class ContentExtractor {
  constructor() {
    this.extractors = new Map();
    this.registerDefaultExtractors();
  }

  /**
   * Register default extractors
   */
  registerDefaultExtractors() {
    this.registerExtractor(new PDFExtractor());
    this.registerExtractor(new RSSExtractor());
    this.registerExtractor(new WebExtractor());
  }

  /**
   * Register a new extractor
   * @param {BaseExtractor} extractor Extractor instance
   */
  registerExtractor(extractor) {
    if (!(extractor instanceof BaseExtractor)) {
      throw new Error('Extractor must extend BaseExtractor');
    }
    
    this.extractors.set(extractor.type, extractor);
    logger.info(`Registered ${extractor.type} extractor`);
  }

  /**
   * Get appropriate extractor for source
   * @param {string} source Source URL or file path
   * @returns {BaseExtractor|null} Appropriate extractor or null
   */
  getExtractor(source) {
    for (const extractor of this.extractors.values()) {
      if (extractor.canHandle(source)) {
        return extractor;
      }
    }
    return null;
  }

  /**
   * Extract content from any supported source
   * @param {string} source Source URL or file path
   * @param {object} options Extraction options
   * @returns {Promise<object>} Extracted content
   */
  async extract(source, options = {}) {
    try {
      logger.info(`Attempting to extract content from: ${source}`);
      
      const extractor = this.getExtractor(source);
      if (!extractor) {
        throw new Error(`No suitable extractor found for source: ${source}`);
      }

      logger.info(`Using ${extractor.type} extractor for: ${source}`);
      const content = await extractor.extract(source, options);
      
      // Add common metadata
      content.metadata = {
        ...content.metadata,
        extractedAt: new Date().toISOString(),
        extractorVersion: '1.0.0'
      };

      logger.info(`Successfully extracted content from ${source} using ${extractor.type} extractor`);
      return content;
    } catch (error) {
      logger.error(`Error extracting content from ${source}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all registered extractor types
   * @returns {Array} Array of extractor type names
   */
  getExtractorTypes() {
    return Array.from(this.extractors.keys());
  }

  /**
   * Check if a source type is supported
   * @param {string} source Source URL or file path
   * @returns {boolean} True if supported, false otherwise
   */
  isSupported(source) {
    return this.getExtractor(source) !== null;
  }
}

// Create singleton instance
const contentExtractor = new ContentExtractor();

module.exports = {
  ContentExtractor,
  BaseExtractor,
  PDFExtractor,
  RSSExtractor,
  WebExtractor,
  contentExtractor
};