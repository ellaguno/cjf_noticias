const express = require('express');
const router = express.Router();
const { query } = require('../database');

// Get available archive dates
router.get('/dates', async (req, res, next) => {
  try {
    // Get distinct publication dates
    const dates = await query(
      `SELECT DISTINCT publication_date FROM ARTICLE ORDER BY publication_date DESC`
    );
    
    res.json(dates.map(row => row.publication_date));
  } catch (error) {
    next(error);
  }
});

// Get archived news for a specific date
router.get('/:date', async (req, res, next) => {
  try {
    const { date } = req.params;
    
    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }
    
    // Get articles for the date
    const articles = await query(
      `SELECT id, title, summary, source, section_id FROM ARTICLE WHERE publication_date = ? ORDER BY section_id`,
      [date]
    );
    
    // Get images for the date
    const images = await query(
      `SELECT id, title, filename, NULL as source, section_id FROM IMAGE WHERE publication_date = ? AND article_id IS NULL ORDER BY section_id`,
      [date]
    );
    
    // Make sure image URLs are correct
    const processedImages = images.map(image => ({
      ...image,
      filename: image.filename
    }));
    
    // Group by section
    const sectionIds = [
      'ocho-columnas', 'primeras-planas', 'columnas-politicas',
      'informacion-general', 'cartones', 'suprema-corte',
      'tribunal-electoral', 'dof', 'consejo-judicatura'
    ];
    
    // Create an array of sections with their content
    const sections = sectionIds.map(sectionId => {
      const sectionArticles = articles.filter(a => a.section_id === sectionId);
      const sectionImages = processedImages.filter(i => i.section_id === sectionId);
      
      // Format section name
      let name = sectionId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      
      // Special cases for longer names
      if (sectionId === 'suprema-corte') name = 'Suprema Corte de Justicia de la Nación';
      if (sectionId === 'tribunal-electoral') name = 'Tribunal Electoral del Poder Judicial de la Federación';
      if (sectionId === 'consejo-judicatura') name = 'Consejo de la Judicatura Federal';
      if (sectionId === 'dof') name = 'DOF (Diario Oficial)';
      
      return {
        id: sectionId,
        name: name,
        count: sectionArticles.length + sectionImages.length,
        articles: sectionArticles,
        images: sectionImages
      };
    });
    
    res.json({
      date,
      sections: sections
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;