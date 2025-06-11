const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { query, get, run } = require('../database');
const {
  authenticate,
  authorize,
  csrfProtection,
  loginRateLimiter,
  resetLoginAttempts
} = require('../src/middleware/auth');
const {
  authenticateUser,
  createUser,
  generateToken,
  hashPassword
} = require('../src/utils/auth');
const crypto = require('crypto');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../storage/uploads');
    
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
    ).catch(err => console.error('Error logging action:', err));
    
    originalSend.call(this, data);
  };
  
  next();
};

// Authentication routes (public)
// These routes should be defined BEFORE the authentication middleware
router.post('/login', loginRateLimiter, async (req, res, next) => {
  const logger = require('../src/utils/logger').createLogger('auth');
  logger.debug('Login attempt received', { username: req.body.username });
  
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      logger.warn('Login failed: Missing username or password');
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    logger.debug('Authenticating user', { username });
    const auth = await authenticateUser(username, password);
    logger.info('User authenticated successfully', { userId: auth.user.id, username: auth.user.username });
    
    // Generate CSRF token
    const csrfToken = crypto.randomBytes(20).toString('hex');
    logger.debug('Generated CSRF token');
    
    // Set secure cookie with JWT token
    res.cookie('token', auth.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    logger.debug('Set auth token cookie');
    
    // Reset login attempts on successful login
    resetLoginAttempts(req, res, () => {});
    
    // Send response with token in body as well for client-side storage
    res.json({
      user: auth.user,
      token: auth.token,
      csrfToken
    });
    logger.info('Login successful, response sent', { userId: auth.user.id });
  } catch (error) {
    logger.error('Login failed', { error: error.message, stack: error.stack });
    res.status(401).json({ error: error.message });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Apply authentication middleware to all protected routes below this point
router.use(authenticate);
router.use(csrfProtection);
router.use(logAction);

// User management routes (admin only)
router.get('/users', authorize(['admin']), async (req, res, next) => {
  try {
    const users = await query(`SELECT id, username, email, role, created_at, updated_at FROM USER`);
    res.json(users);
  } catch (error) {
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
    res.status(201).json(user);
  } catch (error) {
    if (error.message === 'Username already exists') {
      return res.status(409).json({ error: error.message });
    }
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
    
    res.json(updatedUser);
  } catch (error) {
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
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
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
    const { limit = 20, offset = 0, section, date, search } = req.query;
    
    // Build query conditions
    const conditions = [];
    const params = [];
    
    if (section) {
      conditions.push('ARTICLE.section_id = ?');
      params.push(section);
    }
    
    if (date) {
      conditions.push('ARTICLE.publication_date = ?');
      params.push(date);
    }
    
    if (search) {
      conditions.push('(ARTICLE.title LIKE ? OR ARTICLE.content LIKE ? OR ARTICLE.summary LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Get articles with associated images
    const articles = await query(
      `SELECT 
        ARTICLE.*,
        GROUP_CONCAT(IMAGE.filename) as image_filenames,
        GROUP_CONCAT(IMAGE.id) as image_ids
       FROM ARTICLE 
       LEFT JOIN IMAGE ON ARTICLE.id = IMAGE.article_id 
       ${whereClause} 
       GROUP BY ARTICLE.id 
       ORDER BY ARTICLE.publication_date DESC, ARTICLE.id DESC 
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    
    // Process articles to include images array
    const processedArticles = articles.map(article => {
      const images = [];
      if (article.image_filenames) {
        const filenames = article.image_filenames.split(',');
        const ids = article.image_ids.split(',');
        for (let i = 0; i < filenames.length; i++) {
          let imageUrl = filenames[i];
          // Add /storage prefix if not already present
          if (!imageUrl.startsWith('/storage') && !imageUrl.startsWith('http')) {
            imageUrl = `/storage${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;
          }
          images.push({
            id: ids[i],
            filename: filenames[i],
            url: imageUrl
          });
        }
      }
      
      // Remove the concatenated fields and add images array
      const { image_filenames, image_ids, ...cleanArticle } = article;
      return {
        ...cleanArticle,
        images
      };
    });
    
    // Get total count for pagination
    const countResult = await query(
      `SELECT COUNT(DISTINCT ARTICLE.id) as total FROM ARTICLE 
       LEFT JOIN IMAGE ON ARTICLE.id = IMAGE.article_id 
       ${whereClause}`,
      params
    );
    
    const total = countResult.length > 0 ? countResult[0].total : 0;
    
    res.json({
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      articles: processedArticles
    });
  } catch (error) {
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
    
    res.json({ message: 'Article deleted successfully' });
  } catch (error) {
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
    const filePath = path.join(__dirname, '../../storage/uploads', image.filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Delete image record
    await run(`DELETE FROM IMAGE WHERE id = ?`, [id]);
    
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
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
    next(error);
  }
});

// EXTRACTION ROUTES

// Get extraction status
router.get('/extraction/status', async (req, res, next) => {
  try {
    // Get the latest extraction status from settings
    const lastExtraction = await get(`SELECT value FROM SETTINGS WHERE key = 'last_extraction'`);
    const nextExtraction = await get(`SELECT value FROM SETTINGS WHERE key = 'extraction_time'`);
    
    res.json({
      lastExtraction: lastExtraction ? JSON.parse(lastExtraction.value) : null,
      nextExtraction: nextExtraction ? nextExtraction.value : null
    });
  } catch (error) {
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
      ORDER BY timestamp DESC
      LIMIT 50
    `);
    
    res.json(logs);
  } catch (error) {
    next(error);
  }
});

// Trigger manual extraction
router.post('/extraction/run', authorize(['admin', 'editor']), async (req, res, next) => {
  try {
    // Import the scheduler service
    const { runExtractionJob } = require('../src/services/scheduler/scheduler');
    const logger = require('../src/utils/logger').createLogger('admin');
    
    // Log the extraction request
    await run(
      `INSERT INTO AUDIT_LOG (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'MANUAL_EXTRACTION_STARTED', 'extraction', null, JSON.stringify({
        timestamp: new Date().toISOString(),
        user: req.user.username
      })]
    );
    
    // Update extraction status to "in progress"
    await run(
      `UPDATE SETTINGS SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'last_extraction'`,
      [JSON.stringify({
        timestamp: new Date().toISOString(),
        status: 'in_progress',
        user: req.user.username
      })]
    );
    
    // Respond immediately to the client
    res.json({
      success: true,
      message: 'Extraction job started successfully',
      status: 'in_progress'
    });
    
    // Run the extraction job asynchronously
    runExtractionJob()
      .then(async (results) => {
        logger.info('Extraction job completed successfully');
        
        // Log the successful extraction
        await run(
          `INSERT INTO AUDIT_LOG (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
          [req.user.id, 'MANUAL_EXTRACTION_COMPLETED', 'extraction', null, JSON.stringify(results)]
        );
        
        // Update extraction status to "completed"
        await run(
          `UPDATE SETTINGS SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'last_extraction'`,
          [JSON.stringify({
            timestamp: new Date().toISOString(),
            status: 'completed',
            success: true,
            user: req.user.username
          })]
        );
      })
      .catch(async (error) => {
        logger.error(`Extraction job failed: ${error.message}`);
        
        // Log the error
        await run(
          `INSERT INTO AUDIT_LOG (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
          [req.user.id, 'MANUAL_EXTRACTION_ERROR', 'extraction', null, JSON.stringify({ error: error.message })]
        );
        
        // Update extraction status to "failed"
        await run(
          `UPDATE SETTINGS SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'last_extraction'`,
          [JSON.stringify({
            timestamp: new Date().toISOString(),
            status: 'failed',
            success: false,
            error: error.message,
            user: req.user.username
          })]
        );
      });
  } catch (error) {
    // Log the error
    await run(
      `INSERT INTO AUDIT_LOG (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'MANUAL_EXTRACTION_ERROR', 'extraction', null, JSON.stringify({ error: error.message })]
    );
    
    // Update last extraction setting
    await run(
      `UPDATE SETTINGS SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = 'last_extraction'`,
      [JSON.stringify({
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message,
        user: req.user.username
      })]
    );
    
    next(error);
  }
});

// Delete content by date
router.delete('/extraction/content/:date', authorize(['admin']), async (req, res, next) => {
  try {
    const { date } = req.params;
    const logger = require('../src/utils/logger').createLogger('admin');
    
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    
    // Log the deletion request
    await run(
      `INSERT INTO AUDIT_LOG (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'CONTENT_DELETION_STARTED', 'extraction', null, JSON.stringify({
        date,
        timestamp: new Date().toISOString(),
        user: req.user.username
      })]
    );
    
    // Start transaction
    await run('BEGIN TRANSACTION');
    
    try {
      // 1. Count articles to be deleted
      const articlesCount = await get(
        `SELECT COUNT(*) as count FROM ARTICLE WHERE publication_date = ?`,
        [date]
      );
      
      // 2. Count images to be deleted
      const imagesCount = await get(
        `SELECT COUNT(*) as count FROM IMAGE WHERE publication_date = ?`,
        [date]
      );
      
      // 3. Get list of image filenames to delete from filesystem
      const images = await query(
        `SELECT filename FROM IMAGE WHERE publication_date = ?`,
        [date]
      );
      
      // 4. Delete articles for the date
      const articlesResult = await run(
        `DELETE FROM ARTICLE WHERE publication_date = ?`,
        [date]
      );
      
      // 5. Delete images for the date
      const imagesResult = await run(
        `DELETE FROM IMAGE WHERE publication_date = ?`,
        [date]
      );
      
      // 6. Delete image files from filesystem
      const fs = require('fs');
      const path = require('path');
      const imageDir = path.join(__dirname, `../../storage/images/${date}`);
      
      if (fs.existsSync(imageDir)) {
        try {
          // Delete all files in the directory
          const files = fs.readdirSync(imageDir);
          for (const file of files) {
            fs.unlinkSync(path.join(imageDir, file));
          }
          
          // Delete the directory itself
          fs.rmdirSync(imageDir);
          logger.info(`Deleted image directory for date: ${date}`);
        } catch (fsError) {
          logger.error(`Error deleting image files: ${fsError.message}`);
          // Continue with the transaction even if file deletion fails
        }
      }
      
      // Commit transaction
      await run('COMMIT');
      
      // Log successful deletion
      await run(
        `INSERT INTO AUDIT_LOG (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
        [req.user.id, 'CONTENT_DELETION_COMPLETED', 'extraction', null, JSON.stringify({
          date,
          articlesDeleted: articlesCount.count,
          imagesDeleted: imagesCount.count,
          timestamp: new Date().toISOString()
        })]
      );
      
      // Return success response
      res.json({
        success: true,
        date,
        articlesDeleted: articlesCount.count,
        imagesDeleted: imagesCount.count
      });
    } catch (error) {
      // Rollback transaction on error
      await run('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error(`Content deletion failed: ${error.message}`);
    
    // Log the error
    await run(
      `INSERT INTO AUDIT_LOG (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, 'CONTENT_DELETION_ERROR', 'extraction', null, JSON.stringify({
        date: req.params.date,
        error: error.message,
        timestamp: new Date().toISOString()
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
    } else {
      // Update existing setting
      await run(
        `UPDATE SETTINGS SET value = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?`,
        [value, description || setting.description, key]
      );
    }
    
    res.json({
      key,
      value,
      description: description || (setting ? setting.description : null),
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;