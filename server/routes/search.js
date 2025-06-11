const express = require('express');
const router = express.Router();
const { query } = require('../database');

// Search articles
router.get('/', async (req, res, next) => {
  try {
    const { q, section, from, to, limit = 20, offset = 0 } = req.query;
    
    if (!q && !section && !from && !to) {
      return res.status(400).json({ error: 'At least one search parameter is required' });
    }
    
    // Build query conditions
    const conditions = [];
    const params = [];
    
    if (q) {
      conditions.push('(title LIKE ? OR content LIKE ? OR summary LIKE ?)');
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (section) {
      conditions.push('section_id = ?');
      params.push(section);
    }
    
    if (from) {
      conditions.push('publication_date >= ?');
      params.push(from);
    }
    
    if (to) {
      conditions.push('publication_date <= ?');
      params.push(to);
    }
    
    // Get articles matching search criteria
    const articles = await query(
      `SELECT id, title, summary, source, section_id, publication_date 
       FROM ARTICLE 
       WHERE ${conditions.join(' AND ')} 
       ORDER BY publication_date DESC 
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    
    // Get total count for pagination
    const countResult = await query(
      `SELECT COUNT(*) as total FROM ARTICLE WHERE ${conditions.join(' AND ')}`,
      params
    );
    
    const total = countResult.length > 0 ? countResult[0].total : 0;
    
    // Return search results
    res.json({
      query: q,
      section,
      from,
      to,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      results: articles
    });
  } catch (error) {
    next(error);
  }
});

// Search images
router.get('/images', async (req, res, next) => {
  try {
    const { q, section, from, to, limit = 20, offset = 0 } = req.query;
    
    if (!q && !section && !from && !to) {
      return res.status(400).json({ error: 'At least one search parameter is required' });
    }
    
    // Build query conditions
    const conditions = [];
    const params = [];
    
    if (q) {
      conditions.push('(title LIKE ? OR description LIKE ?)');
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm);
    }
    
    if (section) {
      conditions.push('section_id = ?');
      params.push(section);
    }
    
    if (from) {
      conditions.push('publication_date >= ?');
      params.push(from);
    }
    
    if (to) {
      conditions.push('publication_date <= ?');
      params.push(to);
    }
    
    // Get images matching search criteria
    const images = await query(
      `SELECT id, filename, title, description, section_id, publication_date 
       FROM IMAGE 
       WHERE ${conditions.join(' AND ')} 
       ORDER BY publication_date DESC 
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    
    // Get total count for pagination
    const countResult = await query(
      `SELECT COUNT(*) as total FROM IMAGE WHERE ${conditions.join(' AND ')}`,
      params
    );
    
    const total = countResult.length > 0 ? countResult[0].total : 0;
    
    // Return search results
    res.json({
      query: q,
      section,
      from,
      to,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      results: images
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;