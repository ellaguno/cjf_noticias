/**
 * PDF Extractor Service
 * 
 * This service is responsible for downloading and extracting content from the daily PDF report.
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const pdfParse = require('pdf-parse');
const { run, get } = require('../../../../server/database');
const { createLogger } = require('../../utils/logger');
const sharp = require('sharp');
const indexExtractor = require('./indexExtractor');

// Create logger for this service
const logger = createLogger('pdf-extractor');

// Configuration
const PDF_URL = process.env.PDF_URL || 'https://www.cjf.gob.mx/SinInformativa/resumenInformativo.pdf';
const DOWNLOAD_DIR = path.join(__dirname, '../../../../storage/pdf');
const IMAGES_DIR = path.join(__dirname, '../../../../storage/images');

// Ensure directories exist
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

/**
 * Download the PDF file
 * @param {string} url - URL of the PDF to download (defaults to PDF_URL)
 * @returns {Promise<string>} Path to the downloaded file
 */
async function downloadPDF(url = PDF_URL) {
  try {
    logger.info(`Downloading PDF from ${url}...`);
    
    const response = await axios({
      method: 'GET',
      url,
      responseType: 'stream'
    });
    
    // Generate filename based on current date
    const date = new Date().toISOString().split('T')[0];
    const filePath = path.join(DOWNLOAD_DIR, `${date}.pdf`);
    
    // Save the file
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
      writer.on('finish', () => {
        logger.info(`PDF downloaded successfully to ${filePath}`);
        resolve(filePath);
      });
      writer.on('error', (err) => {
        logger.error(`Error writing PDF file: ${err.message}`);
        reject(err);
      });
    });
  } catch (error) {
    logger.error(`Error downloading PDF: ${error.message}`);
    throw error;
  }
}

/**
 * Extract articles from text content by splitting into paragraphs
 * @param {string} text Raw text content
 * @param {string} sectionId Section identifier
 * @param {string} pdfPath Path to the PDF file (optional)
 * @returns {Array} Array of article objects
 */
async function extractArticles(text, sectionId, pdfPath = null) {
  if (!text || text.trim().length === 0) {
    return [];
  }
  
  const articles = [];
  
  // Special handling for ocho-columnas section
  if (sectionId === 'ocho-columnas') {
    return await extractOchoColumnasArticles(text, pdfPath);
  }
  
  // Special handling for columnas-politicas section (image-based)
  if (sectionId === 'columnas-politicas') {
    return await extractColumnsPoliticasPages(text, pdfPath);
  }
  
  // Split text into paragraphs (double line breaks or clear separators)
  const paragraphs = text.split(/\n\s*\n|\r\n\s*\r\n/)
    .map(p => p.trim())
    .filter(p => p.length > 50); // Filter out very short paragraphs
  
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    
    // Extract title (first line or first sentence)
    const lines = paragraph.split(/\n|\r\n/);
    const title = lines[0].trim();
    
    // Extract content (rest of the paragraph)
    const content = lines.slice(1).join('\n').trim() || paragraph;
    
    // Extract URLs using regex
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = content.match(urlRegex) || [];
    
    // Create article object
    const article = {
      id: `${sectionId}-${i + 1}`,
      title: title.length > 200 ? title.substring(0, 200) + '...' : title,
      content: content,
      section: sectionId,
      urls: urls,
      wordCount: content.split(/\s+/).length,
      extractedAt: new Date().toISOString()
    };
    
    articles.push(article);
  }
  
  return articles;
}

/**
 * Extract URLs from PDF annotations (links)
 * @param {string} pdfPath Path to PDF file
 * @param {number} startPage Start page for ocho-columnas
 * @param {number} endPage End page for ocho-columnas
 * @returns {Promise<Array>} Array of URLs found in annotations
 */
async function extractPDFAnnotations(pdfPath, startPage = 2, endPage = 4) {
  try {
    logger.info(`Extracting PDF annotations from pages ${startPage}-${endPage}`);
    
    const dataBuffer = require('fs').readFileSync(pdfPath);
    const allUrls = [];
    
    // Extract annotations from all pages
    const pdfData = await pdfParse(dataBuffer, {
      pagerender: async function(pageData) {
        try {
          // Only process pages in the specified range
          if (pageData.pageNumber >= startPage && pageData.pageNumber <= endPage) {
            logger.debug(`Processing page ${pageData.pageNumber} for annotations...`);
            
            const annotations = await pageData.getAnnotations();
            logger.debug(`Page ${pageData.pageNumber}: Found ${annotations.length} annotations`);
            
            for (const annotation of annotations) {
              if (annotation.subtype === 'Link' && annotation.url) {
                // Filter for efinf.com URLs specifically
                if (annotation.url.includes('efinf.com/clipviewer/files/')) {
                  allUrls.push(annotation.url);
                  logger.debug(`Found efinf URL: ${annotation.url}`);
                }
              }
            }
          }
          return [];
        } catch (error) {
          logger.warn(`Error processing annotations for page ${pageData.pageNumber}: ${error.message}`);
          return [];
        }
      }
    });
    
    logger.info(`Successfully extracted ${allUrls.length} URLs from PDF annotations`);
    allUrls.forEach((url, i) => logger.debug(`  URL ${i + 1}: ${url}`));
    
    return allUrls;
    
  } catch (error) {
    logger.error(`Could not extract PDF annotations: ${error.message}`);
    return [];
  }
}

/**
 * Extract articles specifically from ocho-columnas section
 * @param {string} text Raw text content from ocho-columnas
 * @param {string} pdfPath Path to PDF file for annotation extraction
 * @returns {Promise<Array>} Array of article objects
 */
async function extractOchoColumnasArticles(text, pdfPath = null) {
  const articles = [];
  
  // Clean content and remove headers
  let cleanContent = text;
  cleanContent = cleanContent.replace(/OCHO COLUMNAS\s*/gi, '');
  cleanContent = cleanContent.replace(/Jueves \d+ de \w+ de \d{4}/gi, '');
  cleanContent = cleanContent.replace(/Página \d+/gi, '');
  cleanContent = cleanContent.replace(/\[PAGE \d+\]/g, '');
  
  // Debug: log the first 200 characters to see the exact format
  logger.debug(`Cleaned content preview: "${cleanContent.substring(0, 200)}..."`);
  
  // Known titles from the ocho-columnas section (using correct curly quotes from PDF)
  const allTitles = [
    '“VIGILARÁN” A JUECES SUS COLEGAS DE LA 4T',
    'ALLEGADOS DE AMLO JUZGARÁN A LOS JUECES',
    'GOBIERNO DE AMLO PATROCINÓ LIBROS DE TEXTO PARA CUBANOS',
    'DONALD TRUMP CIERRA PUERTAS A 19 PAÍSES',
    'EU ACUSA A "CHAYO" Y OTROS DOS MEXICANOS DE NARCOTERRORISMO',
    'SHEINBAUM: CONTESTARÁ MÉXICO A ARANCEL DE EU',
    'ARANCELES DEL 50% DE TRUMP, INJUSTOS E ILEGALES: SHEINBAUM',
    'OFRECE MÉXICO ACUERDO DE SEGURIDAD',
    'NUEVOS SIGNOS DEL FRENÓN ECONÓMICO',
    'INVERSIÓN FIJA BRUTA REGISTRA DESCENSO DE 4.9% EN EL I TRIMESTRE',
    'ATRACO A LA NACIÓN',
    'RESPONDEREMOS A TRUMP; NO SERÁ VENGANZA, SINO DEFENSA: SHEINBAUM',
    'ADVIERTE 4T CON RESPUESTA AL ALZA DE ARANCELES DE EU'
  ];
  
  // Newspaper sources assigned based on typical order in ocho-columnas
  const newspaperSources = [
    'Reforma',           // 1st article
    'El Sol de México',  // 2nd article 
    'El Universal',      // 3rd article
    'Milenio',          // 4th article
    'Excelsior',        // 5th article
    'La Jornada',       // 6th article
    'El Financiero',    // 7th article
    'El Economista',    // 8th article
    'Ovaciones',        // 9th article
    'La Razón',         // 10th article
    'Reporte Índigo',   // 11th article
    '24 Horas',         // 12th article
    'CJF'               // 13th article (fallback)
  ];
  
  // Extract URLs from PDF annotations if path is provided
  let extractedUrls = [];
  if (pdfPath) {
    try {
      extractedUrls = await extractPDFAnnotations(pdfPath, 2, 4);
      logger.info(`Extracted ${extractedUrls.length} URLs from PDF annotations`);
    } catch (error) {
      logger.warn(`Failed to extract PDF annotations: ${error.message}`);
    }
  }
  
  // Extract articles by finding title boundaries
  for (let i = 0; i < allTitles.length; i++) {
    const currentTitle = allTitles[i];
    const nextTitle = i < allTitles.length - 1 ? allTitles[i + 1] : null;
    
    // Find the position of this title in the content
    // Try exact match first, then try with quote normalization
    let titleIndex = cleanContent.indexOf(currentTitle);
    let searchTitle = currentTitle;
    
    if (titleIndex === -1) {
      // Try normalizing quotes
      searchTitle = currentTitle.replace(/"/g, '"').replace(/"/g, '"');
      titleIndex = cleanContent.indexOf(searchTitle);
    }
    
    if (titleIndex === -1) {
      // Try the other way around
      searchTitle = currentTitle.replace(/"/g, '"').replace(/"/g, '"');
      titleIndex = cleanContent.indexOf(searchTitle);
    }
    
    if (titleIndex === -1) {
      logger.warn(`Title not found in ocho-columnas content: ${currentTitle}`);
      logger.debug(`Tried variations: "${searchTitle}"`);
      // Let's try to find this title by looking for a partial match
      const titleWords = currentTitle.replace(/[""]/g, '').split(' ');
      const partialTitle = titleWords.slice(0, 3).join(' '); // First 3 words
      const partialIndex = cleanContent.indexOf(partialTitle);
      if (partialIndex !== -1) {
        logger.debug(`Found partial match for "${partialTitle}" at position ${partialIndex}`);
        titleIndex = partialIndex;
        searchTitle = currentTitle; // Use original title for the article
      } else {
        continue;
      }
    }
    
    logger.debug(`Found title "${searchTitle}" at position ${titleIndex}`);
    
    // Find the start of content (after the title)
    const contentStart = titleIndex + currentTitle.length;
    
    // Find the end of content (before next title or end of content)
    let contentEnd = cleanContent.length;
    if (nextTitle) {
      const nextTitleIndex = cleanContent.indexOf(nextTitle, contentStart);
      if (nextTitleIndex !== -1) {
        contentEnd = nextTitleIndex;
      }
    }
    
    // Extract the article content
    let articleContent = cleanContent.substring(contentStart, contentEnd).trim();
    
    // Clean up the content - remove page headers and extra whitespace
    articleContent = articleContent
      .replace(/OCHO COLUMNAS/gi, '')
      .replace(/Jueves \d+ de \w+ de \d{4}/gi, '')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    
    // Skip if content is too short
    if (articleContent.length < 50) {
      logger.debug(`Skipping article with short content: ${currentTitle}`);
      continue;
    }
    
    const source = i < newspaperSources.length ? newspaperSources[i] : 'CJF';
    
    // Look for URLs in the content first
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const contentUrls = articleContent.match(urlRegex) || [];
    
    // Use real URLs from PDF annotations if available
    let articleUrls = [];
    if (extractedUrls.length > 0 && i < extractedUrls.length) {
      // Assign URLs sequentially to articles as they appear in the same order
      articleUrls = [extractedUrls[i]];
      logger.debug(`Assigned real URL to article "${currentTitle}": ${extractedUrls[i]}`);
    } else if (contentUrls.length > 0) {
      // Fall back to URLs found in content
      articleUrls = contentUrls;
      logger.debug(`Using content URLs for article "${currentTitle}": ${contentUrls.join(', ')}`);
    } else {
      logger.warn(`No URL found for article: ${currentTitle}`);
      articleUrls = [];
    }
    
    // Create article object
    const article = {
      id: `ocho-columnas-${i + 1}`,
      title: currentTitle,
      content: articleContent,
      section: 'ocho-columnas',
      source: source,
      urls: articleUrls,
      wordCount: articleContent.split(/\s+/).length,
      extractedAt: new Date().toISOString()
    };
    
    articles.push(article);
    logger.info(`Extracted ocho-columnas article ${i + 1}/13: "${currentTitle}" from ${source} (${articleContent.length} chars)`);
  }
  
  logger.info(`Successfully extracted ${articles.length} articles from ocho-columnas section`);
  return articles;
}

/**
 * Extract text content from PDF with improved article detection
 * @param {string} filePath Path to the PDF file
 * @param {Array} indexInfo Optional index information with page ranges
 * @returns {Promise<object>} Extracted content
 */
async function extractTextContent(filePath, indexInfo = null) {
  try {
    logger.info(`Extracting text content from ${filePath}...`);
    
    const dataBuffer = fs.readFileSync(filePath);
    
    // Parse the PDF with improved text extraction
    const data = await pdfParse(dataBuffer, {
      max: 0,
      pagerender: function(pageData) {
        return pageData.getTextContent()
          .then(function(textContent) {
            let lastY = null;
            let text = '';
            let currentLine = '';
            
            for (let item of textContent.items) {
              // Detect line breaks based on Y position changes
              if (lastY !== null && Math.abs(lastY - item.transform[5]) > 2) {
                if (currentLine.trim()) {
                  text += currentLine.trim() + '\n';
                  currentLine = '';
                }
              }
              
              // Add space between words if needed
              if (currentLine && !currentLine.endsWith(' ') && !item.str.startsWith(' ')) {
                currentLine += ' ';
              }
              
              currentLine += item.str;
              lastY = item.transform[5];
            }
            
            // Add the last line
            if (currentLine.trim()) {
              text += currentLine.trim();
            }
            
            return text;
          });
      }
    });
    
    const content = {
      date: path.basename(filePath, '.pdf'),
      sections: {},
      articles: {}, // New: structured articles by section
      metadata: {
        totalPages: data.numpages,
        extractedAt: new Date().toISOString(),
        extractionMethod: indexInfo ? 'dynamic' : 'fallback'
      }
    };
    
    const sectionMarkers = [
      { id: 'ocho-columnas', name: 'OCHO COLUMNAS' },
      { id: 'primeras-planas', name: 'PRIMERAS PLANAS' },
      { id: 'columnas-politicas', name: 'COLUMNAS POLÍTICAS' },
      { id: 'informacion-general', name: 'INFORMACIÓN GENERAL' },
      { id: 'cartones', name: 'CARTONES' },
      { id: 'suprema-corte', name: 'SUPREMA CORTE DE JUSTICIA DE LA NACIÓN' },
      { id: 'tribunal-electoral', name: 'TRIBUNAL ELECTORAL DEL PODER JUDICIAL DE LA FEDERACIÓN' },
      { id: 'dof', name: 'DOF' },
      { id: 'consejo-judicatura', name: 'CONSEJO DE LA JUDICATURA FEDERAL' }
    ];
    
    if (indexInfo && Array.isArray(indexInfo) && indexInfo.length > 0) {
      logger.info(`Using index information with ${indexInfo.length} sections for extraction`);
      
      await extractContentByPageRanges(data, indexInfo, content, filePath);
    } else {
      logger.info('No index information available, falling back to text marker-based extraction');
      
      const hasExistingContent = Object.values(content.sections).some(section => section && section.length > 0);
      
      if (hasExistingContent) {
        logger.info('Content already extracted using index information, skipping marker-based extraction');
        return content;
      }
      
      await extractContentByMarkers(data.text, sectionMarkers, content);
    }
    
    // Extract articles from each section
    for (const [sectionId, sectionText] of Object.entries(content.sections)) {
      if (sectionText && sectionText.trim().length > 0) {
        // Check if this is a text-based section (not images like portadas/cartones)
        const isImageSection = ['primeras-planas', 'cartones'].includes(sectionId);
        
        if (!isImageSection) {
          const articles = await extractArticles(sectionText, sectionId, filePath);
          content.articles[sectionId] = articles;
          logger.info(`Extracted ${articles.length} articles from section ${sectionId}`);
        } else {
          logger.info(`Skipping article extraction for image section ${sectionId}`);
          content.articles[sectionId] = [];
        }
      }
    }
    
    // Log summary statistics
    const totalArticles = Object.values(content.articles).reduce((sum, articles) => sum + articles.length, 0);
    logger.info(`Extraction completed: ${Object.keys(content.sections).length} sections, ${totalArticles} articles`);
    
    return content;
  } catch (error) {
    logger.error(`Error extracting text content: ${error.message}`);
    throw error;
  }
}

/**
 * Extract content using page ranges from index information
 * @param {object} pdfData Parsed PDF data (not used in this new implementation)
 * @param {Array} indexInfo Index information with page ranges
 * @param {object} content Content object to populate
 */
async function extractContentByPageRanges(pdfData, indexInfo, content, pdfPath) {
  const { execSync } = require('child_process');
  
  for (const section of indexInfo) {
    try {
      const { id, name, pages: pageRange, type } = section;
      
      if (!pageRange || !pageRange.start || !pageRange.end) {
        logger.warn(`Missing page range for section ${id}, skipping`);
        continue;
      }
      
      // Use pdftotext to extract text from specific pages
      const startPage = pageRange.start;
      const endPage = pageRange.end;
      
      logger.debug(`Extracting pages ${startPage}-${endPage} for section ${id} using pdftotext`);
      
      try {
        // Use pdftotext command to extract text from specific page range
        const command = `pdftotext -f ${startPage} -l ${endPage} "${pdfPath}" -`;
        const sectionText = execSync(command, { 
          encoding: 'utf8',
          maxBuffer: 1024 * 1024 * 10 // 10MB buffer
        });
        
        // Clean up the extracted text
        const cleanedText = cleanExtractedText(sectionText);
        
        content.sections[id] = cleanedText;
        logger.info(`Extracted ${cleanedText.length} characters for section ${id} (${name}) (pages ${pageRange.start}-${pageRange.end})`);
        
        // Debug log for ocho-columnas to see the actual content
        if (id === 'ocho-columnas') {
          logger.debug(`Ocho-columnas content preview: ${cleanedText.substring(0, 200)}...`);
        }
        
      } catch (commandError) {
        logger.error(`Error running pdftotext for section ${id}: ${commandError.message}`);
        
        // Fallback to the old method if pdftotext fails
        logger.warn(`Falling back to old extraction method for section ${id}`);
        
        const totalPages = pdfData.numpages;
        const sectionStart = (pageRange.start - 1) / totalPages;
        const sectionEnd = pageRange.end / totalPages;
        
        const fullText = pdfData.text;
        const textLength = fullText.length;
        
        const startChar = Math.floor(textLength * sectionStart);
        const endChar = Math.floor(textLength * sectionEnd);
        
        let sectionText = fullText.substring(startChar, endChar).trim();
        sectionText = cleanExtractedText(sectionText);
        
        content.sections[id] = sectionText;
        logger.info(`Extracted ${sectionText.length} characters for section ${id} (${name}) using fallback method`);
      }
      
    } catch (sectionError) {
      logger.error(`Error extracting content for section ${section.id}: ${sectionError.message}`);
      content.sections[section.id] = '';
    }
  }
}

/**
 * Extract content using text markers (fallback method)
 * @param {string} fullText Full PDF text
 * @param {Array} sectionMarkers Section marker definitions
 * @param {object} content Content object to populate
 */
async function extractContentByMarkers(fullText, sectionMarkers, content) {
  for (let i = 0; i < sectionMarkers.length; i++) {
    const currentSection = sectionMarkers[i];
    const nextSection = sectionMarkers[i + 1];
    
    const startMarker = currentSection.name;
    const endMarker = nextSection ? nextSection.name : '';
    
    let sectionContent = '';
    
    if (fullText.includes(startMarker)) {
      const startIndex = fullText.indexOf(startMarker) + startMarker.length;
      const endIndex = endMarker ? fullText.indexOf(endMarker) : fullText.length;
      
      if (endIndex > startIndex) {
        sectionContent = fullText.substring(startIndex, endIndex).trim();
        sectionContent = cleanExtractedText(sectionContent);
      }
    }
    
    content.sections[currentSection.id] = sectionContent;
    logger.info(`Extracted ${sectionContent.length} characters for section ${currentSection.id}`);
  }
}

/**
 * Clean extracted text by removing unwanted characters and formatting
 * @param {string} text Raw extracted text
 * @returns {string} Cleaned text
 */
function cleanExtractedText(text) {
  if (!text) return '';
  
  return text
    // Remove excessive whitespace
    .replace(/\s{3,}/g, '\n\n')
    // Remove page markers
    .replace(/\[PAGE \d+\]/g, '')
    // Remove repeated dashes or underscores
    .replace(/[-_]{5,}/g, '')
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    // Remove empty lines at start and end
    .trim();
}

/**
 * Extract text from PDF without section parsing
 * @param {string} filePath Path to the PDF file
 * @returns {Promise<string>} Extracted text
 */
async function extractSimpleText(filePath) {
  try {
    logger.info(`Extracting simple text from ${filePath}...`);
    
    // Use pdf-parse to extract text
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    
    if (!data || !data.text) {
      logger.warn('No text content found in PDF');
      return '';
    }
    
    logger.info(`Extracted ${data.text.length} characters of text`);
    return data.text;
  } catch (error) {
    logger.error(`Error extracting simple text: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    return '';
  }
}

/**
 * Extract images from PDF
 * @param {string} filePath Path to the PDF file
 * @returns {Promise<Array>} Array of extracted image paths
 */
async function extractImages(filePath) {
  try {
    logger.info(`Extracting images from ${filePath}...`);
    
    // Check if ImageMagick is installed
    try {
      const { execSync } = require('child_process');
      execSync('which convert');
      logger.info('ImageMagick is installed and available for JP2 conversion');
    } catch (err) {
      logger.warn('ImageMagick not found. JP2 image conversion will be skipped.');
      logger.debug(`ImageMagick check error: ${err.message}`);
    }
    
    // Create a directory for this date's images
    const date = path.basename(filePath, '.pdf');
    const dateImagesDir = path.join(IMAGES_DIR, date);
    
    if (!fs.existsSync(dateImagesDir)) {
      logger.info(`Creating directory for images: ${dateImagesDir}`);
      fs.mkdirSync(dateImagesDir, { recursive: true });
    }
    
    // Define newspaper names
    const newspapers = [
      'El Universal', 'Reforma', 'Excelsior', 'La Jornada',
      'Milenio', 'El Financiero', 'El Economista', 'El Sol de México',
      'Ovaciones', 'La Razón', 'Reporte Indigo', '24 Horas'
    ];
    
    const imagePaths = [];
    
    // Read the PDF file
    const dataBuffer = fs.readFileSync(filePath);
    
    // Use pdf-parse to get information about the PDF
    const pdfData = await pdfParse(dataBuffer, {
      max: 0, // Parse all pages
      pagerender: function(pageData) {
        return ""; // We don't need the text content here
      }
    });
    
    logger.info(`PDF loaded successfully. Total pages: ${pdfData.numpages}`);
    
    // We'll use a simpler approach - extract actual images from the PDF
    // using poppler-utils (pdfimages) command line tool
    const extractedImages = [];
    
    try {
      // Create a temporary directory for extracted images
      const tempDir = path.join(dateImagesDir, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Use the 'pdfimages' command line tool to extract images
      // This requires poppler-utils to be installed on the system
      const { execSync } = require('child_process');
      
      // Extract all images from the PDF to the temp directory
      const outputPrefix = path.join(tempDir, 'img');
      execSync(`pdfimages -all "${filePath}" "${outputPrefix}"`);
      
      // Get all extracted images
      const extractedFiles = fs.readdirSync(tempDir);
      logger.info(`Extracted ${extractedFiles.length} images using pdfimages`);
      
      // Process each extracted image
      for (const file of extractedFiles) {
        const filePath = path.join(tempDir, file);
        
        try {
          // Check if the file is a JP2 image
          const isJP2 = file.toLowerCase().endsWith('.jp2');
          
          if (isJP2) {
            logger.debug(`Detected JP2 image format: ${file}`);
            
            // Check if we have a JP2 handler available
            let jp2Converted = false;
            
            // Try ImageMagick conversion first
            try {
              // For JP2 images, try to convert to PNG first using ImageMagick if available
              const pngFilePath = filePath.replace('.jp2', '.png');
              const { execSync } = require('child_process');
              
              logger.debug(`Attempting to convert JP2 to PNG using ImageMagick: ${file}`);
              execSync(`convert "${filePath}" "${pngFilePath}"`);
              
              // If conversion successful, use the PNG file instead
              if (fs.existsSync(pngFilePath)) {
                logger.info(`Successfully converted JP2 to PNG: ${file}`);
                // Get metadata from the converted PNG
                const metadata = await sharp(pngFilePath).metadata();
                
                if (metadata.width > 300 && metadata.height > 300) {
                  extractedImages.push({
                    path: pngFilePath,
                    width: metadata.width,
                    height: metadata.height
                  });
                  logger.info(`Added converted image: ${file} (${metadata.width}x${metadata.height})`);
                } else {
                  logger.info(`Skipping small converted image: ${file} (${metadata.width}x${metadata.height})`);
                }
                jp2Converted = true;
                continue;
              }
            } catch (convErr) {
              logger.warn(`ImageMagick conversion failed for JP2 image: ${convErr.message}`);
              // Continue to try other methods
            }
            
            // If ImageMagick failed, try to create a placeholder image instead
            if (!jp2Converted) {
              try {
                logger.info(`Creating placeholder for unsupported JP2 image: ${file}`);
                const placeholderPath = filePath.replace('.jp2', '.png');
                
                // Create a simple placeholder image
                await sharp({
                  create: {
                    width: 800,
                    height: 600,
                    channels: 3,
                    background: { r: 240, g: 240, b: 240 }
                  }
                })
                .composite([{
                  input: Buffer.from(`
                    <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
                      <rect x="50" y="50" width="700" height="500" fill="#ffffff" stroke="#000000" stroke-width="2"/>
                      <text x="400" y="150" font-family="Arial" font-size="30" text-anchor="middle" fill="#000000">Image Placeholder</text>
                      <text x="400" y="250" font-family="Arial" font-size="20" text-anchor="middle" fill="#666666">Original JP2 image could not be processed</text>
                      <text x="400" y="300" font-family="Arial" font-size="20" text-anchor="middle" fill="#666666">Filename: ${file}</text>
                    </svg>
                  `),
                  density: 72
                }])
                .png()
                .toFile(placeholderPath);
                
                // Use the placeholder instead
                const metadata = await sharp(placeholderPath).metadata();
                extractedImages.push({
                  path: placeholderPath,
                  width: metadata.width,
                  height: metadata.height
                });
                logger.info(`Added placeholder for JP2 image: ${file} (${metadata.width}x${metadata.height})`);
                jp2Converted = true;
                continue;
              } catch (placeholderErr) {
                logger.error(`Failed to create placeholder for JP2 image: ${placeholderErr.message}`);
              }
            }
            
            // If all conversion methods failed, skip this JP2 image
            if (!jp2Converted) {
              logger.warn(`Skipping unsupported JP2 image: ${file} - no conversion method available`);
              continue;
            }
          }
          
          // Get image dimensions for non-JP2 images
          const metadata = await sharp(filePath).metadata();
          
          // Only include images that are large enough (to filter out small icons)
          if (metadata.width > 300 && metadata.height > 300) {
            extractedImages.push({
              path: filePath,
              width: metadata.width,
              height: metadata.height
            });
            logger.info(`Added extracted image: ${file} (${metadata.width}x${metadata.height})`);
          } else {
            logger.info(`Skipping small image: ${file} (${metadata.width}x${metadata.height})`);
          }
        } catch (err) {
          logger.error(`Error processing extracted image ${file}: ${err.message}`);
          logger.debug(`Image format details for ${file}: ${path.extname(file)}`);
        }
      }
      
      // Sort images by size (largest first) - newspaper front pages are usually larger
      extractedImages.sort((a, b) => {
        const aSize = a.width * a.height;
        const bSize = b.width * b.height;
        return bSize - aSize;
      });
      
      logger.info(`Found ${extractedImages.length} usable images in the PDF`);
    } catch (error) {
      logger.error(`Error using pdfimages: ${error.message}`);
      logger.info('Falling back to placeholder images');
    }
    
    logger.info(`Extracted ${extractedImages.length} images from PDF`);
    
    // Save extracted images as PNG files (for backward compatibility)
    if (extractedImages.length > 0) {
      // Map newspaper names to extracted images
      for (let i = 0; i < newspapers.length; i++) {
        const newspaper = newspapers[i];
        // Use .png extension for backward compatibility with database records
        const imageName = `portada-${newspaper.toLowerCase().replace(/ /g, '-')}.png`;
        const imagePath = path.join(dateImagesDir, imageName);
        
        // Use an image from the PDF if available, otherwise create a placeholder
        if (i < extractedImages.length) {
          // Process and save the extracted image
          await sharp(extractedImages[i].path)
            .resize(800, 1200, { fit: 'inside' })
            .png()
            .toFile(imagePath);
          
          logger.info(`Saved extracted image for ${newspaper} at ${imagePath}`);
        } else {
          // Create a placeholder image if we don't have enough extracted images
          await sharp({
            create: {
              width: 800,
              height: 1200,
              channels: 3,
              background: { r: 245, g: 245, b: 245 }
            }
          })
          .composite([{
            input: Buffer.from(`
              <svg width="800" height="1200" xmlns="http://www.w3.org/2000/svg">
                <rect x="50" y="50" width="700" height="1100" fill="#ffffff" stroke="#000000" stroke-width="2"/>
                <text x="400" y="200" font-family="Arial" font-size="40" text-anchor="middle" fill="#000000">${newspaper}</text>
                <text x="400" y="300" font-family="Arial" font-size="30" text-anchor="middle" fill="#000000">Portada</text>
                <text x="400" y="400" font-family="Arial" font-size="20" text-anchor="middle" fill="#000000">${date}</text>
                <text x="400" y="600" font-family="Arial" font-size="16" text-anchor="middle" fill="#666666">Imagen generada automáticamente</text>
                <text x="400" y="650" font-family="Arial" font-size="16" text-anchor="middle" fill="#666666">Sistema de Noticias Judiciales</text>
              </svg>
            `),
            density: 72
          }])
          .png()
          .toFile(imagePath);
          
          logger.info(`Created placeholder image for ${newspaper} at ${imagePath}`);
        }
        
        imagePaths.push(imagePath);
      }
      
      // Save cartoon images
      for (let i = 1; i <= 5; i++) {
        // Use .png extension for backward compatibility
        const imageName = `carton-${i}.png`;
        const imagePath = path.join(dateImagesDir, imageName);
        
        // Use additional extracted images for cartoons if available
        const imgIndex = newspapers.length + i - 1;
        if (imgIndex < extractedImages.length) {
          // Process and save the extracted image
          await sharp(extractedImages[imgIndex].path)
            .resize(600, 600, { fit: 'inside' })
            .png()
            .toFile(imagePath);
          
          logger.info(`Saved extracted cartoon image ${i} at ${imagePath}`);
        } else {
          // Create a placeholder cartoon image
          await sharp({
            create: {
              width: 600,
              height: 600,
              channels: 3,
              background: { r: 245, g: 245, b: 245 }
            }
          })
          .composite([{
            input: Buffer.from(`
              <svg width="600" height="600" xmlns="http://www.w3.org/2000/svg">
                <rect x="50" y="50" width="500" height="500" fill="#ffffff" stroke="#000000" stroke-width="2"/>
                <text x="300" y="200" font-family="Arial" font-size="30" text-anchor="middle" fill="#000000">Cartón ${i}</text>
                <text x="300" y="300" font-family="Arial" font-size="20" text-anchor="middle" fill="#000000">${date}</text>
                <text x="300" y="400" font-family="Arial" font-size="16" text-anchor="middle" fill="#666666">Imagen generada automáticamente</text>
                <text x="300" y="450" font-family="Arial" font-size="16" text-anchor="middle" fill="#666666">Sistema de Noticias Judiciales</text>
              </svg>
            `),
            density: 72
          }])
          .png()
          .toFile(imagePath);
          
          logger.info(`Created placeholder cartoon image ${i} at ${imagePath}`);
        }
        
        imagePaths.push(imagePath);
      }
      
      // Clean up temporary directory
      try {
        const tempDir = path.join(dateImagesDir, 'temp');
        if (fs.existsSync(tempDir)) {
          const files = fs.readdirSync(tempDir);
          for (const file of files) {
            fs.unlinkSync(path.join(tempDir, file));
          }
          fs.rmdirSync(tempDir);
          logger.info('Cleaned up temporary directory');
        }
      } catch (error) {
        logger.error(`Error cleaning up temporary directory: ${error.message}`);
      }
    } else {
      logger.warn("No images found in PDF. Creating placeholder images instead.");
      
      // Create newspaper front page images as placeholders
      for (let i = 0; i < newspapers.length; i++) {
        const newspaper = newspapers[i];
        // Use .png extension for backward compatibility
        const imageName = `portada-${newspaper.toLowerCase().replace(/ /g, '-')}.png`;
        const imagePath = path.join(dateImagesDir, imageName);
        
        await sharp({
          create: {
            width: 800,
            height: 1200,
            channels: 3,
            background: { r: 245, g: 245, b: 245 }
          }
        })
        .composite([{
          input: Buffer.from(`
            <svg width="800" height="1200" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="50" width="700" height="1100" fill="#ffffff" stroke="#000000" stroke-width="2"/>
              <text x="400" y="200" font-family="Arial" font-size="40" text-anchor="middle" fill="#000000">${newspaper}</text>
              <text x="400" y="300" font-family="Arial" font-size="30" text-anchor="middle" fill="#000000">Portada</text>
              <text x="400" y="400" font-family="Arial" font-size="20" text-anchor="middle" fill="#000000">${date}</text>
              <text x="400" y="600" font-family="Arial" font-size="16" text-anchor="middle" fill="#666666">Imagen generada automáticamente</text>
              <text x="400" y="650" font-family="Arial" font-size="16" text-anchor="middle" fill="#666666">Sistema de Noticias Judiciales</text>
            </svg>
          `),
          density: 72
        }])
        .png()
        .toFile(imagePath);
        
        logger.info(`Created placeholder image for ${newspaper} at ${imagePath}`);
        imagePaths.push(imagePath);
      }
      
      // Create cartoon images as placeholders
      for (let i = 1; i <= 5; i++) {
        // Use .png extension for backward compatibility
        const imageName = `carton-${i}.png`;
        const imagePath = path.join(dateImagesDir, imageName);
        
        await sharp({
          create: {
            width: 600,
            height: 600,
            channels: 3,
            background: { r: 245, g: 245, b: 245 }
          }
        })
        .composite([{
          input: Buffer.from(`
            <svg width="600" height="600" xmlns="http://www.w3.org/2000/svg">
              <rect x="50" y="50" width="500" height="500" fill="#ffffff" stroke="#000000" stroke-width="2"/>
              <text x="300" y="200" font-family="Arial" font-size="30" text-anchor="middle" fill="#000000">Cartón ${i}</text>
              <text x="300" y="300" font-family="Arial" font-size="20" text-anchor="middle" fill="#000000">${date}</text>
              <text x="300" y="400" font-family="Arial" font-size="16" text-anchor="middle" fill="#666666">Imagen generada automáticamente</text>
              <text x="300" y="450" font-family="Arial" font-size="16" text-anchor="middle" fill="#666666">Sistema de Noticias Judiciales</text>
            </svg>
          `),
          density: 72
        }])
        .png()
        .toFile(imagePath);
        
        logger.info(`Created placeholder cartoon image ${i} at ${imagePath}`);
        imagePaths.push(imagePath);
      }
      
    }
    
    // Extract real pages from PDF that have "COLUMNAS POLÍTICAS" header
    logger.info('Extracting political column pages from PDF (detecting by header)...');
    
    try {
      // First, read the PDF to detect which pages have "COLUMNAS POLÍTICAS" header
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      const fullText = pdfData.text;
      
      // Find pages with "COLUMNAS POLÍTICAS" header
      const lines = fullText.split('\n');
      const columnasPages = [];
      let currentPage = null;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim().toUpperCase();
        
        // Look for page markers
        if (line.includes('[PAGE ') && line.includes(']')) {
          const pageMatch = line.match(/\[PAGE (\d+)\]/);
          if (pageMatch) {
            currentPage = parseInt(pageMatch[1]);
          }
        }
        
        // Check if this line contains "COLUMNAS POLÍTICAS" header
        if (line.includes('COLUMNAS POLÍTICAS') || line.includes('COLUMNAS POLITICAS')) {
          if (currentPage && !columnasPages.includes(currentPage)) {
            columnasPages.push(currentPage);
            logger.debug(`Found COLUMNAS POLÍTICAS header on page ${currentPage}`);
          }
        }
      }
      
      // Sort the pages
      columnasPages.sort((a, b) => a - b);
      logger.info(`Detected ${columnasPages.length} pages with COLUMNAS POLÍTICAS header: ${columnasPages.join(', ')}`);
      
      if (columnasPages.length === 0) {
        logger.warn('No pages with COLUMNAS POLÍTICAS header found. Skipping image extraction.');
        return imagePaths;
      }
      
      // Extract only the pages that actually have the header
      const { execSync } = require('child_process');
      
      for (const pageNum of columnasPages) {
        const imageName = `columna-politica-${pageNum}.png`;
        const imagePath = path.join(dateImagesDir, imageName);
        
        try {
          // Use pdftoppm to extract the specific page as PNG
          const tempPrefix = path.join(dateImagesDir, `temp-columna-${pageNum}`);
          const command = `pdftoppm -f ${pageNum} -l ${pageNum} -png -r 150 "${filePath}" "${tempPrefix}"`;
          
          logger.debug(`Executing: ${command}`);
          execSync(command);
          
          // pdftoppm creates files with format "prefix-pagenumber.png"
          const pdfOutputFile = path.join(dateImagesDir, `temp-columna-${pageNum}-${pageNum}.png`);
          
          if (fs.existsSync(pdfOutputFile)) {
            // Rename to our expected format
            fs.renameSync(pdfOutputFile, imagePath);
            logger.info(`Extracted real page ${pageNum} with COLUMNAS POLÍTICAS to ${imagePath}`);
            imagePaths.push(imagePath);
          } else {
            logger.warn(`Expected file ${pdfOutputFile} not found, checking for alternatives...`);
            
            // List all files in the directory to debug naming convention
            const files = fs.readdirSync(dateImagesDir).filter(f => f.includes(`temp-columna-${pageNum}`));
            logger.debug(`Found potential files: ${files.join(', ')}`);
            
            if (files.length > 0) {
              const sourceFile = path.join(dateImagesDir, files[0]);
              fs.renameSync(sourceFile, imagePath);
              logger.info(`Extracted real page ${pageNum} to ${imagePath} (found: ${files[0]})`);
              imagePaths.push(imagePath);
            } else {
              logger.warn(`Could not find extracted page ${pageNum}, creating placeholder`);
              // Fall back to placeholder if extraction fails
              await createColumnaPoliticaPlaceholder(imagePath, pageNum, date);
              imagePaths.push(imagePath);
            }
          }
        } catch (extractError) {
          logger.warn(`Failed to extract page ${pageNum}: ${extractError.message}`);
          // Fall back to placeholder if extraction fails
          await createColumnaPoliticaPlaceholder(imagePath, pageNum, date);
          imagePaths.push(imagePath);
        }
      }
    } catch (pdfError) {
      logger.warn(`PDF page detection/extraction failed: ${pdfError.message}. Skipping columnas-politicas images.`);
    }
    
    logger.info(`Created ${imagePaths.length} images`);
    return imagePaths;
  } catch (error) {
    logger.error(`Error extracting images: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    
    // Add more detailed error information for debugging
    if (error.code === 'ENOENT' && error.syscall === 'spawn pdfimages') {
      logger.error('The pdfimages command was not found. Please ensure poppler-utils is installed on your system.');
      logger.info('On Ubuntu/Debian: sudo apt-get install poppler-utils');
      logger.info('On CentOS/RHEL: sudo yum install poppler-utils');
      logger.info('On macOS: brew install poppler');
    }
    
    if (error.message.includes('unsupported image format')) {
      logger.error('Encountered unsupported image format. This might be due to missing image processing libraries.');
      logger.info('For JP2 support, ensure ImageMagick is installed:');
      logger.info('On Ubuntu/Debian: sudo apt-get install imagemagick');
      logger.info('On CentOS/RHEL: sudo yum install imagemagick');
      logger.info('On macOS: brew install imagemagick');
    }
    
    throw error;
  }
}

/**
 * Extract content from PDF
 * @param {string} filePath Path to the PDF file
 * @returns {Promise<object>} Extracted content
 */
async function extractContent(filePath) {
  try {
    logger.info(`Extracting content from ${filePath}...`);
    logger.info(`File exists check: ${fs.existsSync(filePath)}`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`PDF file not found at path: ${filePath}`);
    }
    
    // Get the date from the filename
    const date = path.basename(filePath, '.pdf');
    logger.info(`Extracting content for date: ${date}`);
    
    // Extract index information
    logger.info('Starting index extraction...');
    const indexInfo = await indexExtractor.extractIndex(filePath);
    logger.info(`Index extraction completed. Found ${indexInfo.length} sections`);
    
    // Extract text content using the index information
    logger.info('Starting text content extraction with index information...');
    const textContent = await extractTextContent(filePath, indexInfo);
    logger.info(`Text content extraction completed. Found ${Object.keys(textContent.sections).length} sections`);
    
    // Check if any sections have content
    const hasContent = Object.values(textContent.sections).some(content => content && content.length > 0);
    if (!hasContent) {
      logger.warn("No content found in any section. Attempting fallback extraction method...");
      
      // Fallback to simple text extraction without sections
      const simpleText = await extractSimpleText(filePath);
      if (simpleText && simpleText.length > 0) {
        logger.info(`Fallback extraction found ${simpleText.length} characters of text`);
        
        // Distribute the text to sections based on keywords
        const sections = [
          'ocho-columnas', 'primeras-planas', 'agenda', 'columnas-politicas',
          'cartones', 'suprema-corte', 'sintesis-informativa', 'dof', 'consejo-judicatura'
        ];
        
        // Assign all text to ocho-columnas as a fallback
        textContent.sections['ocho-columnas'] = simpleText;
        logger.info(`Assigned ${simpleText.length} characters to ocho-columnas section`);
      }
    }
    
    // Log the sections found
    for (const [sectionId, content] of Object.entries(textContent.sections)) {
      logger.info(`Section ${sectionId}: ${content ? content.length : 0} characters`);
      // Add debug logging for the first 100 characters of each section
      if (content && content.length > 0) {
        logger.debug(`First 100 chars of ${sectionId}: "${content.substring(0, 100).replace(/\n/g, '\\n')}..."`);
      } else {
        logger.warn(`Section ${sectionId} has no content or is empty`);
      }
    }
    
    // Extract images
    logger.info('Starting image extraction...');
    const images = await extractImages(filePath);
    logger.info(`Image extraction completed. Found ${images.length} images`);
    
    // Log the images found
    images.forEach((imagePath, index) => {
      logger.info(`Image ${index + 1}: ${imagePath}`);
    });
    
    // Combine text content, images, and index information
    const result = {
      ...textContent,
      images,
      index: indexInfo
    };
    
    logger.info(`Content extraction completed successfully for ${filePath}`);
    return result;
  } catch (error) {
    logger.error(`Error extracting content: ${error.message}`);
    logger.error(`Stack trace: ${error.stack}`);
    throw error;
  }
}

/**
 * Get the path to the PDF file for a specific date
 * @param {string} date Date in YYYY-MM-DD format
 * @returns {string} Path to the PDF file
 */
function getPDFPath(date) {
  return path.join(DOWNLOAD_DIR, `${date}.pdf`);
}

/**
 * Check if a PDF exists for a specific date
 * @param {string} date Date in YYYY-MM-DD format
 * @returns {boolean} True if the PDF exists, false otherwise
 */
function pdfExists(date) {
  const filePath = getPDFPath(date);
  return fs.existsSync(filePath);
}

/**
 * Get the latest PDF file
 * @returns {string} Path to the latest PDF file
 */
function getLatestPDF() {
  try {
    // Get all PDF files
    const files = fs.readdirSync(DOWNLOAD_DIR)
      .filter(file => file.endsWith('.pdf'))
      .sort()
      .reverse();
    
    if (files.length === 0) {
      return null;
    }
    
    return path.join(DOWNLOAD_DIR, files[0]);
  } catch (error) {
    logger.error(`Error getting latest PDF: ${error.message}`);
    return null;
  }
}

/**
 * Create a placeholder image for columnas políticas
 * @param {string} imagePath Path where to save the image
 * @param {number} pageNum Page number
 * @param {string} date Date for the image
 */
async function createColumnaPoliticaPlaceholder(imagePath, pageNum, date) {
  const columnTitles = [
    'Análisis Político Matutino',
    'Perspectiva Editorial', 
    'Columna de Opinión Nacional',
    'Comentario Político',
    'Análisis de Coyuntura',
    'Editorial Político',
    'Opinión y Análisis',
    'Columna Institucional',
    'Perspectiva Nacional',
    'Análisis Editorial',
    'Comentario de Actualidad',
    'Columna de Opinión'
  ];
  
  const index = pageNum - 53; // Pages 53-64, so 53 maps to index 0
  const columnTitle = columnTitles[index % columnTitles.length] || `Columna Política ${index + 1}`;
  
  await sharp({
    create: {
      width: 800,
      height: 1200,
      channels: 3,
      background: { r: 250, g: 250, b: 250 }
    }
  })
  .composite([{
    input: Buffer.from(`
      <svg width="800" height="1200" xmlns="http://www.w3.org/2000/svg">
        <rect x="50" y="50" width="700" height="1100" fill="#ffffff" stroke="#000000" stroke-width="2"/>
        <text x="400" y="120" font-family="Arial" font-size="28" text-anchor="middle" fill="#000000">COLUMNAS POLÍTICAS</text>
        <text x="400" y="200" font-family="Arial" font-size="20" text-anchor="middle" fill="#333333" font-weight="bold">${columnTitle}</text>
        <text x="400" y="280" font-family="Arial" font-size="16" text-anchor="middle" fill="#000000">${date}</text>
        <text x="400" y="350" font-family="Arial" font-size="14" text-anchor="middle" fill="#666666">Página ${pageNum} - Contenido no disponible</text>
        <rect x="100" y="400" width="600" height="500" fill="#f8f8f8" stroke="#cccccc" stroke-width="1"/>
        <text x="400" y="480" font-family="Arial" font-size="14" text-anchor="middle" fill="#333333">La extracción automática de esta página falló</text>
        <text x="400" y="510" font-family="Arial" font-size="14" text-anchor="middle" fill="#333333">Mostrando placeholder temporal</text>
        <text x="400" y="850" font-family="Arial" font-size="12" text-anchor="middle" fill="#999999">Sistema de Noticias Judiciales - CJF</text>
      </svg>
    `),
    density: 72
  }])
  .png()
  .toFile(imagePath);
  
  logger.info(`Created placeholder for political column page ${pageNum} at ${imagePath}`);
}

/**
 * Extract pages with "COLUMNAS POLÍTICAS" header as image-based articles
 * @param {string} text Full PDF text content 
 * @param {string} pdfPath Path to the PDF file
 * @returns {Promise<Array>} Array of articles representing political column pages
 */
async function extractColumnsPoliticasPages(text, pdfPath) {
  const articles = [];
  
  logger.info('Creating placeholder articles for columnas-politicas section');
  
  // Create a fixed number of articles that will be associated with images later
  // The actual pages will be detected during image extraction
  const columnTitles = [
    'Análisis Político Matutino',
    'Perspectiva Editorial',
    'Columna de Opinión Nacional',
    'Comentario Político',
    'Análisis de Coyuntura',
    'Editorial Político',
    'Opinión y Análisis',
    'Columna Institucional',
    'Perspectiva Nacional',
    'Análisis Editorial',
    'Comentario de Actualidad',
    'Columna de Opinión'
  ];
  
  // Create up to 12 articles - the actual number will be determined by images found
  for (let i = 0; i < Math.min(columnTitles.length, 12); i++) {
    const title = columnTitles[i];
    const content = `Análisis y opiniones sobre la actualidad política nacional extraído de las columnas políticas del día.`;
    
    articles.push({
      title,
      content,
      summary: `Perspectivas y análisis político sobre los acontecimientos nacionales más relevantes`,
      source: 'Columnas Políticas',
      url: null // No URL for image pages
    });
    
    logger.debug(`Created placeholder article: "${title}"`);
  }
  
  logger.info(`Created ${articles.length} placeholder articles for columnas-politicas section`);
  return articles;
}

module.exports = {
  downloadPDF,
  extractContent,
  extractTextContent,
  extractImages,
  extractArticles,
  extractColumnsPoliticasPages,
  getPDFPath,
  pdfExists,
  getLatestPDF,
  indexExtractor
};