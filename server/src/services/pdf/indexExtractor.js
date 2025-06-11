/**
 * PDF Index Extractor
 * 
 * This module extracts the index information from the first page of the PDF
 * and maps it to the corresponding page ranges using OCR and dynamic detection.
 */

const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const sharp = require('sharp');
const { createLogger } = require('../../utils/logger');

// Create logger for this service
const logger = createLogger('pdf-index-extractor');

/**
 * Fallback index structure for cases where dynamic extraction fails
 */
const FALLBACK_INDEX_STRUCTURE = [
  { id: 'ocho-columnas', name: 'OCHO COLUMNAS', pages: { start: 2, end: 4 }, type: 'text' },
  { id: 'primeras-planas', name: 'PRIMERAS PLANAS', pages: { start: 5, end: 25 }, type: 'image' },
  { id: 'agenda', name: 'AGENDA', pages: { start: 26, end: 27 }, type: 'text' },
  { id: 'consejo-judicatura', name: 'CONSEJO DE LA JUDICATURA FEDERAL', pages: { start: 28, end: 41 }, type: 'text' },
  { id: 'suprema-corte', name: 'SUPREMA CORTE DE JUSTICIA DE LA NACIÓN', pages: { start: 42, end: 48 }, type: 'text' },
  { id: 'informacion-general', name: 'INFORMACIÓN GENERAL', pages: { start: 49, end: 49 }, type: 'text' },
  { id: 'sintesis-informativa', name: 'SINTESIS INFORMATIVA', pages: { start: 50, end: 51 }, type: 'text' },
  { id: 'columnas-politicas', name: 'COLUMNAS POLÍTICAS', pages: { start: 53, end: 64 }, type: 'image' },
  { id: 'dof', name: 'PUBLICACIONES OFICIALES DOF', pages: { start: 63, end: 64 }, type: 'text' },
  { id: 'cartones', name: 'CARTONES', pages: { start: 65, end: 89 }, type: 'image' }
];

/**
 * Section patterns for dynamic recognition
 */
const SECTION_PATTERNS = [
  { pattern: /ocho\s+columnas/i, id: 'ocho-columnas', type: 'text' },
  { pattern: /primeras\s+planas/i, id: 'primeras-planas', type: 'image' },
  { pattern: /agenda/i, id: 'agenda', type: 'text' },
  { pattern: /consejo\s+de\s+la\s+judicatura/i, id: 'consejo-judicatura', type: 'text' },
  { pattern: /suprema\s+corte/i, id: 'suprema-corte', type: 'text' },
  { pattern: /tribunal\s+electoral/i, id: 'tribunal-electoral', type: 'text' },
  { pattern: /información\s+general/i, id: 'informacion-general', type: 'text' },
  { pattern: /síntesis\s+informativa/i, id: 'sintesis-informativa', type: 'text' },
  { pattern: /columnas\s+políticas/i, id: 'columnas-politicas', type: 'image' },
  { pattern: /dof|publicaciones\s+oficiales/i, id: 'dof', type: 'text' },
  { pattern: /cartones/i, id: 'cartones', type: 'image' }
];

/**
 * Alternative names for sections (for matching purposes)
 */
const SECTION_ALIASES = {
  'CJF': 'CONSEJO DE LA JUDICATURA FEDERAL',
  'SCJN': 'SUPREMA CORTE DE JUSTICIA DE LA NACIÓN',
  'TEPJF': 'TRIBUNAL ELECTORAL DEL PODER JUDICIAL DE LA FEDERACIÓN',
  'DOF': 'PUBLICACIONES OFICIALES DOF',
  'INFORMACIÓN GENERAL': 'UNNAMED SECTION',
  'SÍNTESIS INFORMATIVA': 'SINTESIS INFORMATIVA'
};

/**
 * Extract index information from the PDF using dynamic analysis
 * @param {string} filePath Path to the PDF file
 * @returns {Promise<Array>} Array of section objects with page ranges
 */
async function extractIndex(filePath) {
  try {
    logger.info(`Extracting index information from ${filePath}...`);
    
    const date = path.basename(filePath, '.pdf');
    logger.info(`Extracting index for date: ${date}`);
    
    // Try dynamic extraction first
    let indexStructure = null;
    
    try {
      indexStructure = await extractDynamicIndex(filePath);
      if (indexStructure && indexStructure.length > 0) {
        logger.info(`Successfully extracted dynamic index with ${indexStructure.length} sections`);
        return indexStructure;
      }
    } catch (error) {
      logger.warn(`Dynamic index extraction failed: ${error.message}`);
    }
    
    // Fallback to analyzing PDF structure
    try {
      indexStructure = await analyzePageStructure(filePath);
      if (indexStructure && indexStructure.length > 0) {
        logger.info(`Successfully extracted index using page analysis with ${indexStructure.length} sections`);
        return indexStructure;
      }
    } catch (error) {
      logger.warn(`Page structure analysis failed: ${error.message}`);
    }
    
    // Final fallback to predefined structure
    logger.warn('Using fallback index structure');
    return FALLBACK_INDEX_STRUCTURE;
  } catch (error) {
    logger.error(`Error extracting index information: ${error.message}`);
    return FALLBACK_INDEX_STRUCTURE;
  }
}

/**
 * Extract dynamic index from first page using text analysis
 * @param {string} filePath Path to the PDF file
 * @returns {Promise<Array>} Array of section objects with page ranges
 */
async function extractDynamicIndex(filePath) {
  logger.info('Attempting dynamic index extraction...');
  
  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(dataBuffer, {
    max: 1, // Only process first page
    pagerender: function(pageData) {
      return pageData.getTextContent().then(function(textContent) {
        let text = '';
        for (let item of textContent.items) {
          text += item.str + ' ';
        }
        return text;
      });
    }
  });
  
  const firstPageText = pdfData.text;
  logger.debug(`First page text (first 500 chars): ${firstPageText.substring(0, 500)}`);
  
  const sections = [];
  let currentPage = 2; // Start after index page
  
  // Look for section patterns in the text
  for (const sectionPattern of SECTION_PATTERNS) {
    const match = firstPageText.match(sectionPattern.pattern);
    if (match) {
      // Extract page numbers near the match
      const matchIndex = firstPageText.indexOf(match[0]);
      const contextStart = Math.max(0, matchIndex - 50);
      const contextEnd = Math.min(firstPageText.length, matchIndex + 100);
      const context = firstPageText.substring(contextStart, contextEnd);
      
      // Look for page numbers in the context
      const pageNumbers = context.match(/\b(\d{1,3})\b/g);
      
      if (pageNumbers && pageNumbers.length > 0) {
        const startPage = parseInt(pageNumbers[0]);
        const endPage = pageNumbers.length > 1 ? parseInt(pageNumbers[pageNumbers.length - 1]) : startPage + 5;
        
        sections.push({
          id: sectionPattern.id,
          name: match[0].toUpperCase(),
          pages: { start: startPage, end: endPage },
          type: sectionPattern.type
        });
        
        logger.info(`Found section: ${sectionPattern.id} (pages ${startPage}-${endPage})`);
      }
    }
  }
  
  return sections.length > 0 ? sections : null;
}

/**
 * Analyze PDF page structure to determine sections
 * @param {string} filePath Path to the PDF file
 * @returns {Promise<Array>} Array of section objects with page ranges
 */
async function analyzePageStructure(filePath) {
  logger.info('Analyzing PDF page structure...');
  
  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(dataBuffer, { max: 0 });
  
  const totalPages = pdfData.numpages;
  logger.info(`PDF has ${totalPages} pages`);
  
  // Calculate approximate sections based on page count
  const sections = [];
  let currentPage = 2;
  
  // Base sections with estimated page ranges
  const baseSections = [
    { id: 'ocho-columnas', name: 'OCHO COLUMNAS', estimatedPages: 3, type: 'text' },
    { id: 'primeras-planas', name: 'PRIMERAS PLANAS', estimatedPages: Math.floor(totalPages * 0.4), type: 'image' },
    { id: 'agenda', name: 'AGENDA', estimatedPages: 2, type: 'text' },
    { id: 'consejo-judicatura', name: 'CONSEJO DE LA JUDICATURA FEDERAL', estimatedPages: Math.floor(totalPages * 0.25), type: 'text' },
    { id: 'suprema-corte', name: 'SUPREMA CORTE DE JUSTICIA DE LA NACIÓN', estimatedPages: 7, type: 'text' },
    { id: 'informacion-general', name: 'INFORMACIÓN GENERAL', estimatedPages: 1, type: 'text' },
    { id: 'sintesis-informativa', name: 'SINTESIS INFORMATIVA', estimatedPages: 2, type: 'text' },
    { id: 'columnas-politicas', name: 'COLUMNAS POLÍTICAS', estimatedPages: 11, type: 'text' },
    { id: 'dof', name: 'PUBLICACIONES OFICIALES DOF', estimatedPages: 2, type: 'text' },
    { id: 'cartones', name: 'CARTONES', estimatedPages: Math.floor(totalPages * 0.2), type: 'image' }
  ];
  
  for (const section of baseSections) {
    const endPage = Math.min(currentPage + section.estimatedPages - 1, totalPages);
    
    sections.push({
      id: section.id,
      name: section.name,
      pages: { start: currentPage, end: endPage },
      type: section.type
    });
    
    currentPage = endPage + 1;
    
    if (currentPage > totalPages) break;
  }
  
  return sections;
}

/**
 * Get section by name
 * @param {string} sectionName Name of the section
 * @param {Array} indexStructure Optional index structure to search in
 * @returns {object|null} Section object or null if not found
 */
function getSectionByName(sectionName, indexStructure = FALLBACK_INDEX_STRUCTURE) {
  const normalizedName = sectionName.toUpperCase().trim();
  const resolvedName = SECTION_ALIASES[normalizedName] || normalizedName;
  
  return indexStructure.find(section => 
    section.name.toUpperCase() === resolvedName
  ) || null;
}

/**
 * Get section by page number
 * @param {number} pageNumber Page number
 * @param {Array} indexStructure Optional index structure to search in
 * @returns {object|null} Section object or null if not found
 */
function getSectionByPage(pageNumber, indexStructure = FALLBACK_INDEX_STRUCTURE) {
  return indexStructure.find(section => 
    pageNumber >= section.pages.start && pageNumber <= section.pages.end
  ) || null;
}

/**
 * Get all sections
 * @param {Array} indexStructure Optional index structure
 * @returns {Array} Array of all section objects
 */
function getAllSections(indexStructure = FALLBACK_INDEX_STRUCTURE) {
  return indexStructure;
}

/**
 * Detect if a section contains primarily text or images
 * @param {string} filePath Path to the PDF file
 * @param {object} section Section object with page range
 * @returns {Promise<string>} 'text', 'image', or 'mixed'
 */
async function detectSectionType(filePath, section) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    
    // Extract text from the section's pages
    let totalText = '';
    for (let pageNum = section.pages.start; pageNum <= section.pages.end; pageNum++) {
      try {
        // This is a simplified approach - in practice, you'd extract text page by page
        const pageData = await pdfParse(dataBuffer, {
          max: pageNum,
          pagerender: function(pageData) {
            return pageData.getTextContent().then(function(textContent) {
              let text = '';
              for (let item of textContent.items) {
                text += item.str + ' ';
              }
              return text;
            });
          }
        });
        
        totalText += pageData.text;
      } catch (error) {
        logger.warn(`Error extracting text from page ${pageNum}: ${error.message}`);
      }
    }
    
    const textLength = totalText.trim().length;
    const pageCount = section.pages.end - section.pages.start + 1;
    const avgTextPerPage = textLength / pageCount;
    
    // Heuristic: if average text per page is low, it's likely image-heavy
    if (avgTextPerPage < 100) {
      return 'image';
    } else if (avgTextPerPage > 500) {
      return 'text';
    } else {
      return 'mixed';
    }
  } catch (error) {
    logger.error(`Error detecting section type: ${error.message}`);
    return section.type || 'text'; // Fallback to predefined type
  }
}

module.exports = {
  extractIndex,
  extractDynamicIndex,
  analyzePageStructure,
  getSectionByName,
  getSectionByPage,
  getAllSections,
  detectSectionType,
  FALLBACK_INDEX_STRUCTURE,
  SECTION_PATTERNS
};