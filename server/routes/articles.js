const express = require('express');
const router = express.Router();
const { query, get, run } = require('../database');

// Get article by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get article data
    const article = await get(
      `SELECT * FROM ARTICLE WHERE id = ?`,
      [id]
    );
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    // Get associated images
    const images = await query(
      `SELECT * FROM IMAGE WHERE article_id = ?`,
      [id]
    );
    
    // Return article with images
    res.json({
      ...article,
      images: images || []
    });
  } catch (error) {
    next(error);
  }
});

// Get related articles
router.get('/:id/related', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get the section of the current article
    const article = await get(
      `SELECT section_id FROM ARTICLE WHERE id = ?`,
      [id]
    );
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }
    
    // Get related articles from the same section
    const relatedArticles = await query(
      `SELECT id, title, summary, source, publication_date 
       FROM ARTICLE 
       WHERE section_id = ? AND id != ? 
       ORDER BY publication_date DESC 
       LIMIT 5`,
      [article.section_id, id]
    );
    
    res.json(relatedArticles);
  } catch (error) {
    next(error);
  }
});

module.exports = router;