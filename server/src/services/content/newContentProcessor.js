/**
 * New Content Processor Service
 * 
 * This service processes the comprehensive PDF content extracted by the new PDF extractor
 * and stores it in the database with proper structure.
 */

const { run, get, query } = require('../../../database');
const { createLogger } = require('../../utils/logger');

const logger = createLogger('new-content-processor');

/**
 * Process extracted content and store in database
 * @param {object} extractedContent Content from the new PDF extractor
 * @returns {Promise<object>} Processing results
 */
async function processExtractedContent(extractedContent) {
  try {
    logger.info(`Processing comprehensive content for date: ${extractedContent.date}`);
    
    const results = {
      date: extractedContent.date,
      primerasPlanas: {
        processed: 0,
        articles: []
      },
      sections: {},
      images: {
        processed: 0,
        stored: []
      },
      errors: []
    };
    
    // Process primeras-planas
    if (extractedContent.primerasPlanas && extractedContent.primerasPlanas.length > 0) {
      const primerasResult = await processPrimerasPlanas(extractedContent.primerasPlanas, extractedContent.date);
      results.primerasPlanas = primerasResult;
      logger.info(`Processed ${primerasResult.processed} primeras-planas articles`);
    }
    
    // Process other sections
    if (extractedContent.sections) {
      for (const [sectionId, articles] of Object.entries(extractedContent.sections)) {
        try {
          const sectionResult = await processSectionArticles(sectionId, articles, extractedContent.date);
          results.sections[sectionId] = sectionResult;
          logger.info(`Processed section ${sectionId}: ${sectionResult.processed} articles`);
        } catch (sectionError) {
          logger.error(`Error processing section ${sectionId}: ${sectionError.message}`);
          results.errors.push(`Section ${sectionId}: ${sectionError.message}`);
        }
      }
    }
    
    // Store page images as separate image records
    if (extractedContent.metadata && extractedContent.metadata.totalPages) {
      const imageResult = await storePageImages(extractedContent.date, extractedContent.metadata.totalPages);
      results.images = imageResult;
      logger.info(`Stored ${imageResult.processed} page images`);
    }
    
    logger.info(`Content processing completed for ${extractedContent.date}`);
    return results;
    
  } catch (error) {
    logger.error(`Error processing extracted content: ${error.message}`);
    throw error;
  }
}

/**
 * Process primeras-planas articles
 * @param {Array} primerasPlanas Array of primera plana articles
 * @param {string} date Publication date
 * @returns {Promise<object>} Processing results
 */
async function processPrimerasPlanas(primerasPlanas, date) {
  try {
    const results = {
      processed: 0,
      articles: [],
      errors: []
    };
    
    for (const article of primerasPlanas) {
      try {
        // Insert article into database
        const articleResult = await run(`
          INSERT INTO ARTICLE (title, content, summary, source, url, section_id, publication_date)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          article.title,
          article.content,
          article.summary,
          article.source,
          article.urls.length > 0 ? article.urls[0] : null,
          'primeras-planas',
          date
        ]);
        
        const articleId = articleResult.lastID;
        
        // If article has an image, store it
        if (article.imageUrl) {
          await run(`
            INSERT INTO IMAGE (filename, title, description, article_id, section_id, publication_date)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            article.imageUrl.split('/').pop(),
            `Portada ${article.source}`,
            `Primera plana del periódico ${article.source}`,
            articleId,
            'primeras-planas',
            date
          ]);
        }
        
        results.articles.push({
          id: articleId,
          title: article.title,
          source: article.source
        });
        
        results.processed++;
        logger.debug(`Stored primera plana article: ${article.title} (${article.source})`);
        
      } catch (articleError) {
        logger.warn(`Error storing primera plana article: ${articleError.message}`);
        results.errors.push(`Article "${article.title}": ${articleError.message}`);
      }
    }
    
    return results;
    
  } catch (error) {
    logger.error(`Error processing primeras-planas: ${error.message}`);
    throw error;
  }
}

/**
 * Process articles for a specific section
 * @param {string} sectionId Section identifier
 * @param {Array} articles Array of articles
 * @param {string} date Publication date
 * @returns {Promise<object>} Processing results
 */
async function processSectionArticles(sectionId, articles, date) {
  try {
    const results = {
      processed: 0,
      articles: [],
      errors: []
    };
    
    for (const article of articles) {
      try {
        // Insert article into database
        const articleResult = await run(`
          INSERT INTO ARTICLE (title, content, summary, source, url, section_id, publication_date)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          article.title,
          article.content,
          article.summary,
          article.source,
          article.urls.length > 0 ? article.urls[0] : null,
          sectionId,
          date
        ]);
        
        const articleId = articleResult.lastID;
        
        // If article has an image, store it
        if (article.imageUrl) {
          await run(`
            INSERT INTO IMAGE (filename, title, description, article_id, section_id, publication_date)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            article.imageUrl.split('/').pop(),
            article.title,
            `Imagen asociada al artículo: ${article.title}`,
            articleId,
            sectionId,
            date
          ]);
        }
        
        results.articles.push({
          id: articleId,
          title: article.title,
          section: sectionId
        });
        
        results.processed++;
        logger.debug(`Stored article: ${article.title} (${sectionId})`);
        
      } catch (articleError) {
        logger.warn(`Error storing article in section ${sectionId}: ${articleError.message}`);
        results.errors.push(`Article "${article.title}": ${articleError.message}`);
      }
    }
    
    return results;
    
  } catch (error) {
    logger.error(`Error processing section ${sectionId}: ${error.message}`);
    throw error;
  }
}

/**
 * Store page images as image records
 * @param {string} date Publication date
 * @param {number} totalPages Total number of pages
 * @returns {Promise<object>} Storage results
 */
async function storePageImages(date, totalPages) {
  try {
    const results = {
      processed: 0,
      stored: [],
      errors: []
    };
    
    // Store each page image
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        const filename = `page-${pageNum.toString().padStart(3, '0')}.png`;
        
        // Check if image file exists
        const fs = require('fs');
        const path = require('path');
        const imagePath = path.join(__dirname, '../../../../storage/images', date, filename);
        
        if (fs.existsSync(imagePath)) {
          await run(`
            INSERT INTO IMAGE (filename, title, description, section_id, publication_date)
            VALUES (?, ?, ?, ?, ?)
          `, [
            filename,
            `Página ${pageNum}`,
            `Página ${pageNum} del resumen informativo`,
            'otras', // Store as 'otras' section by default
            date
          ]);
          
          results.stored.push(filename);
          results.processed++;
        }
        
      } catch (imageError) {
        logger.warn(`Error storing page image ${pageNum}: ${imageError.message}`);
        results.errors.push(`Page ${pageNum}: ${imageError.message}`);
      }
    }
    
    return results;
    
  } catch (error) {
    logger.error(`Error storing page images: ${error.message}`);
    throw error;
  }
}

/**
 * Clear existing data for a specific date before processing new content
 * @param {string} date Publication date
 * @returns {Promise<void>}
 */
async function clearExistingData(date) {
  try {
    logger.info(`Clearing existing data for date: ${date}`);
    
    // Delete existing articles and images for this date
    await run('DELETE FROM IMAGE WHERE publication_date = ?', [date]);
    await run('DELETE FROM ARTICLE WHERE publication_date = ?', [date]);
    
    logger.info(`Cleared existing data for ${date}`);
    
  } catch (error) {
    logger.error(`Error clearing existing data: ${error.message}`);
    throw error;
  }
}

/**
 * Get processing statistics for a date
 * @param {string} date Publication date
 * @returns {Promise<object>} Statistics
 */
async function getProcessingStats(date) {
  try {
    const articleStats = await query(`
      SELECT section_id, COUNT(*) as count 
      FROM ARTICLE 
      WHERE publication_date = ? 
      GROUP BY section_id
    `, [date]);
    
    const imageStats = await query(`
      SELECT section_id, COUNT(*) as count 
      FROM IMAGE 
      WHERE publication_date = ? 
      GROUP BY section_id
    `, [date]);
    
    const totalArticles = await get(`
      SELECT COUNT(*) as total 
      FROM ARTICLE 
      WHERE publication_date = ?
    `, [date]);
    
    const totalImages = await get(`
      SELECT COUNT(*) as total 
      FROM IMAGE 
      WHERE publication_date = ?
    `, [date]);
    
    return {
      date,
      articles: {
        total: totalArticles?.total || 0,
        bySections: articleStats.reduce((acc, stat) => {
          acc[stat.section_id] = stat.count;
          return acc;
        }, {})
      },
      images: {
        total: totalImages?.total || 0,
        bySections: imageStats.reduce((acc, stat) => {
          acc[stat.section_id] = stat.count;
          return acc;
        }, {})
      }
    };
    
  } catch (error) {
    logger.error(`Error getting processing stats: ${error.message}`);
    throw error;
  }
}

module.exports = {
  processExtractedContent,
  clearExistingData,
  getProcessingStats,
  processPrimerasPlanas,
  processSectionArticles,
  storePageImages
};