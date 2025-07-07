/**
 * Scheduler Service
 * 
 * This service is responsible for scheduling the PDF extraction process
 * to run automatically at specified intervals.
 */

const schedule = require('node-schedule');
const { run, get } = require('../../../../server/database');
const { downloadPDF } = require('../pdf/pdfExtractor');
const { contentExtractor } = require('../content/contentExtractor');
const { processContent } = require('../content/contentProcessor');
const { createLogger } = require('../../utils/logger');
const fs = require('fs');
const path = require('path');

// Create logger for this service
const logger = createLogger('scheduler');

// Store active jobs
const activeJobs = new Map();

/**
 * Schedule a job to run at a specific time
 * @param {string} name Job name
 * @param {string} cronExpression Cron expression for the schedule
 * @param {Function} jobFunction Function to execute
 * @returns {object} Scheduled job
 */
function scheduleJob(name, cronExpression, jobFunction) {
  try {
    logger.info(`Scheduling job "${name}" with cron expression "${cronExpression}"`);
    
    // Cancel existing job with the same name
    if (activeJobs.has(name)) {
      logger.info(`Cancelling existing job "${name}"`);
      activeJobs.get(name).cancel();
    }
    
    // Schedule the new job
    const job = schedule.scheduleJob(name, cronExpression, async () => {
      try {
        logger.info(`Executing scheduled job "${name}"`);
        await jobFunction();
        logger.info(`Job "${name}" completed successfully`);
        
        // Log to database
        await run(
          `INSERT INTO AUDIT_LOG (action, entity_type, details) VALUES (?, ?, ?)`,
          ['SCHEDULED_JOB', 'PDF_EXTRACTION', JSON.stringify({ name, status: 'success' })]
        );
      } catch (error) {
        logger.error(`Error executing job "${name}": ${error.message}`);
        
        // Log to database
        await run(
          `INSERT INTO AUDIT_LOG (action, entity_type, details) VALUES (?, ?, ?)`,
          ['SCHEDULED_JOB', 'PDF_EXTRACTION', JSON.stringify({ name, status: 'error', error: error.message })]
        );
      }
    });
    
    // Store the job
    activeJobs.set(name, job);
    
    return job;
  } catch (error) {
    logger.error(`Error scheduling job "${name}": ${error.message}`);
    throw error;
  }
}

/**
 * Cancel a scheduled job
 * @param {string} name Job name
 * @returns {boolean} True if the job was cancelled, false otherwise
 */
function cancelJob(name) {
  try {
    logger.info(`Cancelling job "${name}"`);
    
    if (activeJobs.has(name)) {
      const job = activeJobs.get(name);
      job.cancel();
      activeJobs.delete(name);
      return true;
    }
    
    logger.warn(`Job "${name}" not found`);
    return false;
  } catch (error) {
    logger.error(`Error cancelling job "${name}": ${error.message}`);
    throw error;
  }
}

/**
 * Get all active jobs
 * @returns {Array} Array of active jobs
 */
function getActiveJobs() {
  return Array.from(activeJobs.keys()).map(name => ({
    name,
    next: activeJobs.get(name).nextInvocation()
  }));
}

/**
 * PDF extraction job function
 */
async function pdfExtractionJob() {
  try {
    logger.info('Starting comprehensive PDF extraction job');
    
    // Download the PDF
    const filePath = await downloadPDF();
    
    // Extract content using enhanced extractor
    const { extractEnhancedContent } = require('../pdf/enhancedPdfExtractor');
    const content = await extractEnhancedContent(filePath);
    
    // Process and store content using enhanced processor
    const { processExtractedContent, clearExistingData } = require('../content/enhancedContentProcessor');
    
    // Clear existing data for this date first
    const date = path.basename(filePath, '.pdf');
    await clearExistingData(date);
    
    // Process the extracted content
    const results = await processExtractedContent(content);
    
    logger.info(`Enhanced PDF extraction job completed successfully.`);
    logger.info(`Processed ${results.statistics.totalSections} sections with ${results.statistics.totalArticles} total articles`);
    Object.entries(results.sections).forEach(([section, data]) => {
      logger.info(`Section ${section}: ${data.processed} articles processed`);
    });
    logger.info(`Stored ${results.statistics.totalImages} images`);
    
    return results;
  } catch (error) {
    logger.error(`PDF extraction job failed: ${error.message}`);
    throw error;
  }
}

/**
 * Initialize the scheduler
 */
async function initializeScheduler() {
  try {
    logger.info('Initializing scheduler');
    
    // Get extraction time from settings
    const extractionTimeSetting = await get(
      `SELECT value FROM SETTINGS WHERE key = 'extraction_time'`
    );
    
    const extractionTime = extractionTimeSetting ? extractionTimeSetting.value : '08:00';
    const [hour, minute] = extractionTime.split(':').map(Number);
    
    // Schedule the PDF extraction job to run daily at the specified time
    const cronExpression = `${minute} ${hour} * * *`;
    scheduleJob('pdf-extraction', cronExpression, pdfExtractionJob);
    
    logger.info(`Scheduler initialized. PDF extraction scheduled to run daily at ${extractionTime}`);
  } catch (error) {
    logger.error(`Error initializing scheduler: ${error.message}`);
    throw error;
  }
}

/**
 * Run the PDF extraction job manually
 * @param {string} date - Optional date to re-extract (format: YYYY-MM-DD)
 * @returns {Promise<object>} Extraction results
 */
async function runExtractionJob(date = null) {
  try {
    if (date) {
      logger.info(`Running PDF re-extraction job manually for date: ${date}`);
      
      // Check if PDF exists for the specified date
      const { pdfExists } = require('../pdf/pdfExtractor');
      const pdfPath = path.join(__dirname, '../../../../storage/pdf', `${date}.pdf`);
      
      if (!fs.existsSync(pdfPath)) {
        throw new Error(`PDF file for date ${date} does not exist`);
      }
      
      // Extract content from the existing PDF using enhanced extractor
      const { extractEnhancedContent } = require('../pdf/enhancedPdfExtractor');
      const content = await extractEnhancedContent(pdfPath);
      
      // Process and store content using enhanced processor
      const { processExtractedContent, clearExistingData } = require('../content/enhancedContentProcessor');
      
      // Clear existing data for this date first
      await clearExistingData(date);
      
      // Process the extracted content
      const results = await processExtractedContent(content);
      
      // Log to database
      await run(
        `INSERT INTO AUDIT_LOG (action, entity_type, details) VALUES (?, ?, ?)`,
        ['MANUAL_JOB', 'PDF_EXTRACTION', JSON.stringify({ status: 'success', results, date, isReExtraction: true })]
      );
      
      return results;
    } else {
      logger.info('Running PDF extraction job manually');
      
      // Run the job
      const results = await pdfExtractionJob();
      
      // Log to database
      await run(
        `INSERT INTO AUDIT_LOG (action, entity_type, details) VALUES (?, ?, ?)`,
        ['MANUAL_JOB', 'PDF_EXTRACTION', JSON.stringify({ status: 'success', results })]
      );
      
      return results;
    }
  } catch (error) {
    logger.error(`Manual PDF extraction job failed: ${error.message}`);
    
    // Log to database
    await run(
      `INSERT INTO AUDIT_LOG (action, entity_type, details) VALUES (?, ?, ?)`,
      ['MANUAL_JOB', 'PDF_EXTRACTION', JSON.stringify({ status: 'error', error: error.message, date })]
    );
    
    throw error;
  }
}

module.exports = {
  scheduleJob,
  cancelJob,
  getActiveJobs,
  pdfExtractionJob,
  initializeScheduler,
  runExtractionJob
};

// CLI interface for running the extraction job
if (require.main === module) {
  const fs = require('fs');
  const path = require('path');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const triggerExtraction = args.includes('--trigger-extraction');
  const verbose = args.includes('--verbose');
  
  if (triggerExtraction) {
    console.log('Triggering PDF extraction job...');
    
    // Set up verbose logging if requested
    if (verbose) {
      process.env.LOG_LEVEL = 'debug';
      console.log('Verbose logging enabled');
    }
    
    // Run the extraction job
    runExtractionJob()
      .then(results => {
        console.log('PDF extraction job completed successfully');
        console.log(`Processed ${Object.values(results.sections).reduce((a, b) => a + b, 0)} articles and ${results.images} images`);
        
        // Check if any articles were created
        if (Object.values(results.sections).reduce((a, b) => a + b, 0) === 0) {
          console.log('WARNING: No articles were created during the extraction process');
          
          // Check the PDF file
          const date = new Date().toISOString().split('T')[0];
          const pdfPath = path.join(__dirname, '../../../../storage/pdf', `${date}.pdf`);
          
          if (fs.existsSync(pdfPath)) {
            console.log(`PDF file exists at ${pdfPath}`);
            console.log(`PDF file size: ${fs.statSync(pdfPath).size} bytes`);
          } else {
            console.log(`PDF file does not exist at ${pdfPath}`);
          }
        }
        
        process.exit(0);
      })
      .catch(error => {
        console.error(`Error running PDF extraction job: ${error.message}`);
        console.error(error.stack);
        process.exit(1);
      });
  }
}