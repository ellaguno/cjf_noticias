const express = require('express');
const { query, run, get } = require('../database');
const ExternalNewsFetcher = require('../src/services/external-news-fetcher');
const router = express.Router();

// Get all external sources
router.get('/', async (req, res) => {
  try {
    const sources = await query('SELECT * FROM EXTERNAL_SOURCES ORDER BY name');
    res.json({ success: true, data: sources });
  } catch (error) {
    console.error('Error fetching external sources:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get single external source
router.get('/:id', async (req, res) => {
  try {
    const source = await get('SELECT * FROM EXTERNAL_SOURCES WHERE id = ?', [req.params.id]);
    if (!source) {
      return res.status(404).json({ success: false, error: 'Source not found' });
    }
    res.json({ success: true, data: source });
  } catch (error) {
    console.error('Error fetching external source:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new external source
router.post('/', async (req, res) => {
  try {
    const { name, base_url, rss_url, logo_url, api_key, fetch_frequency } = req.body;
    
    if (!name || !base_url) {
      return res.status(400).json({ success: false, error: 'Name and base_url are required' });
    }

    const result = await run(
      `INSERT INTO EXTERNAL_SOURCES (name, base_url, rss_url, logo_url, api_key, fetch_frequency) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, base_url, rss_url || null, logo_url || null, api_key || null, fetch_frequency || 60]
    );

    const newSource = await get('SELECT * FROM EXTERNAL_SOURCES WHERE id = ?', [result.lastID]);
    res.status(201).json({ success: true, data: newSource });
  } catch (error) {
    console.error('Error creating external source:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update external source
router.put('/:id', async (req, res) => {
  try {
    const { name, base_url, rss_url, logo_url, api_key, is_active, fetch_frequency } = req.body;
    
    if (!name || !base_url) {
      return res.status(400).json({ success: false, error: 'Name and base_url are required' });
    }

    const result = await run(
      `UPDATE EXTERNAL_SOURCES 
       SET name = ?, base_url = ?, rss_url = ?, logo_url = ?, api_key = ?, 
           is_active = ?, fetch_frequency = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, base_url, rss_url || null, logo_url || null, api_key || null, 
       is_active !== undefined ? is_active : 1, fetch_frequency || 60, req.params.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Source not found' });
    }

    const updatedSource = await get('SELECT * FROM EXTERNAL_SOURCES WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: updatedSource });
  } catch (error) {
    console.error('Error updating external source:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete external source
router.delete('/:id', async (req, res) => {
  try {
    const result = await run('DELETE FROM EXTERNAL_SOURCES WHERE id = ?', [req.params.id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Source not found' });
    }

    res.json({ success: true, message: 'Source deleted successfully' });
  } catch (error) {
    console.error('Error deleting external source:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Toggle source active status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const source = await get('SELECT * FROM EXTERNAL_SOURCES WHERE id = ?', [req.params.id]);
    if (!source) {
      return res.status(404).json({ success: false, error: 'Source not found' });
    }

    const newStatus = source.is_active ? 0 : 1;
    await run('UPDATE EXTERNAL_SOURCES SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
              [newStatus, req.params.id]);

    const updatedSource = await get('SELECT * FROM EXTERNAL_SOURCES WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: updatedSource });
  } catch (error) {
    console.error('Error toggling source status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch articles from external sources
router.post('/fetch', async (req, res) => {
  try {
    const fetcher = new ExternalNewsFetcher();
    const articles = await fetcher.fetchFromAllSources();
    
    res.json({ 
      success: true, 
      message: `Fetched ${articles.length} new articles`,
      data: articles 
    });
  } catch (error) {
    console.error('Error fetching external articles:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch articles from specific source
router.post('/:id/fetch', async (req, res) => {
  try {
    const source = await get('SELECT * FROM EXTERNAL_SOURCES WHERE id = ?', [req.params.id]);
    if (!source) {
      return res.status(404).json({ success: false, error: 'Source not found' });
    }

    const fetcher = new ExternalNewsFetcher();
    const articles = await fetcher.fetchFromSource(source);
    const savedArticles = await fetcher.saveArticles(articles);
    
    // Update last fetch time
    await run('UPDATE EXTERNAL_SOURCES SET last_fetch = CURRENT_TIMESTAMP WHERE id = ?', [source.id]);
    
    res.json({ 
      success: true, 
      message: `Fetched ${savedArticles.length} new articles from ${source.name}`,
      data: savedArticles 
    });
  } catch (error) {
    console.error('Error fetching from specific source:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;