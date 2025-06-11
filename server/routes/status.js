/**
 * Status API Routes
 * 
 * Provides system status information including maintenance mode.
 */

const express = require('express');
const router = express.Router();
const { get } = require('../database');
const { createLogger } = require('../src/utils/logger');

// Create logger
const logger = createLogger('status-api');

/**
 * GET /api/status
 * Returns the current system status
 */
router.get('/', async (req, res) => {
  try {
    // Get maintenance mode setting
    const maintenanceModeSetting = await get(
      'SELECT value FROM SETTINGS WHERE key = ?',
      ['maintenance_mode']
    );
    
    // Determine maintenance mode status
    const maintenanceMode = maintenanceModeSetting?.value === 'true';
    
    // Get system version
    const version = process.env.npm_package_version || '1.0.0';
    
    // Return status
    res.json({
      status: 'ok',
      maintenance_mode: maintenanceMode,
      version,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting system status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error getting system status',
      maintenance_mode: false
    });
  }
});

/**
 * GET /api/status/health
 * Simple health check endpoint for monitoring
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;