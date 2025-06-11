/**
 * PDF Extractor for CJF Judicial News
 * 
 * This script extracts content from the daily PDF report published by the CJF
 * and stores it in the database.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const pdfParse = require('pdf-parse');
const { run, get } = require('../server/database');
const { createLogger } = require('../server/src/utils/logger');
const pdfExtractor = require('../server/src/services/pdf/pdfExtractor');
const indexExtractor = require('../server/src/services/pdf/indexExtractor');

// Create logger
const logger = createLogger('pdf-extractor-script');

// Configuration
const PDF_URL = process.env.PDF_URL || 'https://www.cjf.gob.mx/SinInformativa/resumenInformativo.pdf';
const DOWNLOAD_DIR = path.join(__dirname, '../storage/pdf');
const IMAGES_DIR = path.join(__dirname, '../storage/images');

// Ensure directories exist
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

/**
 * Download the PDF file
 * @returns {Promise<string>} Path to the downloaded file
 */
async function downloadPDF() {
  try {
    console.log(`Downloading PDF from ${PDF_URL}...`);
    
    const response = await axios({
      method: 'GET',
      url: PDF_URL,
      responseType: 'stream'
    });
    
    // Generate filename based on current date
    const date = new Date().toISOString().split('T')[0];
    const filePath = path.join(DOWNLOAD_DIR, `${date}.pdf`);
    
    // Save the file
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(filePath));
      writer.on('error', reject);
    });
  } catch (error) {
    console.error('Error downloading PDF:', error.message);
    throw error;
  }
}

/**
 * Extract content from PDF using the server implementation
 * @param {string} filePath Path to the PDF file
 * @returns {Promise<object>} Extracted content
 */
async function extractContent(filePath) {
  try {
    logger.info(`Extracting content from ${filePath}...`);
    
    // Use the server implementation to extract content
    const content = await pdfExtractor.extractContent(filePath);
    
    // Format the date consistently
    content.date = new Date().toISOString().split('T')[0];
    
    return content;
  } catch (error) {
    logger.error(`Error extracting content: ${error.message}`);
    throw error;
  }
}

/**
 * Process extracted content and store in database
 * @param {object} content Extracted content
 */
async function processContent(content) {
  try {
    logger.info('Processing extracted content...');
    
    const { date, sections, images = [] } = content;
    
    // Process each section
    for (const [sectionId, sectionContent] of Object.entries(sections)) {
      // Skip empty sections except for image-based sections
      if (!sectionContent && sectionId !== 'primeras-planas' && sectionId !== 'cartones') {
        logger.warn(`Empty content for section ${sectionId}, skipping`);
        continue;
      }
      
      logger.info(`Processing section: ${sectionId}`);
      
      // Process the section content based on its type
      switch (sectionId) {
        case 'ocho-columnas':
        case 'columnas-politicas':
        case 'informacion-general':
        case 'suprema-corte':
        case 'tribunal-electoral':
        case 'dof':
        case 'consejo-judicatura':
          await processArticleSection(sectionId, sectionContent, date);
          break;
        
        case 'primeras-planas':
        case 'cartones':
          await processImageSection(sectionId, content.images || [], date);
          break;
        
        default:
          logger.warn(`Unknown section type: ${sectionId}`);
          break;
      }
      
      logger.info(`Processed section: ${sectionId}`);
    }
    
    logger.info('Content processing completed');
  } catch (error) {
    logger.error(`Error processing content: ${error.message}`);
    throw error;
  }
}

/**
 * Process a section containing articles
 * @param {string} sectionId Section ID
 * @param {string} sectionContent Section content
 * @param {string} date Publication date
 */
async function processArticleSection(sectionId, sectionContent, date) {
  try {
    logger.info(`Processing article section: ${sectionId}`);
    
    // Split the content into articles
    // This is a simple implementation that splits by double newlines
    const articles = sectionContent.split('\n\n')
      .map(article => article.trim())
      .filter(article => article.length > 0);
    
    logger.info(`Found ${articles.length} articles in section ${sectionId}`);
    
    // Process each article
    for (const articleContent of articles) {
      // Extract title and content
      // This is a simple implementation that assumes the first line is the title
      const lines = articleContent.split('\n');
      const title = lines[0].trim();
      const content = lines.slice(1).join('\n').trim();
      
      // Create a summary (first 200 characters)
      const summary = content.length > 200
        ? content.substring(0, 200) + '...'
        : content;
      
      // Store the article in the database
      await run(
        `INSERT INTO ARTICLE (title, content, summary, source, section_id, publication_date) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          title || `Artículo de ${sectionId}`,
          content,
          summary,
          'CJF',
          sectionId,
          date
        ]
      );
      
      logger.info(`Stored article: ${title || `Artículo de ${sectionId}`}`);
    }
    
    logger.info(`Processed ${articles.length} articles in section ${sectionId}`);
  } catch (error) {
    logger.error(`Error processing article section ${sectionId}: ${error.message}`);
    throw error;
  }
}

/**
 * Process a section containing images
 * @param {string} sectionId Section ID
 * @param {Array} images Array of image paths
 * @param {string} date Publication date
 */
async function processImageSection(sectionId, images, date) {
  try {
    logger.info(`Processing image section: ${sectionId}`);
    
    // Filter images for this section
    const sectionImages = [];
    
    // For newspaper front pages (primeras-planas)
    if (sectionId === 'primeras-planas') {
      sectionImages.push(...images.filter(img => path.basename(img).startsWith('portada-')));
    }
    // For cartoons (cartones)
    else if (sectionId === 'cartones') {
      sectionImages.push(...images.filter(img => path.basename(img).startsWith('carton-')));
    }
    
    logger.info(`Found ${sectionImages.length} images for section ${sectionId}`);
    
    // Process each image
    for (let i = 0; i < sectionImages.length; i++) {
      const imagePath = sectionImages[i];
      const filename = path.basename(imagePath);
      
      // Generate a title based on the filename
      let title = '';
      let description = '';
      
      if (filename.startsWith('portada-')) {
        const newspaperName = filename
          .replace('portada-', '')
          .replace('.png', '')
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        title = `Portada de ${newspaperName}`;
        description = `Primera plana del periódico ${newspaperName}`;
      } else if (filename.startsWith('carton-')) {
        const cartoonNumber = filename.replace('carton-', '').replace('.png', '');
        title = `Cartón político ${cartoonNumber}`;
        description = `Cartón político del día ${date}`;
      } else {
        title = `Imagen ${i + 1} de ${sectionId}`;
        description = `Imagen extraída de la sección ${sectionId}`;
      }
      
      // Construct proper image URL path
      const imageUrl = `/images/${date}/${filename}`;
      
      // Store the image in the database
      await run(
        `INSERT INTO IMAGE (filename, title, description, section_id, publication_date) VALUES (?, ?, ?, ?, ?)`,
        [
          imageUrl,
          title,
          description,
          sectionId,
          date
        ]
      );
      
      logger.info(`Stored image: ${title}`);
    }
    
    logger.info(`Processed ${sectionImages.length} images in section ${sectionId}`);
  } catch (error) {
    logger.error(`Error processing image section ${sectionId}: ${error.message}`);
    throw error;
  }
}

/**
 * Main function to run the extraction process
 */
async function main() {
  try {
    // Download the PDF
    const filePath = await downloadPDF();
    
    // Extract content
    logger.info('Starting content extraction...');
    const content = await extractContent(filePath);
    logger.info(`Content extraction completed. Found ${Object.keys(content.sections).length} sections and ${content.images ? content.images.length : 0} images`);
    
    // Process and store content
    await processContent(content);
    
    logger.info('PDF extraction completed successfully');
    return { success: true, message: 'PDF extraction completed successfully' };
  } catch (error) {
    logger.error(`PDF extraction failed: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

module.exports = {
  downloadPDF,
  extractContent,
  processContent,
  processArticleSection,
  processImageSection,
  main
};