/**
 * PDF Index Extraction Demo
 * 
 * This script demonstrates how to extract the index information from a PDF file
 * and map it to page ranges.
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { extractContent, getLatestPDF } = require('../server/src/services/pdf/pdfExtractor');
const { getAllSections, getSectionByName, getSectionByPage } = require('../server/src/services/pdf/indexExtractor');

// Configuration
const PDF_DIR = path.join(__dirname, '../storage/pdf');

/**
 * Main function to demonstrate index extraction
 */
async function main() {
  try {
    console.log('PDF Index Extraction Demo');
    console.log('========================\n');
    
    // Get the latest PDF file
    const pdfPath = getLatestPDF();
    
    if (!pdfPath) {
      console.error('No PDF files found in the storage directory.');
      process.exit(1);
    }
    
    console.log(`Using PDF file: ${pdfPath}`);
    console.log('Extracting content...\n');
    
    // Extract content including index information
    const content = await extractContent(pdfPath);
    
    // Display index information
    console.log('Index Information:');
    console.log('=================');
    
    content.index.forEach(section => {
      console.log(`${section.name} (${section.id}): Pages ${section.pages.start}-${section.pages.end}`);
    });
    
    console.log('\nDemonstrating section lookup by name:');
    console.log('==================================');
    
    // Demonstrate looking up sections by name
    const sectionNames = [
      'OCHO COLUMNAS',
      'CJF',  // Alias for CONSEJO DE LA JUDICATURA FEDERAL
      'SUPREMA CORTE DE JUSTICIA DE LA NACIÓN',
      'DOF'   // Alias for PUBLICACIONES OFICIALES DOF
    ];
    
    sectionNames.forEach(name => {
      const section = getSectionByName(name);
      if (section) {
        console.log(`Section "${name}" found: ${section.name} (Pages ${section.pages.start}-${section.pages.end})`);
      } else {
        console.log(`Section "${name}" not found.`);
      }
    });
    
    console.log('\nDemonstrating section lookup by page:');
    console.log('==================================');
    
    // Demonstrate looking up sections by page number
    const pageNumbers = [3, 15, 30, 45, 55, 70];
    
    pageNumbers.forEach(pageNum => {
      const section = getSectionByPage(pageNum);
      if (section) {
        console.log(`Page ${pageNum} belongs to section: ${section.name} (Pages ${section.pages.start}-${section.pages.end})`);
      } else {
        console.log(`No section found for page ${pageNum}.`);
      }
    });
    
    console.log('\nExtraction completed successfully.');
  } catch (error) {
    console.error('Error extracting index:', error.message);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

module.exports = { main };