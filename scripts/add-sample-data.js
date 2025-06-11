/**
 * Add Sample Data Script
 * 
 * This script adds sample data to the database for demonstration purposes.
 * It creates sample articles for each section with today's date.
 */

require('dotenv').config();
const { run, query } = require('../server/database');

/**
 * Add sample articles to the database
 */
async function addSampleArticles() {
  try {
    console.log('Adding sample articles to the database...');
    
    // Get current date
    const today = new Date().toISOString().split('T')[0];
    
    // Define sections
    const sections = [
      'ocho-columnas', 
      'primeras-planas', 
      'columnas-politicas', 
      'informacion-general', 
      'cartones', 
      'suprema-corte', 
      'tribunal-electoral', 
      'dof', 
      'consejo-judicatura'
    ];
    
    // Add sample articles for each section
    for (const section of sections) {
      // Create 3 sample articles for each section
      for (let i = 1; i <= 3; i++) {
        const title = `Artículo de muestra ${i} para ${section}`;
        const content = `Este es un artículo de muestra para la sección ${section}. Este contenido es solo para propósitos de desarrollo y pruebas.
        
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam auctor, nisl eget ultricies tincidunt, nisl nisl aliquam nisl, eget ultricies nisl nisl eget nisl. Nullam auctor, nisl eget ultricies tincidunt, nisl nisl aliquam nisl, eget ultricies nisl nisl eget nisl.
        
        Este artículo fue generado automáticamente por el script de seeding.`;
        
        const summary = `Resumen del artículo de muestra ${i} para la sección ${section}. Este contenido es solo para propósitos de desarrollo.`;
        const source = `Fuente de prueba ${i}`;
        
        await run(
          `INSERT INTO ARTICLE (title, content, summary, source, section_id, publication_date) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [title, content, summary, source, section, today]
        );
        
        console.log(`Added sample article ${i} for section ${section}`);
      }
    }
    
    console.log('Sample articles added successfully.');
  } catch (error) {
    console.error('Error adding sample articles:', error.message);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Check if articles already exist
    const existingArticles = await query('SELECT COUNT(*) as count FROM ARTICLE');
    
    if (existingArticles[0].count > 0) {
      console.log('Articles already exist in the database. Do you want to add more sample articles?');
      console.log('If yes, run this script with the --force flag: node scripts/add-sample-data.js --force');
      
      if (!process.argv.includes('--force')) {
        return;
      }
    }
    
    // Add sample articles
    await addSampleArticles();
    
    console.log('Sample data added successfully.');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();