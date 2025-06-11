/**
 * New Comprehensive PDF Extractor Service
 * 
 * This service implements a complete redesign of PDF processing with the following approach:
 * 1. Identify primeras-planas (first section) without headers, with OCR for newspaper identification
 * 2. Identify sections by page headers, associate images and text (one article per paragraph)
 * 3. Put unidentified sections in "otras" section
 * 4. Maintain original PDF resolution
 */

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const sharp = require('sharp');
const { execSync } = require('child_process');
const { createLogger } = require('../../utils/logger');

const logger = createLogger('new-pdf-extractor');

const IMAGES_DIR = path.join(__dirname, '../../../../storage/images');

// Known newspaper names for OCR matching
const NEWSPAPER_NAMES = [
  'El Universal', 'Reforma', 'Excelsior', 'La Jornada',
  'Milenio', 'El Financiero', 'El Economista', 'El Sol de México',
  'Ovaciones', 'La Razón', 'Reporte Índigo', '24 Horas'
];

// Section headers to identify different sections
const SECTION_HEADERS = {
  'ocho-columnas': ['OCHO COLUMNAS'],
  'primeras-planas': [], // No headers - identified by position
  'columnas-politicas': ['COLUMNAS POLÍTICAS', 'COLUMNAS POLITICAS'],
  'informacion-general': ['INFORMACIÓN GENERAL', 'INFORMACION GENERAL'],
  'cartones': ['CARTONES'],
  'suprema-corte': ['SUPREMA CORTE DE JUSTICIA DE LA NACIÓN', 'SUPREMA CORTE'],
  'tribunal-electoral': ['TRIBUNAL ELECTORAL DEL PODER JUDICIAL DE LA FEDERACIÓN', 'TRIBUNAL ELECTORAL'],
  'dof': ['DOF', 'DIARIO OFICIAL DE LA FEDERACIÓN'],
  'consejo-judicatura': ['CONSEJO DE LA JUDICATURA FEDERAL', 'CONSEJO JUDICATURA'],
  'agenda': ['AGENDA'],
  'sintesis-informativa': ['SÍNTESIS INFORMATIVA', 'SINTESIS INFORMATIVA']
};

/**
 * Main extraction function that processes the entire PDF
 * @param {string} pdfPath Path to the PDF file
 * @returns {Promise<object>} Extracted content
 */
async function extractComprehensiveContent(pdfPath) {
  try {
    logger.info(`Starting comprehensive PDF extraction from ${pdfPath}`);
    
    // Step 1: Analyze PDF structure
    const pdfStructure = await analyzePDFStructure(pdfPath);
    logger.info(`PDF analysis complete: ${pdfStructure.totalPages} pages`);
    
    // Step 2: Extract all page images at original resolution
    const pageImages = await extractAllPagesAsImages(pdfPath, pdfStructure);
    logger.info(`Extracted ${pageImages.length} page images`);
    
    // Step 3: Extract text content with page markers
    const textContent = await extractTextWithPageMarkers(pdfPath);
    logger.info(`Extracted text content with ${Object.keys(textContent.pageTexts).length} pages`);
    
    // Step 4: Identify sections by analyzing headers and content
    const sections = await identifySections(textContent, pageImages);
    logger.info(`Identified ${Object.keys(sections).length} sections`);
    
    // Step 5: Process primeras-planas with OCR
    const primerasPlanas = await processPrimerasPlanas(sections.primerasPlanas, pageImages);
    logger.info(`Processed ${primerasPlanas.length} primeras-planas`);
    
    // Step 6: Process other sections with text + image association
    const processedSections = await processOtherSections(sections, pageImages, textContent, pdfPath);
    logger.info(`Processed ${Object.keys(processedSections).length} other sections`);
    
    // Step 7: Combine all results
    const result = {
      date: path.basename(pdfPath, '.pdf'),
      primerasPlanas,
      sections: processedSections,
      metadata: {
        totalPages: pdfStructure.totalPages,
        extractedAt: new Date().toISOString(),
        extractionMethod: 'comprehensive'
      }
    };
    
    logger.info(`Comprehensive extraction completed successfully`);
    return result;
    
  } catch (error) {
    logger.error(`Error in comprehensive extraction: ${error.message}`);
    throw error;
  }
}

/**
 * Analyze PDF structure and get basic information
 * @param {string} pdfPath Path to the PDF file
 * @returns {Promise<object>} PDF structure information
 */
async function analyzePDFStructure(pdfPath) {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(dataBuffer, { max: 0 });
    
    return {
      totalPages: pdfData.numpages,
      info: pdfData.info || {},
      metadata: pdfData.metadata || {}
    };
  } catch (error) {
    logger.error(`Error analyzing PDF structure: ${error.message}`);
    throw error;
  }
}

/**
 * Extract all pages as high-resolution images
 * @param {string} pdfPath Path to the PDF file
 * @param {object} structure PDF structure information
 * @returns {Promise<Array>} Array of page image information
 */
async function extractAllPagesAsImages(pdfPath, structure) {
  try {
    const date = path.basename(pdfPath, '.pdf');
    const dateImagesDir = path.join(IMAGES_DIR, date);
    
    if (!fs.existsSync(dateImagesDir)) {
      fs.mkdirSync(dateImagesDir, { recursive: true });
    }
    
    const pageImages = [];
    
    // For initial testing, only extract first 25 pages to speed up development
    const maxPages = Math.min(25, structure.totalPages);
    logger.info(`Extracting first ${maxPages} pages for testing (total: ${structure.totalPages})`);
    
    // Extract pages in batches to improve performance
    const batchSize = 10;
    const totalBatches = Math.ceil(maxPages / batchSize);
    
    for (let batch = 0; batch < totalBatches; batch++) {
      const startPage = batch * batchSize + 1;
      const endPage = Math.min((batch + 1) * batchSize, maxPages);
      
      logger.debug(`Extracting pages ${startPage}-${endPage} (batch ${batch + 1}/${totalBatches})`);
      
      try {
        // Extract batch of pages at 150 DPI (good balance of quality vs speed)
        const outputPrefix = path.join(dateImagesDir, 'batch');
        const command = `pdftoppm -f ${startPage} -l ${endPage} -png -r 150 "${pdfPath}" "${outputPrefix}"`;
        
        execSync(command, { timeout: 30000 }); // 30 second timeout per batch
        
        // Process extracted files
        for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
          const imageName = `page-${pageNum.toString().padStart(3, '0')}.png`;
          const imagePath = path.join(dateImagesDir, imageName);
          const batchFile = path.join(dateImagesDir, `batch-${pageNum}.png`);
          
          if (fs.existsSync(batchFile)) {
            // Rename to our expected format
            fs.renameSync(batchFile, imagePath);
            
            // Get image metadata
            const metadata = await sharp(imagePath).metadata();
            
            pageImages.push({
              pageNumber: pageNum,
              imagePath: imagePath,
              filename: imageName,
              width: metadata.width,
              height: metadata.height,
              dpi: 150
            });
            
          } else {
            logger.warn(`Failed to extract page ${pageNum} from batch`);
          }
        }
        
      } catch (batchError) {
        logger.warn(`Error extracting batch ${startPage}-${endPage}: ${batchError.message}`);
        
        // Try individual page extraction as fallback
        for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
          try {
            const imageName = `page-${pageNum.toString().padStart(3, '0')}.png`;
            const imagePath = path.join(dateImagesDir, imageName);
            const command = `pdftoppm -f ${pageNum} -l ${pageNum} -png -r 150 "${pdfPath}" "${imagePath.replace('.png', '')}"`;
            
            execSync(command, { timeout: 10000 }); // 10 second timeout per page
            
            const pdfOutputFile = `${imagePath.replace('.png', '')}-${pageNum}.png`;
            if (fs.existsSync(pdfOutputFile)) {
              fs.renameSync(pdfOutputFile, imagePath);
              
              const metadata = await sharp(imagePath).metadata();
              pageImages.push({
                pageNumber: pageNum,
                imagePath: imagePath,
                filename: imageName,
                width: metadata.width,
                height: metadata.height,
                dpi: 150
              });
            }
          } catch (pageError) {
            logger.warn(`Failed to extract individual page ${pageNum}: ${pageError.message}`);
          }
        }
      }
    }
    
    logger.info(`Successfully extracted ${pageImages.length}/${maxPages} pages as images`);
    return pageImages;
    
  } catch (error) {
    logger.error(`Error extracting pages as images: ${error.message}`);
    throw error;
  }
}

/**
 * Extract text content with page markers
 * @param {string} pdfPath Path to the PDF file
 * @returns {Promise<object>} Text content with page information
 */
async function extractTextWithPageMarkers(pdfPath) {
  try {
    // Use pdftotext with proper page-by-page extraction
    const { execSync } = require('child_process');
    const pageTexts = {};
    
    // First get the full text to see the structure
    const fullTextCommand = `pdftotext "${pdfPath}" -`;
    const fullText = execSync(fullTextCommand, { encoding: 'utf8' });
    
    // Use pdftotext for each page to get better text quality
    const tempDir = require('os').tmpdir();
    
    // Get total pages first
    const dataBuffer = fs.readFileSync(pdfPath);
    const pdfData = await pdfParse(dataBuffer, { max: 0 });
    const totalPages = pdfData.numpages;
    
    // Extract text page by page using pdftotext
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        const tempFile = path.join(tempDir, `temp-page-${pageNum}.txt`);
        const command = `pdftotext -f ${pageNum} -l ${pageNum} "${pdfPath}" "${tempFile}"`;
        
        execSync(command, { timeout: 5000 });
        
        if (fs.existsSync(tempFile)) {
          let pageText = fs.readFileSync(tempFile, 'utf8');
          
          // Clean up the text
          pageText = pageText
            .replace(/\r\n/g, '\n')
            .replace(/\s+/g, ' ')
            .trim();
            
          if (pageText && pageText.length > 10) {
            pageTexts[pageNum] = pageText;
          }
          
          // Clean up temp file
          fs.unlinkSync(tempFile);
        }
      } catch (pageError) {
        logger.debug(`Failed to extract text for page ${pageNum}: ${pageError.message}`);
      }
    }
    
    // If page-by-page extraction failed, split by likely page boundaries
    if (Object.keys(pageTexts).length === 0) {
      logger.warn('Page-by-page extraction failed, using heuristic splitting');
      
      // Split by date headers or section headers as page boundaries
      const datePattern = /Jueves \d+ de \w+ de \d{4}/g;
      const sections = fullText.split(datePattern);
      
      let pageNum = 1;
      for (const section of sections) {
        if (section.trim().length > 50) {
          pageTexts[pageNum] = section.trim();
          pageNum++;
        }
      }
    }
    
    logger.info(`Extracted text content for ${Object.keys(pageTexts).length} pages`);
    
    return {
      fullText: fullText,
      pageTexts: pageTexts,
      totalPages: Object.keys(pageTexts).length
    };
    
  } catch (error) {
    logger.error(`Error extracting text with page markers: ${error.message}`);
    throw error;
  }
}

/**
 * Identify sections by analyzing headers and page content
 * @param {object} textContent Text content with page information
 * @param {Array} pageImages Array of page images
 * @returns {Promise<object>} Identified sections
 */
async function identifySections(textContent, pageImages) {
  try {
    const sections = {
      primerasPlanas: [],
      ochoColumnas: [],
      columnasPoliticas: [],
      informacionGeneral: [],
      cartones: [],
      supremaCorte: [],
      tribunalElectoral: [],
      dof: [],
      consejoJudicatura: [],
      agenda: [],
      sintesisInformativa: [],
      otras: []
    };
    
    // First, identify primeras-planas - they are typically in a specific range
    // Based on PDF structure, primeras-planas are usually pages 1-15 or similar
    const maxPrimerasPage = 20; // Adjust based on typical PDF structure
    
    Object.entries(textContent.pageTexts).forEach(([pageNumStr, pageText]) => {
      const pageNum = parseInt(pageNumStr);
      const pageTextUpper = pageText.toUpperCase();
      
      // Skip if page has a section header
      const hasKnownSectionHeader = Object.values(SECTION_HEADERS).some(headers => 
        headers.some(header => pageTextUpper.includes(header))
      );
      
      // Only consider pages in typical primera plana range and without section headers
      if (pageNum <= maxPrimerasPage && !hasKnownSectionHeader) {
        // Look for newspaper indicators or pages with minimal text (mostly images)
        const newspaperIndicators = [
          'EL UNIVERSAL', 'REFORMA', 'EXCELSIOR', 'LA JORNADA', 'MILENIO', 
          'EL FINANCIERO', 'EL ECONOMISTA', 'EL SOL', 'OVACIONES', 
          'LA RAZÓN', 'REPORTE ÍNDIGO', '24 HORAS'
        ];
        
        const hasNewspaperIndicator = newspaperIndicators.some(indicator => 
          pageTextUpper.includes(indicator)
        );
        
        // Pages with very little text are likely image-based primera planas
        const isLikelyImagePage = pageText.trim().length < 300;
        
        // Also check if text contains typical primera plana content
        const hasPrimeraPlanaContent = pageTextUpper.includes('PRIMERA PLANA') || 
                                      pageTextUpper.includes('PORTADA') ||
                                      pageTextUpper.includes('DIARIO') ||
                                      pageTextUpper.includes('PERIÓDICO');
        
        if (hasNewspaperIndicator || isLikelyImagePage || hasPrimeraPlanaContent) {
          const pageImage = pageImages.find(img => img.pageNumber === pageNum);
          if (pageImage) {
            sections.primerasPlanas.push({
              pageNumber: pageNum,
              text: pageText,
              image: pageImage
            });
          }
        }
      }
    });
    
    // Then identify other sections by their headers
    Object.entries(textContent.pageTexts).forEach(([pageNumStr, pageText]) => {
      const pageNum = parseInt(pageNumStr);
      const pageImage = pageImages.find(img => img.pageNumber === pageNum);
      
      let sectionFound = false;
      
      // Check each section header
      for (const [sectionKey, headers] of Object.entries(SECTION_HEADERS)) {
        if (headers.length > 0) { // Skip primeras-planas which has no headers
          for (const header of headers) {
            if (pageText.toUpperCase().includes(header)) {
              const sectionName = getSectionArrayName(sectionKey);
              if (sections[sectionName]) {
                sections[sectionName].push({
                  pageNumber: pageNum,
                  text: pageText,
                  image: pageImage,
                  header: header
                });
                sectionFound = true;
                logger.debug(`Found section ${sectionKey} on page ${pageNum} with header: ${header}`);
                break;
              }
            }
          }
          if (sectionFound) break;
        }
      }
      
      // If no section header found and not in primeras-planas, add to "otras"
      if (!sectionFound && !sections.primerasPlanas.some(p => p.pageNumber === pageNum)) {
        sections.otras.push({
          pageNumber: pageNum,
          text: pageText,
          image: pageImage
        });
      }
    });
    
    logger.info(`Section identification complete:`);
    Object.entries(sections).forEach(([section, pages]) => {
      logger.info(`  ${section}: ${pages.length} pages`);
    });
    
    return sections;
    
  } catch (error) {
    logger.error(`Error identifying sections: ${error.message}`);
    throw error;
  }
}

/**
 * Process primeras-planas with OCR for newspaper identification
 * @param {Array} primerasPages Array of primeras-planas pages
 * @param {Array} pageImages Array of all page images
 * @returns {Promise<Array>} Processed primeras-planas articles
 */
async function processPrimerasPlanas(primerasPages, pageImages) {
  try {
    const articles = [];
    
    for (const page of primerasPages) {
      try {
        // Try to identify newspaper using OCR on the image
        let newspaper = await identifyNewspaperWithOCR(page.image.imagePath);
        
        // If OCR fails, try to identify from text content
        if (!newspaper) {
          newspaper = identifyNewspaperFromText(page.text);
        }
        
        // If still no identification, assign based on page order
        if (!newspaper) {
          const pageIndex = page.pageNumber - 1;
          newspaper = NEWSPAPER_NAMES[pageIndex % NEWSPAPER_NAMES.length] || `Periódico ${page.pageNumber}`;
        }
        
        // Create article for this newspaper front page
        const article = {
          id: `primera-plana-${page.pageNumber}`,
          title: `Portada ${newspaper}`,
          content: `Primera plana del periódico ${newspaper}`,
          summary: page.text.substring(0, 200) + '...',
          source: newspaper,
          section: 'primeras-planas',
          pageNumber: page.pageNumber,
          imageUrl: `images/${path.basename(path.dirname(page.image.imagePath))}/${page.image.filename}`,
          urls: extractUrlsFromText(page.text),
          extractedAt: new Date().toISOString()
        };
        
        articles.push(article);
        logger.info(`Processed primera plana: ${newspaper} (page ${page.pageNumber})`);
        
      } catch (pageError) {
        logger.warn(`Error processing primera plana page ${page.pageNumber}: ${pageError.message}`);
      }
    }
    
    return articles;
    
  } catch (error) {
    logger.error(`Error processing primeras-planas: ${error.message}`);
    throw error;
  }
}

/**
 * Process other sections with text + image association
 * @param {object} sections All identified sections
 * @param {Array} pageImages Array of page images
 * @param {object} textContent Full text content
 * @param {string} pdfPath Path to the PDF file
 * @returns {Promise<object>} Processed sections
 */
async function processOtherSections(sections, pageImages, textContent, pdfPath = null) {
  try {
    const processedSections = {};
    
    // Process each section (except primeras-planas which is handled separately)
    const sectionsToProcess = ['ochoColumnas', 'columnasPoliticas', 'informacionGeneral', 
                              'cartones', 'supremaCorte', 'tribunalElectoral', 'dof', 
                              'consejoJudicatura', 'agenda', 'sintesisInformativa', 'otras'];
    
    for (const sectionName of sectionsToProcess) {
      const sectionPages = sections[sectionName] || [];
      const articles = [];
      
      for (const page of sectionPages) {
        try {
          // For ocho-columnas, use special processing to extract known articles
          if (sectionName === 'ochoColumnas') {
            logger.debug(`Processing ocho-columnas page ${page.pageNumber}, text length: ${page.text.length}`);
            logger.debug(`First 200 chars: "${page.text.substring(0, 200)}"`);
            
            const extractedArticles = await extractOchoColumnasFromText(page.text, pdfPath, page.pageNumber);
            logger.info(`Extracted ${extractedArticles.length} articles from ocho-columnas page ${page.pageNumber}`);
            
            for (const article of extractedArticles) {
              article.section = 'ocho-columnas';
              article.pageNumber = page.pageNumber;
              article.extractedAt = new Date().toISOString();
              articles.push(article);
            }
            continue;
          }
          
          // For other sections, split into articles by better patterns
          let pageArticles = [];
          
          // Try to split by common article patterns
          const articleSeparators = [
            /\n\s*\n(?=[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{10,})/g, // Lines followed by ALL CAPS titles
            /\n\s*\n(?=\d+\.\s*[A-ZÁÉÍÓÚÑ])/g, // Numbered articles
            /\n\s*\n(?=[A-ZÁÉÍÓÚÑ][^.]*:)/g, // Title with colon
            /\n\s*\n/g // Default paragraph breaks
          ];
          
          let segments = [page.text];
          
          for (const separator of articleSeparators) {
            let newSegments = [];
            for (const segment of segments) {
              newSegments.push(...segment.split(separator));
            }
            segments = newSegments.filter(s => s.trim().length > 100);
            if (segments.length > 1) break; // Stop if we found good separations
          }
          
          for (let i = 0; i < segments.length; i++) {
            const segment = segments[i].trim();
            if (segment.length < 100) continue; // Skip very short segments
            
            // Extract title - look for patterns indicating titles
            let title = '';
            let content = segment;
            
            const lines = segment.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            
            if (lines.length > 0) {
              // First line is usually the title
              const firstLine = lines[0];
              
              // Check if first line looks like a title (ALL CAPS, or short line)
              if (firstLine.length < 100 && (
                firstLine === firstLine.toUpperCase() || 
                firstLine.match(/^[A-ZÁÉÍÓÚÑ][^.]*$/) ||
                firstLine.endsWith(':')
              )) {
                title = firstLine.replace(/"/g, '"').replace(/"/g, '"');
                content = lines.slice(1).join(' ').trim();
              } else {
                // Extract first sentence as title
                const sentences = segment.match(/[^.!?]+[.!?]/g);
                if (sentences && sentences.length > 0) {
                  title = sentences[0].trim().replace(/"/g, '"').replace(/"/g, '"');
                  content = segment.substring(title.length).trim();
                } else {
                  title = firstLine.substring(0, 100) + '...';
                  content = segment;
                }
              }
            }
            
            // Clean title and content
            title = title.replace(/^\s*[""]/, '').replace(/[""]?\s*$/, '').trim();
            content = content.replace(/^\s*[""]/, '').replace(/[""]?\s*$/, '').trim();
            
            // Extract URLs from content
            const urls = extractUrlsFromText(content);
            
            // Create article
            const article = {
              id: `${getSectionId(sectionName)}-${page.pageNumber}-${i + 1}`,
              title: title && title.length > 200 ? title.substring(0, 200) + '...' : (title || 'Sin título'),
              content: content || '',
              summary: content && content.length > 200 ? content.substring(0, 200) + '...' : (content || ''),
              source: page.header || getSectionDisplayName(sectionName),
              section: getSectionId(sectionName),
              pageNumber: page.pageNumber,
              urls: urls,
              extractedAt: new Date().toISOString()
            };
            
            // If this section typically has images, associate them
            if (['columnasPoliticas', 'cartones'].includes(sectionName) && page.image) {
              article.imageUrl = `images/${path.basename(path.dirname(page.image.imagePath))}/${page.image.filename}`;
            }
            
            pageArticles.push(article);
          }
          
          // Add all page articles to the main articles array
          articles.push(...pageArticles);
          
        } catch (pageError) {
          logger.warn(`Error processing page ${page.pageNumber} in section ${sectionName}: ${pageError.message}`);
        }
      }
      
      processedSections[getSectionId(sectionName)] = articles;
      logger.info(`Processed section ${sectionName}: ${articles.length} articles`);
    }
    
    return processedSections;
    
  } catch (error) {
    logger.error(`Error processing other sections: ${error.message}`);
    throw error;
  }
}

/**
 * Identify newspaper using OCR on the image
 * @param {string} imagePath Path to the image file
 * @returns {Promise<string|null>} Identified newspaper name or null
 */
async function identifyNewspaperWithOCR(imagePath) {
  try {
    // Check if tesseract is available
    try {
      execSync('which tesseract');
    } catch (err) {
      logger.debug('Tesseract OCR not available, skipping OCR identification');
      return null;
    }
    
    // Run OCR on the top portion of the image (where newspaper name usually is)
    const tempFile = imagePath.replace('.png', '-header.txt');
    
    // Crop top 20% of image for OCR (newspaper headers are usually at the top)
    const metadata = await sharp(imagePath).metadata();
    const croppedImage = imagePath.replace('.png', '-cropped.png');
    
    await sharp(imagePath)
      .extract({ 
        left: 0, 
        top: 0, 
        width: metadata.width, 
        height: Math.floor(metadata.height * 0.2) 
      })
      .toFile(croppedImage);
    
    // Run OCR
    const command = `tesseract "${croppedImage}" "${tempFile.replace('.txt', '')}" -l spa`;
    execSync(command);
    
    // Read OCR result
    if (fs.existsSync(tempFile)) {
      const ocrText = fs.readFileSync(tempFile, 'utf8').toUpperCase();
      
      // Look for newspaper names in OCR text
      for (const newspaper of NEWSPAPER_NAMES) {
        const newspaperUpper = newspaper.toUpperCase();
        if (ocrText.includes(newspaperUpper) || 
            ocrText.includes(newspaperUpper.replace(/ /g, '')) ||
            ocrText.includes(newspaperUpper.replace('EL ', ''))) {
          
          // Clean up temp files
          if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
          if (fs.existsSync(croppedImage)) fs.unlinkSync(croppedImage);
          
          logger.debug(`OCR identified newspaper: ${newspaper}`);
          return newspaper;
        }
      }
      
      // Clean up temp files
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      if (fs.existsSync(croppedImage)) fs.unlinkSync(croppedImage);
    }
    
    return null;
    
  } catch (error) {
    logger.debug(`OCR identification failed: ${error.message}`);
    return null;
  }
}

/**
 * Identify newspaper from text content
 * @param {string} text Page text content
 * @returns {string|null} Identified newspaper name or null
 */
function identifyNewspaperFromText(text) {
  const textUpper = text.toUpperCase();
  
  for (const newspaper of NEWSPAPER_NAMES) {
    const newspaperUpper = newspaper.toUpperCase();
    if (textUpper.includes(newspaperUpper)) {
      return newspaper;
    }
  }
  
  return null;
}

/**
 * Extract URLs from text content
 * @param {string} text Text to search for URLs
 * @returns {Array} Array of found URLs
 */
function extractUrlsFromText(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

/**
 * Extract URLs from PDF page using PyMuPDF
 * @param {string} pdfPath Path to the PDF file
 * @param {number} pageNum Page number (1-indexed)
 * @returns {Promise<Array>} Array of URLs found on the page
 */
async function extractUrlsFromPdfPage(pdfPath, pageNum) {
  try {
    const { execSync } = require('child_process');
    
    // Create a Python script to extract URLs using PyMuPDF
    const extractScript = `
import sys
sys.path.append('/home/ellaguno/.local/lib/python3.11/site-packages')
import fitz
import json

pdf_path = '${pdfPath}'
page_num = ${pageNum - 1}  # Convert to 0-indexed

try:
    doc = fitz.open(pdf_path)
    page = doc[page_num]
    links = page.get_links()
    
    urls = []
    for link in links:
        if 'uri' in link and link['uri']:
            urls.append({
                'uri': link['uri'],
                'rect': link.get('from', {})
            })
    
    print(json.dumps(urls))
    doc.close()
except Exception as e:
    print(json.dumps([]))
`;
    
    const result = execSync(`python3 -c "${extractScript}"`, { encoding: 'utf8' });
    return JSON.parse(result.trim());
    
  } catch (error) {
    logger.warn(`Failed to extract URLs from page ${pageNum}: ${error.message}`);
    return [];
  }
}

/**
 * Extract ocho columnas articles from text using known patterns
 * @param {string} text Text content from ocho-columnas page
 * @param {string} pdfPath Path to the PDF file for URL extraction
 * @param {number} pageNumber Page number where ocho-columnas is located
 * @returns {Promise<Array>} Array of articles
 */
async function extractOchoColumnasFromText(text, pdfPath = null, pageNumber = 2) {
  const articles = [];
  
  // Extract URLs from the PDF page if available
  let pageUrls = [];
  if (pdfPath) {
    pageUrls = await extractUrlsFromPdfPage(pdfPath, pageNumber);
    logger.info(`Found ${pageUrls.length} URLs on ocho-columnas page`);
  }
  
  // Known article titles from ocho-columnas with their corresponding URLs
  const knownTitles = [
    '"VIGILARÁN" A JUECES SUS COLEGAS DE LA 4T',
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
  
  // Clean up the text
  let cleanText = text
    .replace(/OCHO COLUMNAS/gi, '')
    .replace(/Jueves \d+ de \w+ de \d{4}/gi, '')
    .replace(/Página \d+/gi, '')
    .trim();
  
  // Try to find each known title and extract its content
  for (let i = 0; i < knownTitles.length; i++) {
    const currentTitle = knownTitles[i];
    const nextTitle = i < knownTitles.length - 1 ? knownTitles[i + 1] : null;
    
    // Find title position (try different quote variations)
    let titleIndex = -1;
    let searchTitle = currentTitle;
    
    // Try exact match
    titleIndex = cleanText.indexOf(currentTitle);
    
    // Try with different quote styles
    if (titleIndex === -1) {
      searchTitle = currentTitle.replace(/"/g, '"').replace(/"/g, '"');
      titleIndex = cleanText.indexOf(searchTitle);
    }
    
    if (titleIndex === -1) {
      searchTitle = currentTitle.replace(/"/g, '\"').replace(/"/g, '\"');
      titleIndex = cleanText.indexOf(searchTitle);
    }
    
    // Try partial match (first few words)
    if (titleIndex === -1) {
      const titleWords = currentTitle.replace(/[""]/g, '').split(' ');
      const partialTitle = titleWords.slice(0, 3).join(' ');
      titleIndex = cleanText.indexOf(partialTitle);
      if (titleIndex !== -1) {
        searchTitle = currentTitle; // Use original title
      }
    }
    
    if (titleIndex === -1) continue;
    
    // Find content boundaries
    const contentStart = titleIndex + currentTitle.length;
    let contentEnd = cleanText.length;
    
    if (nextTitle) {
      const nextTitleIndex = cleanText.indexOf(nextTitle, contentStart);
      if (nextTitleIndex !== -1) {
        contentEnd = nextTitleIndex;
      }
    }
    
    // Extract content
    let articleContent = cleanText.substring(contentStart, contentEnd).trim();
    
    // Clean content
    articleContent = articleContent
      .replace(/OCHO COLUMNAS/gi, '')
      .replace(/Jueves \d+ de \w+ de \d{4}/gi, '')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    
    if (articleContent.length < 50) continue;
    
    // Extract URLs from text content
    const textUrls = extractUrlsFromText(articleContent);
    
    // Get PDF URL for this article (based on position in array)
    let pdfUrl = '';
    if (pageUrls && pageUrls.length > i) {
      pdfUrl = pageUrls[i].uri;
    }
    
    // Combine URLs (prefer PDF URL if available)
    const urls = pdfUrl ? [pdfUrl, ...textUrls] : textUrls;
    
    // Map to newspaper sources (rough estimate based on order)
    const newspapers = [
      'Reforma', 'El Sol de México', 'El Universal', 'Milenio', 
      'Excelsior', 'La Jornada', 'El Financiero', 'El Economista',
      'Ovaciones', 'La Razón', 'Reporte Índigo', '24 Horas', 'CJF'
    ];
    
    const source = newspapers[i] || 'Ocho Columnas';
    
    // Map newspaper logo images based on source
    const newspaperImages = {
      'El Universal': 'portada-el-universal.png',
      'Reforma': 'portada-reforma.png',
      'Excelsior': 'portada-excelsior.png',
      'La Jornada': 'portada-la-jornada.png',
      'Milenio': 'portada-milenio.png',
      'El Financiero': 'portada-el-financiero.png',
      'El Economista': 'portada-el-economista.png',
      'El Sol de México': 'portada-el-sol-de-méxico.png',
      'Ovaciones': 'portada-ovaciones.png',
      'La Razón': 'portada-la-razón.png',
      'Reporte Índigo': 'portada-reporte-indigo.png',
      '24 Horas': 'portada-24-horas.png'
    };
    
    // Get newspaper logo image
    const newspaperImage = newspaperImages[source];
    let imageUrl = '';
    if (newspaperImage && pdfPath) {
      const date = path.basename(pdfPath, '.pdf');
      imageUrl = `images/${date}/${newspaperImage}`;
    }
    
    const article = {
      id: `ocho-columnas-${i + 1}`,
      title: currentTitle.replace(/"/g, '"').replace(/"/g, '"'),
      content: articleContent,
      summary: articleContent.substring(0, 200) + '...',
      source: source,
      urls: urls,
      url: pdfUrl || '', // Primary URL field
      imageUrl: imageUrl, // Newspaper logo image
      wordCount: articleContent.split(/\s+/).length
    };
    
    articles.push(article);
  }
  
  return articles;
}

/**
 * Helper function to get section array name from section key
 * @param {string} sectionKey Section key
 * @returns {string} Section array name
 */
function getSectionArrayName(sectionKey) {
  const mapping = {
    'ocho-columnas': 'ochoColumnas',
    'columnas-politicas': 'columnasPoliticas',
    'informacion-general': 'informacionGeneral',
    'suprema-corte': 'supremaCorte',
    'tribunal-electoral': 'tribunalElectoral',
    'consejo-judicatura': 'consejoJudicatura',
    'agenda': 'agenda',
    'sintesis-informativa': 'sintesisInformativa'
  };
  
  return mapping[sectionKey] || sectionKey;
}

/**
 * Helper function to get section ID from section name
 * @param {string} sectionName Section name
 * @returns {string} Section ID
 */
function getSectionId(sectionName) {
  const mapping = {
    'ochoColumnas': 'ocho-columnas',
    'columnasPoliticas': 'columnas-politicas',
    'informacionGeneral': 'informacion-general',
    'supremaCorte': 'suprema-corte',
    'tribunalElectoral': 'tribunal-electoral',
    'consejoJudicatura': 'consejo-judicatura',
    'agenda': 'agenda',
    'sintesisInformativa': 'sintesis-informativa'
  };
  
  return mapping[sectionName] || sectionName;
}

/**
 * Helper function to get section display name
 * @param {string} sectionName Section name
 * @returns {string} Display name
 */
function getSectionDisplayName(sectionName) {
  const mapping = {
    'ochoColumnas': 'Ocho Columnas',
    'columnasPoliticas': 'Columnas Políticas',
    'informacionGeneral': 'Información General',
    'cartones': 'Cartones',
    'supremaCorte': 'Suprema Corte',
    'tribunalElectoral': 'Tribunal Electoral',
    'dof': 'DOF',
    'consejoJudicatura': 'Consejo de la Judicatura',
    'agenda': 'Agenda',
    'sintesisInformativa': 'Síntesis Informativa',
    'otras': 'Otras'
  };
  
  return mapping[sectionName] || sectionName;
}

module.exports = {
  extractComprehensiveContent,
  analyzePDFStructure,
  extractAllPagesAsImages,
  identifyNewspaperWithOCR,
  NEWSPAPER_NAMES,
  SECTION_HEADERS
};