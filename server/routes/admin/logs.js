/**
 * Admin Logs API Routes
 * 
 * Provides endpoints for accessing and managing application logs.
 */

const express = require('express');
const router = express.Router();
const { query, run } = require('../../database');
const { createLogger } = require('../../src/utils/logger');
const { authMiddleware, adminMiddleware } = require('../../src/middleware/auth');

// Create logger
const logger = createLogger('logs-api');

/**
 * GET /api/admin/logs
 * Get application logs with filtering and pagination
 */
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      level,
      module,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    // Build the query
    let sql = 'SELECT * FROM LOG';
    const params = [];
    const conditions = [];

    // Add filters
    if (level && level !== 'all') {
      conditions.push('level = ?');
      params.push(level.toUpperCase());
    }

    if (module && module !== 'all') {
      conditions.push("message LIKE ?");
      params.push(`%[${module}]%`);
    }

    if (startDate) {
      conditions.push('created_at >= ?');
      params.push(startDate);
    }

    if (endDate) {
      conditions.push('created_at <= ?');
      params.push(endDate + ' 23:59:59');
    }

    // Add WHERE clause if there are conditions
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    // Add ORDER BY clause
    sql += ` ORDER BY ${sortBy} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}`;

    // Get total count
    const countSql = conditions.length > 0
      ? `SELECT COUNT(*) as count FROM LOG WHERE ${conditions.join(' AND ')}`
      : 'SELECT COUNT(*) as count FROM LOG';
    
    const countResult = await query(countSql, params);
    const total = countResult[0].count;

    // Add pagination
    const offset = (page - 1) * limit;
    sql += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    // Execute the query
    const logs = await query(sql, params);

    // Get unique modules from log messages
    const modulesSql = "SELECT DISTINCT SUBSTR(message, INSTR(message, '[') + 1, INSTR(message, ']') - INSTR(message, '[') - 1) as module FROM LOG WHERE message LIKE '[%]%'";
    const modulesResult = await query(modulesSql);
    const modules = modulesResult
      .map(row => row.module)
      .filter(module => module && module.trim() !== '');

    res.json({
      logs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
      modules
    });
  } catch (error) {
    logger.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

/**
 * DELETE /api/admin/logs
 * Clear logs based on criteria
 */
router.delete('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      level,
      olderThan,
      all = false
    } = req.body;

    // Build the query
    let sql = 'DELETE FROM LOG';
    const params = [];
    const conditions = [];

    if (!all) {
      // Add filters
      if (level && level !== 'all') {
        conditions.push('level = ?');
        params.push(level.toUpperCase());
      }

      if (olderThan) {
        conditions.push('created_at < ?');
        params.push(olderThan);
      }

      // Add WHERE clause if there are conditions
      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      } else {
        // Prevent accidental deletion of all logs
        return res.status(400).json({ error: 'No deletion criteria provided' });
      }
    }

    // Execute the query
    const result = await run(sql, params);

    // Log the action
    logger.info(`Logs cleared by user ${req.user.username}`, {
      user: req.user.id,
      criteria: { level, olderThan, all },
      deletedCount: result.changes
    });

    res.json({
      message: 'Logs cleared successfully',
      deletedCount: result.changes
    });
  } catch (error) {
    logger.error('Error clearing logs:', error);
    res.status(500).json({ error: 'Failed to clear logs' });
  }
});

/**
 * GET /api/admin/logs/stats
 * Get log statistics
 */
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Get log counts by level
    const levelStats = await query(`
      SELECT level, COUNT(*) as count
      FROM LOG
      GROUP BY level
      ORDER BY count DESC
    `);

    // Get log counts by day for the last 30 days
    const dailyStats = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        COUNT(CASE WHEN level = 'ERROR' THEN 1 END) as errorCount,
        COUNT(CASE WHEN level = 'WARN' THEN 1 END) as warnCount,
        COUNT(CASE WHEN level = 'INFO' THEN 1 END) as infoCount,
        COUNT(CASE WHEN level = 'DEBUG' THEN 1 END) as debugCount
      FROM LOG
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    // Get most frequent error messages
    const topErrors = await query(`
      SELECT message, COUNT(*) as count
      FROM LOG
      WHERE level = 'ERROR'
      GROUP BY message
      ORDER BY count DESC
      LIMIT 10
    `);

    res.json({
      levelStats,
      dailyStats,
      topErrors
    });
  } catch (error) {
    logger.error('Error fetching log statistics:', error);
    res.status(500).json({ error: 'Failed to fetch log statistics' });
  }
});

module.exports = router;