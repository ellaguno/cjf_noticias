/**
 * Extraction API Endpoints
 * 
 * This module provides API endpoints for managing the PDF extraction process.
 */

const express = require('express');
const router = express.Router();
const { query, get, run } = require('../../../server/database');
const { pdfExists, getLatestPDF } = require('../services/pdf/pdfExtractor');
const { runExtractionJob, getActiveJobs } = require('../services/scheduler/scheduler');
const { createLogger } = require('../utils/logger');

// Create logger for this module
const logger = createLogger('api-extraction');

// Middleware to check if user is authenticated as admin
// This is a placeholder - in a real app, you would implement proper authentication
const isAdmin = (req, res, next) => {
  // For development purposes, we'll skip authentication
  // In a real app, you would check for a valid JWT token or session
  // and verify that the user has admin privileges
  next();
};

/**
 * @route GET /api/extraction/status
 * @description Get the status of the extraction process
 * @access Public
 */
router.get('/status', async (req, res, next) => {
  try {
    logger.info('Getting extraction status');
    
    // Get the latest extraction from the audit log
    const latestExtraction = await get(
      `SELECT * FROM AUDIT_LOG WHERE entity_type = 'PDF_EXTRACTION' ORDER BY timestamp DESC LIMIT 1`
    );
    
    // Get the latest PDF file
    const latestPDF = getLatestPDF();
    
    // Get active jobs
    const activeJobs = getActiveJobs();
    
    // Get the count of articles and images for the latest date
    const latestDate = latestPDF ? require('path').basename(latestPDF, '.pdf') : null;
    
    let articleCount = 0;
    let imageCount = 0;
    
    if (latestDate) {
      const articles = await get(
        `SELECT COUNT(*) as count FROM ARTICLE WHERE publication_date = ?`,
        [latestDate]
      );
      
      const images = await get(
        `SELECT COUNT(*) as count FROM IMAGE WHERE publication_date = ?`,
        [latestDate]
      );
      
      articleCount = articles ? articles.count : 0;
      imageCount = images ? images.count : 0;
    }
    
    res.json({
      latestExtraction: latestExtraction || null,
      latestPDF: latestPDF ? {
        path: latestPDF,
        date: latestDate,
        articleCount,
        imageCount
      } : null,
      activeJobs
    });
  } catch (error) {
    logger.error(`Error getting extraction status: ${error.message}`);
    next(error);
  }
});

/**
 * @route GET /api/extraction/logs
 * @description Get extraction logs
 * @access Admin
 */
router.get('/logs', isAdmin, async (req, res, next) => {
  try {
    logger.info('Getting extraction logs');
    
    const { limit = 20, offset = 0 } = req.query;
    
    // Get logs from the audit log
    const logs = await query(
      `SELECT * FROM AUDIT_LOG WHERE entity_type = 'PDF_EXTRACTION' ORDER BY timestamp DESC LIMIT ? OFFSET ?`,
      [parseInt(limit), parseInt(offset)]
    );
    
    // Get total count for pagination
    const countResult = await get(
      `SELECT COUNT(*) as total FROM AUDIT_LOG WHERE entity_type = 'PDF_EXTRACTION'`
    );
    
    const total = countResult ? countResult.total : 0;
    
    res.json({
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      logs
    });
  } catch (error) {
    logger.error(`Error getting extraction logs: ${error.message}`);
    next(error);
  }
});

/**
 * @route POST /api/extraction/run
 * @description Trigger a manual extraction
 * @access Admin
 */
router.post('/run', async (req, res, next) => {
  try {
    logger.info(`Received extraction request with body: ${JSON.stringify(req.body)}`);
    logger.info(`Request headers: ${JSON.stringify(req.headers)}`);
    logger.info(`Request method: ${req.method}`);
    logger.info(`Request URL: ${req.url}`);
    
    const { date } = req.body;
    
    if (date) {
      logger.info(`Triggering manual re-extraction for date: ${date}`);
      
      // Check if PDF exists for the date
      const pdfPath = require('path').join(__dirname, '../../../storage/pdf', `${date}.pdf`);
      const fs = require('fs');
      const fileExists = fs.existsSync(pdfPath);
      logger.info(`Checking PDF file at path: ${pdfPath}, exists: ${fileExists}`);
      
      if (!fileExists) {
        logger.error(`PDF file for date ${date} does not exist at path: ${pdfPath}`);
        return res.status(404).json({
          success: false,
          message: `PDF file for date ${date} does not exist`,
          error: 'PDF_NOT_FOUND'
        });
      }
      
      try {
        // Run the extraction job with the specified date
        logger.info(`Starting re-extraction job for date: ${date}`);
        const results = await runExtractionJob(date);
        logger.info(`Re-extraction job completed with results: ${JSON.stringify(results)}`);
        
        res.json({
          success: true,
          message: `Re-extraction job for ${date} completed successfully`,
          results
        });
      } catch (extractionError) {
        logger.error(`Error during extraction: ${extractionError.message}`);
        logger.error(extractionError.stack);
        
        res.status(500).json({
          success: false,
          message: `Error during extraction: ${extractionError.message}`,
          error: 'EXTRACTION_ERROR'
        });
      }
    } else {
      logger.info('Triggering manual extraction');
      
      // Run the extraction job
      const results = await runExtractionJob();
      
      res.json({
        success: true,
        message: 'Extraction job completed successfully',
        results
      });
    }
  } catch (error) {
    logger.error(`Error running extraction job: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: 'Extraction job failed',
      error: error.message
    });
  }
});

/**
 * @route GET /api/extraction/dates
 * @description Get available extraction dates
 * @access Public
 */
router.get('/dates', async (req, res, next) => {
  try {
    logger.info('Getting available extraction dates');
    
    // Get distinct publication dates from the database
    const dates = await query(
      `SELECT DISTINCT publication_date FROM ARTICLE ORDER BY publication_date DESC`
    );
    
    res.json(dates.map(date => date.publication_date));
  } catch (error) {
    logger.error(`Error getting extraction dates: ${error.message}`);
    next(error);
  }
});

/**
 * @route GET /api/extraction/date/:date
 * @description Check if extraction exists for a specific date
 * @access Public
 */
router.get('/date/:date', async (req, res, next) => {
  try {
    const { date } = req.params;
    logger.info(`Checking if extraction exists for date: ${date}`);
    
    // Check if PDF exists
    const pdfExistsForDate = pdfExists(date);
    
    // Check if articles exist
    const articles = await get(
      `SELECT COUNT(*) as count FROM ARTICLE WHERE publication_date = ?`,
      [date]
    );
    
    const articleCount = articles ? articles.count : 0;
    
    // Check if images exist
    const images = await get(
      `SELECT COUNT(*) as count FROM IMAGE WHERE publication_date = ?`,
      [date]
    );
    
    const imageCount = images ? images.count : 0;
    
    res.json({
      date,
      pdfExists: pdfExistsForDate,
      articleCount,
      imageCount,
      exists: pdfExistsForDate || articleCount > 0 || imageCount > 0
    });
  } catch (error) {
    logger.error(`Error checking extraction for date ${req.params.date}: ${error.message}`);
    next(error);
  }
});

/**
 * @route GET /api/extraction/available-pdfs
 * @description Get list of available PDF files in storage
 * @access Public
 */
router.get('/available-pdfs', async (req, res, next) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    logger.info('Getting available PDF files');
    
    const pdfDir = path.join(__dirname, '../../../storage/pdf');
    
    // Check if directory exists
    if (!fs.existsSync(pdfDir)) {
      return res.json([]);
    }
    
    // Get all PDF files
    const files = fs.readdirSync(pdfDir)
      .filter(file => file.endsWith('.pdf'))
      .map(file => path.basename(file, '.pdf'))
      .sort((a, b) => b.localeCompare(a)); // Sort in descending order (newest first)
    
    res.json(files);
  } catch (error) {
    logger.error(`Error getting available PDF files: ${error.message}`);
    next(error);
  }
});

module.exports = router;