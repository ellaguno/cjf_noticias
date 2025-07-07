/**
 * Enhanced Content Processor Service
 * 
 * This service processes the enhanced PDF content extracted by the enhanced PDF extractor
 * and stores it in the database with proper structure for all section types.
 */

const { run, get, query } = require('../../../database');
const { createLogger } = require('../../utils/logger');
const path = require('path');
const fs = require('fs');

const logger = createLogger('enhanced-content-processor');

/**
 * Process extracted content and store in database
 * @param {object} extractedContent Content from the enhanced PDF extractor
 * @returns {Promise<object>} Processing results
 */
async function processExtractedContent(extractedContent) {
  try {
    logger.info(`Processing enhanced content for date: ${extractedContent.date}`);
    
    const results = {
      date: extractedContent.date,
      sections: {},
      statistics: {
        totalSections: 0,
        totalArticles: 0,
        totalImages: 0
      },
      errors: []
    };

    // Process all sections
    if (extractedContent.sections) {
      for (const [sectionId, sectionData] of Object.entries(extractedContent.sections)) {
        try {
          logger.info(`Processing section ${sectionId} with ${sectionData.articles.length} articles`);
          
          const sectionResult = await processSectionWithArticles(sectionId, sectionData, extractedContent.date);
          results.sections[sectionId] = sectionResult;
          
          results.statistics.totalSections++;
          results.statistics.totalArticles += sectionResult.processed;
          if (sectionData.images) {
            results.statistics.totalImages += sectionData.images.length;
          }
          
          logger.info(`Processed section ${sectionId}: ${sectionResult.processed} articles, ${sectionResult.errors.length} errors`);
          
        } catch (sectionError) {
          logger.error(`Error processing section ${sectionId}: ${sectionError.message}`);
          results.errors.push({
            section: sectionId,
            error: sectionError.message
          });
        }
      }
    }

    // Store extraction metadata
    await storeExtractionMetadata(extractedContent, results);

    logger.info(`Enhanced content processing completed for ${extractedContent.date}`);
    logger.info(`Total: ${results.statistics.totalSections} sections, ${results.statistics.totalArticles} articles, ${results.statistics.totalImages} images`);

    return results;

  } catch (error) {
    logger.error(`Error processing enhanced content: ${error.message}`);
    throw error;
  }
}

/**
 * Process a section with its articles and images
 * @param {string} sectionId Section identifier
 * @param {object} sectionData Section data with articles and images
 * @param {string} date Publication date
 * @returns {Promise<object>} Section processing result
 */
async function processSectionWithArticles(sectionId, sectionData, date) {
  try {
    const result = {
      sectionId,
      processed: 0,
      skipped: 0,
      errors: [],
      articles: [],
      images: []
    };

    // Ensure section exists in database
    await ensureSectionExists(sectionId, sectionData.name || sectionId.toUpperCase().replace('-', ' '));

    // Process articles
    if (sectionData.articles && sectionData.articles.length > 0) {
      for (const article of sectionData.articles) {
        try {
          const storedArticle = await storeArticle(article, sectionId, date);
          result.articles.push(storedArticle);
          result.processed++;
          
        } catch (articleError) {
          logger.warn(`Failed to store article ${article.id}: ${articleError.message}`);
          result.errors.push({
            articleId: article.id,
            error: articleError.message
          });
          result.skipped++;
        }
      }
    }

    // Process images if this is an image-based section
    if (sectionData.images && sectionData.images.length > 0) {
      for (const image of sectionData.images) {
        try {
          const storedImage = await storeImage(image, sectionId, date);
          result.images.push(storedImage);
          
        } catch (imageError) {
          logger.warn(`Failed to store image ${image.filename}: ${imageError.message}`);
          result.errors.push({
            imageFile: image.filename,
            error: imageError.message
          });
        }
      }
    }

    return result;

  } catch (error) {
    logger.error(`Error processing section ${sectionId}: ${error.message}`);
    throw error;
  }
}

/**
 * Ensure section exists in database (simplified for current schema)
 * @param {string} sectionId Section identifier
 * @param {string} sectionName Section display name
 * @returns {Promise<void>}
 */
async function ensureSectionExists(sectionId, sectionName) {
  // For current schema, sections are just stored as text in articles
  // No separate section table exists
  logger.debug(`Section ${sectionId} will be stored directly in articles`);
}

/**
 * Store an article in the database
 * @param {object} article Article data
 * @param {string} sectionId Section identifier
 * @param {string} date Publication date
 * @returns {Promise<object>} Stored article data
 */
async function storeArticle(article, sectionId, date) {
  try {
    // Check if article already exists
    const existingArticle = await get(
      `SELECT id FROM ARTICLE WHERE title = ? AND publication_date = ? AND section_id = ?`,
      [article.title, date, sectionId]
    );

    if (existingArticle) {
      logger.debug(`Article already exists: ${article.title}`);
      return { id: existingArticle.id, created: false };
    }

    // Insert new article using existing schema
    const result = await run(
      `INSERT INTO ARTICLE (
        title, content, summary, source, section_id, publication_date, 
        url, source_url, image_url
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        article.title || '',
        article.content || '',
        article.summary || article.content?.substring(0, 200) + '...' || '',
        article.source || 'CJF',
        sectionId,
        date,
        (article.urls && article.urls.length > 0) ? article.urls[0] : null,
        (article.urls && article.urls.length > 0) ? article.urls[0] : null,
        article.imageUrl || null
      ]
    );

    // Image URL is already stored in the article record via image_url field

    logger.debug(`Stored article: ${article.title} (ID: ${result.lastID})`);
    return {
      id: result.lastID,
      title: article.title,
      created: true
    };

  } catch (error) {
    logger.error(`Error storing article: ${error.message}`);
    throw error;
  }
}

/**
 * Store an image in the database
 * @param {object} image Image data
 * @param {string} sectionId Section identifier
 * @param {string} date Publication date
 * @returns {Promise<object>} Stored image data
 */
async function storeImage(image, sectionId, date) {
  try {
    // Check if image already exists
    const existingImage = await get(
      `SELECT id FROM IMAGE WHERE filename = ? AND publication_date = ?`,
      [image.filename, date]
    );

    if (existingImage) {
      logger.debug(`Image already exists: ${image.filename}`);
      return { id: existingImage.id, created: false };
    }

    // Insert new image using existing schema with correct path
    const result = await run(
      `INSERT INTO IMAGE (
        filename, title, description, section_id, publication_date
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        `images/${date}/${image.filename}`, // Store the correct path including date folder
        image.newspaper || image.cartoonNumber ? `${image.newspaper || 'Cartón'} ${image.cartoonNumber || ''}`.trim() : `Imagen ${sectionId}`,
        `Imagen extraída de la sección ${sectionId}`,
        sectionId,
        date
      ]
    );

    logger.debug(`Stored image: ${image.filename} (ID: ${result.lastID})`);
    return {
      id: result.lastID,
      filename: image.filename,
      created: true
    };

  } catch (error) {
    logger.error(`Error storing image: ${error.message}`);
    throw error;
  }
}


/**
 * Store extraction metadata in database
 * @param {object} extractedContent Original extracted content
 * @param {object} results Processing results
 * @returns {Promise<void>}
 */
async function storeExtractionMetadata(extractedContent, results) {
  try {
    await run(
      `INSERT INTO AUDIT_LOG (action, entity_type, details) VALUES (?, ?, ?)`,
      [
        'CONTENT_PROCESSED',
        'PDF_EXTRACTION',
        JSON.stringify({
          date: extractedContent.date,
          method: extractedContent.metadata.extractionMethod,
          statistics: {
            ...extractedContent.metadata.statistics,
            processingResults: results.statistics
          },
          errors: results.errors
        })
      ]
    );

    logger.debug(`Stored extraction metadata for ${extractedContent.date}`);

  } catch (error) {
    logger.error(`Error storing extraction metadata: ${error.message}`);
    throw error;
  }
}

/**
 * Clear existing data for a specific date
 * @param {string} date Date in YYYY-MM-DD format
 * @returns {Promise<void>}
 */
async function clearExistingData(date) {
  try {
    logger.info(`Clearing existing data for date: ${date}`);

    // Delete articles
    const articlesDeleted = await run(
      `DELETE FROM ARTICLE WHERE publication_date = ?`,
      [date]
    );

    // Delete images
    const imagesDeleted = await run(
      `DELETE FROM IMAGE WHERE publication_date = ?`,
      [date]
    );

    logger.info(`Cleared ${articlesDeleted.changes} articles and ${imagesDeleted.changes} images for date ${date}`);

  } catch (error) {
    logger.error(`Error clearing existing data for ${date}: ${error.message}`);
    throw error;
  }
}

/**
 * Get section display order
 * @param {string} sectionId Section identifier
 * @returns {number} Display order
 */
function getSectionOrder(sectionId) {
  const sectionOrder = {
    'ocho-columnas': 1,
    'primeras-planas': 2,
    'sintesis-informativa': 3,
    'consejo-judicatura': 4,
    'suprema-corte': 5,
    'tribunal-electoral': 6,
    'informacion-general': 7,
    'columnas-politicas': 8,
    'dof': 9,
    'cartones': 10
  };

  return sectionOrder[sectionId] || 99;
}

module.exports = {
  processExtractedContent,
  clearExistingData,
  processSectionWithArticles,
  storeArticle,
  storeImage,
  ensureSectionExists
};