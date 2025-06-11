/**
 * Admin Routes Index
 * 
 * This file exports all admin routes and combines them into a single router.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query, get, run } = require('../../database');
const {
  authenticate,
  authorize,
  csrfProtection,
  loginRateLimiter,
  resetLoginAttempts
} = require('../../src/middleware/auth');
const {
  authenticateUser,
  createUser,
  generateToken,
  hashPassword
} = require('../../src/utils/auth');
const crypto = require('crypto');
const { createLogger } = require('../../src/utils/logger');

// Import admin route modules
const logsRoutes = require('./logs');

// Create logger
const logger = createLogger('admin-api');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../../storage/uploads');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Middleware to log admin actions
const logAction = async (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function (data) {
    const action = req.method;
    const entityType = req.originalUrl.split('/')[3]; // e.g., 'articles', 'images'
    const entityId = req.params.id;
    
    // Log action to database
    run(
      `INSERT INTO AUDIT_LOG (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
      [req.user?.id || null, action, entityType, entityId, JSON.stringify(req.body)]
    ).catch(err => logger.error('Error logging action:', err));
    
    originalSend.call(this, data);
  };
  
  next();
};

// Authentication routes (public)
router.post('/login', loginRateLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const auth = await authenticateUser(username, password);
    
    // Generate CSRF token
    const csrfToken = crypto.randomBytes(20).toString('hex');
    
    // Set secure cookie with JWT token
    res.cookie('token', auth.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    // Reset login attempts on successful login
    resetLoginAttempts(req, res, () => {});
    
    // Log successful login
    logger.info(`User ${username} logged in successfully`);
    
    res.json({
      user: auth.user,
      csrfToken
    });
  } catch (error) {
    logger.warn(`Failed login attempt for user ${req.body.username}`, { error: error.message });
    res.status(401).json({ error: error.message });
  }
});

router.post('/logout', (req, res) => {
  if (req.user) {
    logger.info(`User ${req.user.username} logged out`);
  }
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Apply authentication middleware to all protected routes
router.use(authenticate);
router.use(csrfProtection);
router.use(logAction);

// Mount admin route modules
router.use('/logs', logsRoutes);

// User management routes (admin only)
router.get('/users', authorize(['admin']), async (req, res, next) => {
  try {
    const users = await query(`SELECT id, username, email, role, created_at, updated_at FROM USER`);
    res.json(users);
  } catch (error) {
    logger.error('Error fetching users:', error);
    next(error);
  }
});

router.post('/users', authorize(['admin']), async (req, res, next) => {
  try {
    const { username, password, email, role } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const user = await createUser({ username, password, email, role });
    logger.info(`User ${username} created by ${req.user.username}`);
    res.status(201).json(user);
  } catch (error) {
    if (error.message === 'Username already exists') {
      return res.status(409).json({ error: error.message });
    }
    logger.error('Error creating user:', error);
    next(error);
  }
});

router.get('/users/:id', authorize(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await get(`SELECT id, username, email, role, created_at, updated_at FROM USER WHERE id = ?`, [id]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    logger.error(`Error fetching user ${req.params.id}:`, error);
    next(error);
  }
});

router.put('/users/:id', authorize(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { username, email, role, password } = req.body;
    
    // Check if user exists
    const user = await get(`SELECT * FROM USER WHERE id = ?`, [id]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if username is already taken by another user
    if (username && username !== user.username) {
      const existingUser = await get(`SELECT * FROM USER WHERE username = ? AND id != ?`, [username, id]);
      
      if (existingUser) {
        return res.status(409).json({ error: 'Username already exists' });
      }
    }
    
    // Build update query
    const updates = [];
    const params = [];
    
    if (username) {
      updates.push('username = ?');
      params.push(username);
    }
    
    if (email) {
      updates.push('email = ?');
      params.push(email);
    }
    
    if (role) {
      updates.push('role = ?');
      params.push(role);
    }
    
    if (password) {
      updates.push('password = ?');
      params.push(await hashPassword(password));
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    
    // Update user
    await run(
      `UPDATE USER SET ${updates.join(', ')} WHERE id = ?`,
      [...params, id]
    );
    
    // Get updated user
    const updatedUser = await get(`SELECT id, username, email, role, created_at, updated_at FROM USER WHERE id = ?`, [id]);
    
    logger.info(`User ${user.username} updated by ${req.user.username}`);
    res.json(updatedUser);
  } catch (error) {
    logger.error(`Error updating user ${req.params.id}:`, error);
    next(error);
  }
});

router.delete('/users/:id', authorize(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const user = await get(`SELECT * FROM USER WHERE id = ?`, [id]);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Prevent deleting the last admin
    if (user.role === 'admin') {
      const adminCount = await get(`SELECT COUNT(*) as count FROM USER WHERE role = 'admin'`);
      
      if (adminCount.count <= 1) {
        return res.status(400).json({ error: 'Cannot delete the last admin user' });
      }
    }
    
    // Delete user
    await run(`DELETE FROM USER WHERE id = ?`, [id]);
    
    logger.info(`User ${user.username} deleted by ${req.user.username}`);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting user ${req.params.id}:`, error);
    next(error);
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
  res.json(req.user);
});

// ARTICLE ROUTES

// Get all articles (with pagination)
router.get('/articles', async (req, res, next) => {
  try {
    const { limit = 20, offset = 0, section, date } = req.query;
    
    // Build query conditions
    const conditions = [];
    const params = [];
    
    if (section) {
      conditions.push('section_id = ?');
      params.push(section);
    }
    
    if (date) {
      conditions.push('publication_date = ?');
      params.push(date);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get articles
    const articles = await query(
      `SELECT * FROM ARTICLE ${whereClause} ORDER BY publication_date DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    
    // Get total count for pagination
    const countResult = await query(
      `SELECT COUNT(*) as total FROM ARTICLE ${whereClause}`,
      params
    );
    
    const total = countResult.length > 0 ? countResult[0].total : 0;
    
    res.json({
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      articles
    });
  } catch (error) {
    logger.error('Error fetching articles:', error);
    next(error);
  }
});

// Create article
router.post('/articles', async (req, res, next) => {
  try {
    const { title, content, summary, source, section_id, publication_date } = req.body;
    
    // Validate required fields
    if (!title || !section_id || !publication_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Insert article
    const result = await run(
      `INSERT INTO ARTICLE (title, content, summary, source, section_id, publication_date) VALUES (?, ?, ?, ?, ?, ?)`,
      [title, content, summary, source, section_id, publication_date]
    );
    
    logger.info(`Article "${title}" created by ${req.user.username}`);
    res.status(201).json({
      id: result.lastID,
      title,
      content,
      summary,
      source,
      section_id,
      publication_date
    });
  } catch (error) {
    logger.error('Error creating article:', error);
    next(error);
  }
});

// Update article
router.put('/articles/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, summary, source, section_id, publication_date } = req.body;
    
    // Check if article exists
    const article = await get(`SELECT * FROM ARTICLE WHERE id = ?`, [id]);
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    // Update article
    await run(
      `UPDATE ARTICLE SET 
        title = ?, 
        content = ?, 
        summary = ?, 
        source = ?, 
        section_id = ?, 
        publication_date = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        title || article.title,
        content || article.content,
        summary || article.summary,
        source || article.source,
        section_id || article.section_id,
        publication_date || article.publication_date,
        id
      ]
    );
    
    logger.info(`Article ${id} updated by ${req.user.username}`);
    res.json({
      id: parseInt(id),
      title: title || article.title,
      content: content || article.content,
      summary: summary || article.summary,
      source: source || article.source,
      section_id: section_id || article.section_id,
      publication_date: publication_date || article.publication_date
    });
  } catch (error) {
    logger.error(`Error updating article ${req.params.id}:`, error);
    next(error);
  }
});

// Delete article
router.delete('/articles/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if article exists
    const article = await get(`SELECT * FROM ARTICLE WHERE id = ?`, [id]);
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    // Delete article
    await run(`DELETE FROM ARTICLE WHERE id = ?`, [id]);
    
    logger.info(`Article ${id} deleted by ${req.user.username}`);
    res.json({ message: 'Article deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting article ${req.params.id}:`, error);
    next(error);
  }
});

// IMAGE ROUTES

// Upload image
router.post('/images/upload', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    
    const { title, description, article_id, section_id, publication_date } = req.body;
    
    // Validate required fields
    if (!section_id || !publication_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Insert image record
    const result = await run(
      `INSERT INTO IMAGE (filename, title, description, article_id, section_id, publication_date) VALUES (?, ?, ?, ?, ?, ?)`,
      [req.file.filename, title, description, article_id || null, section_id, publication_date]
    );
    
    logger.info(`Image "${req.file.filename}" uploaded by ${req.user.username}`);
    res.status(201).json({
      id: result.lastID,
      filename: req.file.filename,
      title,
      description,
      article_id: article_id || null,
      section_id,
      publication_date,
      url: `/storage/uploads/${req.file.filename}`
    });
  } catch (error) {
    logger.error('Error uploading image:', error);
    next(error);
  }
});

// Delete image
router.delete('/images/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get image record
    const image = await get(`SELECT * FROM IMAGE WHERE id = ?`, [id]);
    
    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Delete file from storage
    const filePath = path.join(__dirname, '../../../storage/uploads', image.filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Delete image record
    await run(`DELETE FROM IMAGE WHERE id = ?`, [id]);
    
    logger.info(`Image ${id} deleted by ${req.user.username}`);
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting image ${req.params.id}:`, error);
    next(error);
  }
});

// SETTINGS ROUTES

// Get all settings
router.get('/settings', async (req, res, next) => {
  try {
    const settings = await query(`SELECT * FROM SETTINGS`);
    res.json(settings);
  } catch (error) {
    logger.error('Error fetching settings:', error);
    next(error);
  }
});

// EXTRACTION ROUTES

// Get extraction status
router.get('/extraction/status', async (req, res, next) => {
  try {
    // Get the latest extraction status from settings
    const lastExtractionResult = await query(`SELECT value FROM SETTINGS WHERE key = 'last_extraction'`);
    const nextExtractionResult = await query(`SELECT value FROM SETTINGS WHERE key = 'extraction_time'`);
    
    const lastExtraction = lastExtractionResult.length > 0 ? lastExtractionResult[0] : null;
    const nextExtraction = nextExtractionResult.length > 0 ? nextExtractionResult[0] : null;
    
    // If last_extraction doesn't exist, create it with current data
    if (!lastExtraction) {
      logger.info('Creating last_extraction setting with current data');
      
      // Get the latest date with content
      const latestDateResult = await query(
        `SELECT MAX(publication_date) as latest FROM ARTICLE`
      );
      
      const latestDate = latestDateResult.length > 0 ? latestDateResult[0] : null;
      
      if (latestDate && latestDate.latest) {
        const extractionData = {
          timestamp: new Date().toISOString(),
          success: true,
          date: latestDate.latest
        };
        
        await run(
          `INSERT INTO SETTINGS (key, value, description) VALUES (?, ?, ?)`,
          ['last_extraction', JSON.stringify(extractionData), 'Last content extraction timestamp and status']
        );
        
        res.json({
          lastExtraction: extractionData,
          nextExtraction: nextExtraction ? nextExtraction.value : null
        });
        return;
      }
    }
    
    res.json({
      lastExtraction: lastExtraction ? JSON.parse(lastExtraction.value) : null,
      nextExtraction: nextExtraction ? nextExtraction.value : null
    });
  } catch (error) {
    logger.error('Error fetching extraction status:', error);
    next(error);
  }
});

// Get extraction logs
router.get('/extraction/logs', async (req, res, next) => {
  try {
    // Get extraction logs from database
    const logs = await query(`
      SELECT * FROM AUDIT_LOG
      WHERE entity_type = 'extraction'
      ORDER BY created_at DESC
      LIMIT 50
    `);
    
    res.json(logs);
  } catch (error) {
    logger.error('Error fetching extraction logs:', error);
    next(error);
  }
});

// Trigger manual extraction
router.post('/extraction/run', authorize(['admin', 'editor']), async (req, res, next) => {
  try {
    // Import the scheduler service
    const { runExtractionJob } = require('../../src/services/scheduler/scheduler');
    
    // Check if this is a re-extraction request
    const { date } = req.body;
    
    if (date) {
      logger.info(`Manual re-extraction for date ${date} triggered by ${req.user.username}`);
      
      // Check if PDF exists for the date
      const { pdfExists } = require('../../src/services/pdf/pdfExtractor');
      if (!pdfExists(date)) {
        return res.status(404).json({
          success: false,
          message: `PDF file for date ${date} does not exist`,
          error: 'PDF_NOT_FOUND'
        });
      }
      
      // Run the extraction job with the specified date
      const results = await runExtractionJob(date);
      
      // Log the re-extraction
      await run(
        `INSERT INTO AUDIT_LOG (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
        [req.user.id, 'MANUAL_RE_EXTRACTION', 'extraction', null, JSON.stringify({ date, results })]
      );
      
      // Update last extraction setting
      await run(
        `UPDATE SETTINGS SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'last_extraction'`,
        [JSON.stringify({
          timestamp: new Date().toISOString(),
          success: true,
          date: date,
          user: req.user.username,
          isReExtraction: true
        })]
      );
      
      res.json({
        success: true,
        message: `Re-extraction job for ${date} completed successfully`,
        results
      });
    } else {
      logger.info(`Manual extraction triggered by ${req.user.username}`);
      
      // Run the extraction job
      const results = await runExtractionJob();
      
      // Log the extraction
      await run(
        `INSERT INTO AUDIT_LOG (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
        [req.user.id, 'MANUAL_EXTRACTION', 'extraction', null, JSON.stringify(results)]
      );
      
      // Update last extraction setting
      // Get the latest date with content
      const latestDateResult = await query(
        `SELECT MAX(publication_date) as latest FROM ARTICLE`
      );
      
      const latestDate = latestDateResult.length > 0 ? latestDateResult[0].latest : new Date().toISOString().split('T')[0];
      
      await run(
        `UPDATE SETTINGS SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'last_extraction'`,
        [JSON.stringify({
          timestamp: new Date().toISOString(),
          success: true,
          date: latestDate,
          user: req.user.username
        })]
      );
      
      res.json({
        success: true,
        message: 'Extraction job completed successfully',
        results
      });
    }
  } catch (error) {
    logger.error(`Manual extraction failed: ${error.message}`, error);
    
    // Log the error
    await run(
      `INSERT INTO AUDIT_LOG (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'MANUAL_EXTRACTION_ERROR', 'extraction', null, JSON.stringify({ error: error.message, date: req.body.date })]
    );
    
    // Update last extraction setting
    // Get the latest date with content
    const latestDateResult = await query(
      `SELECT MAX(publication_date) as latest FROM ARTICLE`
    );
    
    const latestDate = req.body.date || (latestDateResult.length > 0 ? latestDateResult[0].latest : new Date().toISOString().split('T')[0]);
    
    await run(
      `UPDATE SETTINGS SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'last_extraction'`,
      [JSON.stringify({
        timestamp: new Date().toISOString(),
        success: false,
        date: latestDate,
        error: error.message,
        user: req.user.username,
        isReExtraction: !!req.body.date
      })]
    );
    
    next(error);
  }
});

// Update setting
router.put('/settings/:key', async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    
    // Check if setting exists
    const setting = await get(`SELECT * FROM SETTINGS WHERE key = ?`, [key]);
    
    if (!setting) {
      // Create new setting
      await run(
        `INSERT INTO SETTINGS (key, value, description) VALUES (?, ?, ?)`,
        [key, value, description]
      );
      
      logger.info(`Setting "${key}" created by ${req.user.username}`);
    } else {
      // Update existing setting
      await run(
        `UPDATE SETTINGS SET value = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?`,
        [value, description || setting.description, key]
      );
      
      logger.info(`Setting "${key}" updated by ${req.user.username}`);
    }
    
    res.json({
      key,
      value,
      description: description || (setting ? setting.description : null),
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Error updating setting ${req.params.key}:`, error);
    next(error);
  }
});

module.exports = router;