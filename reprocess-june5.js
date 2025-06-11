/**
 * Script to reprocess June 5th PDF with updated URL and image extraction
 */

const path = require('path');
const { extractComprehensiveContent } = require('./server/src/services/pdf/newPdfExtractor');
const { processExtractedContent } = require('./server/src/services/content/newContentProcessor');
const { createLogger } = require('./server/src/utils/logger');

const logger = createLogger('reprocess-june5');

async function reprocessJune5() {
  try {
    const pdfPath = '/home/ellaguno/MEGA/Proyectos/Syncrum/ProyectoIA/Código/cjf_noticias/storage/pdf/2025-06-05.pdf';
    
    logger.info('Starting reprocessing of June 5th PDF with URL and image extraction...');
    
    // Step 1: Extract content from PDF
    logger.info('Extracting content from PDF...');
    const extractedContent = await extractComprehensiveContent(pdfPath);
    
    // Step 2: Process and store in database (this will clear existing data)
    logger.info('Processing and storing content in database...');
    const results = await processExtractedContent(extractedContent);
    
    logger.info('Reprocessing completed successfully!');
    console.log('Results:', JSON.stringify(results, null, 2));
    
  } catch (error) {
    logger.error(`Reprocessing failed: ${error.message}`);
    console.error('Error:', error);
    process.exit(1);
  }
}

reprocessJune5();