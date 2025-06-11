const express = require('express');
const router = express.Router();
const { query, get, run } = require('../database');

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

// Latest news endpoint
router.get('/latest', async (req, res, next) => {
  try {
    console.log('Fetching latest news from database');
    
    // Get the latest date with content from both ARTICLE and IMAGE tables
    const latestArticleDate = await query(
      `SELECT MAX(publication_date) as latest FROM ARTICLE`
    );
    
    const latestImageDate = await query(
      `SELECT MAX(publication_date) as latest FROM IMAGE`
    );
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    
    // Determine the latest date across both tables
    let latestDate = null;
    
    if (latestArticleDate && latestArticleDate[0] && latestArticleDate[0].latest) {
      latestDate = latestArticleDate[0].latest;
    }
    
    if (latestImageDate && latestImageDate[0] && latestImageDate[0].latest) {
      // If we have an image date and it's newer than the article date (or we don't have an article date)
      if (!latestDate || latestImageDate[0].latest > latestDate) {
        latestDate = latestImageDate[0].latest;
      }
    }
    
    // Use the latest date from the database, or today's date if no data is available
    const date = latestDate || today;
    
    console.log(`Using date: ${date} (today: ${today}, latest from DB: ${latestDate?.latest})`);
    
    console.log(`Latest content date: ${date}`);
    
    // Define the sections
    const sectionIds = [
      'ocho-columnas', 'primeras-planas', 'columnas-politicas',
      'informacion-general', 'cartones', 'suprema-corte',
      'tribunal-electoral', 'dof', 'consejo-judicatura', 'external-news'
    ];
    
    // Get section names
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
    
    // Get article counts for each section
    const sections = [];
    
    for (const sectionId of sectionIds) {
      // Count articles in this section for the latest date
      const articleCount = await query(
        `SELECT COUNT(*) as count FROM ARTICLE WHERE section_id = ? AND publication_date = ?`,
        [sectionId, date]
      );
      
      // Count images in this section for the latest date
      const imageCount = await query(
        `SELECT COUNT(*) as count FROM IMAGE WHERE section_id = ? AND publication_date = ?`,
        [sectionId, date]
      );
      
      // Ensure we're properly accessing the count from the query results
      const articleCountValue = articleCount && articleCount[0] ? articleCount[0].count : 0;
      const imageCountValue = imageCount && imageCount[0] ? imageCount[0].count : 0;
      
      const count = articleCountValue + imageCountValue;
      
      console.log(`Section ${sectionId}: ${count} items (${articleCountValue} articles, ${imageCountValue} images)`);
      
      sections.push({
        id: sectionId,
        name: sectionNames[sectionId],
        count
      });
    }
    
    // Get total counts
    const totalArticles = await query(
      `SELECT COUNT(*) as count FROM ARTICLE WHERE publication_date = ?`,
      [date]
    );
    
    const totalImages = await query(
      `SELECT COUNT(*) as count FROM IMAGE WHERE publication_date = ?`,
      [date]
    );
    
    // Ensure we're properly accessing the count from the query results
    const totalArticlesCount = totalArticles && totalArticles[0] ? totalArticles[0].count : 0;
    const totalImagesCount = totalImages && totalImages[0] ? totalImages[0].count : 0;
    
    console.log(`Total for ${date}: ${totalArticlesCount} articles, ${totalImagesCount} images`);
    
    res.json({
      date,
      sections,
      totals: {
        articles: totalArticlesCount,
        images: totalImagesCount
      }
    });
  } catch (error) {
    console.error('Error fetching latest news:', error);
    next(error);
  }
});

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'CJF Noticias API',
    version: '1.0.0',
    description: 'API for the CJF Judicial News Portal',
    endpoints: [
      { path: '/api/latest', description: 'Get latest news' },
      { path: '/api/articles/:id', description: 'Get article by ID' },
      { path: '/api/sections/:sectionId', description: 'Get content for a specific section' },
      { path: '/api/sections/:sectionId/preview', description: 'Get preview content for a section' },
      { path: '/api/archive/:date', description: 'Get archived news for a specific date' },
      { path: '/api/archive/dates', description: 'Get available archive dates' },
      { path: '/api/search', description: 'Search articles' },
      { path: '/api/status', description: 'Get system status information' },
      { path: '/api/status/health', description: 'Health check endpoint for monitoring' },
      
      // Admin endpoints
      { path: '/api/admin/logs', description: 'Get application logs (admin only)' },
      { path: '/api/admin/logs/stats', description: 'Get log statistics (admin only)' },
      { path: '/api/admin/users', description: 'Manage users (admin only)' },
      { path: '/api/admin/articles', description: 'Manage articles (admin only)' },
      { path: '/api/admin/settings', description: 'Manage application settings (admin only)' },
      
      // Extraction endpoints
      { path: '/api/admin/extraction/status', description: 'Get extraction status (admin only)' },
      { path: '/api/admin/extraction/logs', description: 'Get extraction logs (admin only)' },
      { path: '/api/admin/extraction/run', description: 'Trigger manual extraction (admin only)' }
    ]
  });
});

module.exports = router;