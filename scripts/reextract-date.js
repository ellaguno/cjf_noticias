/**
 * Re-extract Content for a Specific Date
 * 
 * This script re-extracts content from a PDF file for a specific date
 * and updates the database with the new content.
 */

const path = require('path');
const { extractContent } = require('../server/src/services/pdf/pdfExtractor');
const { processContent } = require('../server/src/services/content/contentProcessor');
const { run, get, query } = require('../server/database');
const { createLogger } = require('../server/src/utils/logger');

// Create logger
const logger = createLogger('reextract-date');

// Configuration
const PDF_DIR = path.join(__dirname, '../storage/pdf');

/**
 * Re-extract content for a specific date
 * @param {string} date Date in YYYY-MM-DD format
 * @param {boolean} deleteExisting Whether to delete existing content before re-extraction
 */
async function reextractDate(date, deleteExisting = true) {
  try {
    logger.info(`Re-extracting content for date: ${date}`);
    
    // Get the PDF file path
    const pdfPath = path.join(PDF_DIR, `${date}.pdf`);
    
    // Delete existing content if requested
    if (deleteExisting) {
      logger.info(`Deleting existing content for date: ${date}`);
      
      // Delete articles
      await run(
        `DELETE FROM ARTICLE WHERE publication_date = ?`,
        [date]
      );
      
      // Delete images (but keep the actual image files)
      await run(
        `DELETE FROM IMAGE WHERE publication_date = ?`,
        [date]
      );
      
      logger.info(`Existing content deleted for date: ${date}`);
    }
    
    // Extract content from the PDF
    logger.info(`Extracting content from ${pdfPath}...`);
    const content = await extractContent(pdfPath);
    
    // Log the sections found
    logger.info(`Found ${Object.keys(content.sections).length} sections in the PDF`);
    
    // Process the content
    logger.info('Processing extracted content...');
    const results = await processContent(content);
    
    // Display processing results
    console.log('\n=== PROCESSING RESULTS ===');
    console.log(`Date: ${results.date}`);
    
    console.log('\nArticles by section:');
    for (const [sectionId, count] of Object.entries(results.sections)) {
      console.log(`- ${sectionId}: ${count} articles`);
    }
    
    console.log(`\nTotal images: ${results.images}`);
    
    // Get article details from the database
    const articlesQuery = await query(
      `SELECT section_id, COUNT(*) as count FROM ARTICLE WHERE publication_date = ? GROUP BY section_id`,
      [date]
    );
    
    console.log('\n=== DATABASE VERIFICATION ===');
    console.log('Articles in database:');
    
    if (articlesQuery && articlesQuery.length > 0) {
      for (const article of articlesQuery) {
        console.log(`- ${article.section_id}: ${article.count} articles`);
      }
    } else {
      console.log('No articles found in the database');
    }
    
    // Get image details from the database
    const imagesQuery = await query(
      `SELECT section_id, COUNT(*) as count FROM IMAGE WHERE publication_date = ? GROUP BY section_id`,
      [date]
    );
    
    console.log('\nImages in database:');
    
    if (imagesQuery && imagesQuery.length > 0) {
      for (const image of imagesQuery) {
        console.log(`- ${image.section_id}: ${image.count} images`);
      }
    } else {
      console.log('No images found in the database');
    }
    
    logger.info('Re-extraction completed successfully');
    return results;
  } catch (error) {
    logger.error(`Error re-extracting content: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    console.error(`Error: ${error.message}`);
    throw error;
  }
}

// Get the date from command line arguments
const date = process.argv[2];
const keepExisting = process.argv[3] === '--keep-existing';

if (!date) {
  console.log('Usage: node reextract-date.js YYYY-MM-DD [--keep-existing]');
  console.log('  --keep-existing: Do not delete existing content before re-extraction');
  process.exit(1);
}

// Run the re-extraction
reextractDate(date, !keepExisting)
  .then(() => {
    console.log('\nRe-extraction completed');
    process.exit(0);
  })
  .catch(error => {
    console.error(`Fatal error: ${error.message}`);
    process.exit(1);
  });