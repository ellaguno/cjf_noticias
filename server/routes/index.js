const express = require('express');
const router = express.Router();
const { query } = require('../database');

// Import route modules
const articleRoutes = require('./articles');
const sectionRoutes = require('./sections');
const archiveRoutes = require('./archive');
const searchRoutes = require('./search');
const adminRoutes = require('./admin');
const statusRoutes = require('./status');
const externalSourcesRoutes = require('./external-sources');

// Mount routes
router.use('/articles', articleRoutes);
router.use('/sections', sectionRoutes);
router.use('/archive', archiveRoutes);
router.use('/search', searchRoutes);
router.use('/admin', adminRoutes);
router.use('/status', statusRoutes);
router.use('/external-sources', externalSourcesRoutes);

// New endpoint for latest articles
router.get('/latest-articles', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const articles = await query(
      `SELECT id, title, summary, source, publication_date, section_id 
       FROM ARTICLE 
       ORDER BY publication_date DESC, id DESC 
       LIMIT ?`,
      [limit]
    );
    res.json({ articles });
  } catch (error) {
    console.error('Error fetching latest articles:', error);
    next(error);
  }
});

// Existing latest news endpoint (summary)
router.get('/latest', async (req, res, next) => {
  try {
    const latestArticleDate = await query(
      `SELECT MAX(publication_date) as latest FROM ARTICLE`
    );
    const latestImageDate = await query(
      `SELECT MAX(publication_date) as latest FROM IMAGE`
    );
    const today = new Date().toISOString().split('T')[0];
    let latestDate = null;

    if (latestArticleDate && latestArticleDate[0] && latestArticleDate[0].latest) {
      latestDate = latestArticleDate[0].latest;
    }
    if (latestImageDate && latestImageDate[0] && latestImageDate[0].latest) {
      if (!latestDate || latestImageDate[0].latest > latestDate) {
        latestDate = latestImageDate[0].latest;
      }
    }
    const date = latestDate || today;

    const sectionIds = [
      'ocho-columnas', 'primeras-planas', 'columnas-politicas',
      'informacion-general', 'cartones', 'suprema-corte',
      'tribunal-electoral', 'dof', 'consejo-judicatura', 'external-news'
    ];
    const sectionNames = {
      'ocho-columnas': 'Ocho Columnas',
      'primeras-planas': 'Primeras Planas',
      'columnas-politicas': 'Columnas Políticas',
      'informacion-general': 'Información General',
      'cartones': 'Cartones',
      'suprema-corte': 'Suprema Corte de Justicia de la Nación',
      'tribunal-electoral': 'Tribunal Electoral del Poder Judicial de la Federación',
      'dof': 'DOF (Diario Oficial)',
      'consejo-judicatura': 'Consejo de la Judicatura Federal',
      'external-news': 'Noticias Externas'
    };

    const sections = [];
    for (const sectionId of sectionIds) {
      const articleCount = await query(
        `SELECT COUNT(*) as count FROM ARTICLE WHERE section_id = ? AND publication_date = ?`,
        [sectionId, date]
      );
      const imageCount = await query(
        `SELECT COUNT(*) as count FROM IMAGE WHERE section_id = ? AND publication_date = ?`,
        [sectionId, date]
      );
      const count = (articleCount[0]?.count || 0) + (imageCount[0]?.count || 0);
      sections.push({ id: sectionId, name: sectionNames[sectionId], count });
    }

    const totalArticles = await query(
      `SELECT COUNT(*) as count FROM ARTICLE WHERE publication_date = ?`, [date]
    );
    const totalImages = await query(
      `SELECT COUNT(*) as count FROM IMAGE WHERE publication_date = ?`, [date]
    );

    res.json({
      date,
      sections,
      totals: {
        articles: totalArticles[0]?.count || 0,
        images: totalImages[0]?.count || 0
      }
    });
  } catch (error) {
    console.error('Error fetching latest news summary:', error);
    next(error);
  }
});

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'CJF Noticias API',
    version: '1.0.0',
    description: 'API for the CJF Judicial News Portal',
  });
});

module.exports = router;