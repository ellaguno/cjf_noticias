const express = require('express');
const router = express.Router();
const { query } = require('../database');

// Get all sections
router.get('/', async (req, res, next) => {
  try {
    // Define the sections
    const baseSections = [
      { id: 'ocho-columnas', name: 'Ocho Columnas' },
      { id: 'primeras-planas', name: 'Primeras Planas' },
      { id: 'columnas-politicas', name: 'Columnas Políticas' },
      { id: 'informacion-general', name: 'Información General' },
      { id: 'cartones', name: 'Cartones' },
      { id: 'suprema-corte', name: 'Suprema Corte de Justicia de la Nación' },
      { id: 'tribunal-electoral', name: 'Tribunal Electoral del Poder Judicial de la Federación' },
      { id: 'dof', name: 'DOF (Diario Oficial)' },
      { id: 'consejo-judicatura', name: 'Consejo de la Judicatura Federal' },
      { id: 'agenda', name: 'Agenda' },
      { id: 'sintesis-informativa', name: 'Síntesis Informativa' },
      { id: 'ultimas-noticias', name: 'Últimas Noticias' }
    ];
    
    // Get article counts for each section
    const sectionsWithCounts = await Promise.all(
      baseSections.map(async (section) => {
        try {
          const result = await query(
            'SELECT COUNT(*) as count FROM ARTICLE WHERE section_id = ?',
            [section.id]
          );
          
          return {
            ...section,
            articleCount: result[0]?.count || 0
          };
        } catch (error) {
          console.error(`Error getting article count for section ${section.id}:`, error);
          return {
            ...section,
            articleCount: 0
          };
        }
      })
    );
    
    // Return sections with article counts
    res.json(sectionsWithCounts);
  } catch (error) {
    next(error);
  }
});

// Get content for a specific section
router.get('/:sectionId', async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { date } = req.query;
    
    // Validate section ID
    const validSections = [
      'ocho-columnas', 'primeras-planas', 'columnas-politicas', 
      'informacion-general', 'cartones', 'suprema-corte', 
      'tribunal-electoral', 'dof', 'consejo-judicatura', 'external-news',
      'ultimas-noticias'
    ];
    
    if (!validSections.includes(sectionId)) {
      return res.status(404).json({ error: 'Section not found' });
    }
    
    // Handle external-news and ultimas-noticias sections differently
    if (sectionId === 'external-news' || sectionId === 'ultimas-noticias') {
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      
      // Get external articles
      const articles = await query(
        `SELECT * FROM ARTICLE WHERE section_id = ?
         ORDER BY created_at DESC LIMIT ?`,
        [sectionId, limit]
      );
      
      return res.json({
        section: sectionId,
        date: new Date().toISOString().split('T')[0],
        articles,
        images: []
      });
    }
    
    // Build query conditions
    const conditions = ['section_id = ?'];
    const params = [sectionId];
    
    if (date) {
      conditions.push('publication_date = ?');
      params.push(date);
    } else {
      // Default to latest date from both ARTICLE and IMAGE tables
      conditions.push(`publication_date = (
        SELECT MAX(date) FROM (
          SELECT MAX(publication_date) as date FROM ARTICLE
          UNION
          SELECT MAX(publication_date) as date FROM IMAGE
        )
      )`);
    }
    
    // Get articles for the section
    const articles = await query(
      `SELECT * FROM ARTICLE WHERE ${conditions.join(' AND ')} ORDER BY id DESC`,
      params
    );
    
    // For image sections, also get images associated with articles
    let images = [];
    
    if (['primeras-planas', 'cartones', 'columnas-politicas'].includes(sectionId)) {
      // For image sections, get all images for the section
      images = await query(
        `SELECT * FROM IMAGE WHERE section_id = ? ${
          date ? 'AND publication_date = ?' : `AND publication_date = (
            SELECT MAX(date) FROM (
              SELECT MAX(publication_date) as date FROM ARTICLE
              UNION
              SELECT MAX(publication_date) as date FROM IMAGE
            )
          )`
        }`,
        date ? [sectionId, date] : [sectionId]
      );
    } else {
      // For non-image sections, only get unassociated images
      images = await query(
        `SELECT * FROM IMAGE WHERE article_id IS NULL AND section_id = ? ${
          date ? 'AND publication_date = ?' : `AND publication_date = (
            SELECT MAX(date) FROM (
              SELECT MAX(publication_date) as date FROM ARTICLE
              UNION
              SELECT MAX(publication_date) as date FROM IMAGE
            )
          )`
        }`,
        date ? [sectionId, date] : [sectionId]
      );
    }
    
    // Add /storage prefix to image URLs
    const processedImages = images.map(image => ({
      ...image,
      filename: `/storage${image.filename.startsWith('/') ? image.filename : '/' + image.filename}`
    }));
    
    // Return section content
    res.json({
      section: sectionId,
      date: date || (articles.length > 0 ? articles[0].publication_date : new Date().toISOString().split('T')[0]),
      articles,
      images: processedImages
    });
  } catch (error) {
    next(error);
  }
});

// Get preview content for a section
router.get('/:sectionId/preview', async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    
    // Validate section ID
    const validSections = [
      'ocho-columnas', 'primeras-planas', 'columnas-politicas', 
      'informacion-general', 'cartones', 'suprema-corte', 
      'tribunal-electoral', 'dof', 'consejo-judicatura', 'external-news',
      'ultimas-noticias'
    ];
    
    if (!validSections.includes(sectionId)) {
      return res.status(404).json({ error: 'Section not found' });
    }
    
    // Handle external-news and ultimas-noticias sections differently
    if (sectionId === 'external-news' || sectionId === 'ultimas-noticias') {
      const limit = 10; // Preview limit
      
      // Get external articles
      const articles = await query(
        `SELECT * FROM ARTICLE WHERE section_id = ?
         ORDER BY created_at DESC LIMIT ?`,
        [sectionId, limit]
      );
      
      // Convert to unified format for preview
      const items = articles.map(article => ({
        ...article,
        type: 'article'
      }));
      
      return res.json({
        section: sectionId,
        date: new Date().toISOString().split('T')[0],
        items
      });
    }
    
    // Get the latest date with content from both ARTICLE and IMAGE tables
    const latestArticleDate = await query(
      `SELECT MAX(publication_date) as latest FROM ARTICLE`
    );
    
    const latestImageDate = await query(
      `SELECT MAX(publication_date) as latest FROM IMAGE`
    );
    
    // Determine the latest date across both tables
    let latestDate = null;
    
    if (latestArticleDate.length > 0 && latestArticleDate[0].latest) {
      latestDate = latestArticleDate[0].latest;
    }
    
    if (latestImageDate.length > 0 && latestImageDate[0].latest) {
      // If we have an image date and it's newer than the article date (or we don't have an article date)
      if (!latestDate || latestImageDate[0].latest > latestDate) {
        latestDate = latestImageDate[0].latest;
      }
    }
    
    // Use the latest date from the database, or today's date if no data is available
    const date = latestDate || new Date().toISOString().split('T')[0];
    
    console.log(`Section preview for ${sectionId} using date: ${date}`);
    
    // Get preview items based on section type
    let items = [];
    
    if (['primeras-planas', 'cartones', 'columnas-politicas'].includes(sectionId)) {
      // For image-based sections
      items = await query(
        `SELECT id, title, filename as imageUrl, NULL as source, publication_date as date, 'image' as type
         FROM IMAGE
         WHERE section_id = ? AND publication_date = ?
         LIMIT 5`,
        [sectionId, date]
      );
      
      // Make sure image URLs are correct by adding the /storage prefix
      items = items.map(item => ({
        ...item,
        imageUrl: `/storage${item.imageUrl.startsWith('/') ? item.imageUrl : '/' + item.imageUrl}`
      }));
    } else {
      // For article-based sections
      items = await query(
        `SELECT a.id, a.title, a.summary, a.source, a.publication_date as date, 'article' as type,
                (SELECT filename FROM IMAGE WHERE article_id = a.id LIMIT 1) as imageUrl
         FROM ARTICLE a
         WHERE a.section_id = ? AND a.publication_date = ? 
         LIMIT 5`,
        [sectionId, date]
      );
    }
    
    // Return preview items
    res.json({
      section: sectionId,
      date,
      items
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;