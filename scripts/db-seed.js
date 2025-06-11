/**
 * Database Seeding Script
 * 
 * This script populates the database with initial data for development and testing.
 * 
 * Usage:
 *   - To seed the database: node scripts/db-seed.js
 *   - To seed specific entities: node scripts/db-seed.js users sections
 */

const { run, query } = require('../server/database');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Constants
const SALT_ROUNDS = 10;

/**
 * Seed users
 */
async function seedUsers() {
  console.log('Seeding users...');
  
  try {
    // Check if users already exist
    const existingUsers = await query('SELECT COUNT(*) as count FROM USER');
    if (existingUsers[0].count > 0) {
      console.log('Users already exist, skipping user seeding.');
      return;
    }
    
    // Create admin user
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, SALT_ROUNDS);
    
    await run(
      `INSERT INTO USER (username, password, role, email)
       VALUES (?, ?, ?, ?)`,
      [
        'admin',
        hashedPassword,
        'admin',
        'admin@cjfnoticias.gob.mx'
      ]
    );
    
    // Create editor user
    const editorPassword = process.env.EDITOR_PASSWORD || 'editor123';
    const editorHashedPassword = await bcrypt.hash(editorPassword, SALT_ROUNDS);
    
    await run(
      `INSERT INTO USER (username, password, role, email)
       VALUES (?, ?, ?, ?)`,
      [
        'editor',
        editorHashedPassword,
        'editor',
        'editor@cjfnoticias.gob.mx'
      ]
    );
    
    console.log('Users seeded successfully.');
  } catch (error) {
    console.error('Error seeding users:', error.message);
  }
}

/**
 * Seed sections
 */
async function seedSections() {
  console.log('Seeding sections...');
  
  try {
    // Check if sections already exist
    const existingSections = await query('SELECT COUNT(*) as count FROM SECTION');
    if (existingSections[0].count > 0) {
      console.log('Sections already exist, skipping section seeding.');
      return;
    }
    
    // Define sections
    const sections = [
      { id: 'ocho-columnas', name: 'Ocho Columnas', description: 'Noticias principales de los diarios nacionales' },
      { id: 'primeras-planas', name: 'Primeras Planas', description: 'Portadas de los principales diarios' },
      { id: 'columnas-politicas', name: 'Columnas Políticas', description: 'Columnas de opinión política' },
      { id: 'informacion-general', name: 'Información General', description: 'Noticias generales' },
      { id: 'cartones', name: 'Cartones', description: 'Caricaturas políticas' },
      { id: 'suprema-corte', name: 'Suprema Corte de Justicia de la Nación', description: 'Noticias de la SCJN' },
      { id: 'tribunal-electoral', name: 'Tribunal Electoral del Poder Judicial de la Federación', description: 'Noticias del TEPJF' },
      { id: 'dof', name: 'DOF', description: 'Diario Oficial de la Federación' },
      { id: 'consejo-judicatura', name: 'Consejo de la Judicatura Federal', description: 'Noticias del CJF' }
    ];
    
    // Insert sections
    for (const section of sections) {
      await run(
        `INSERT INTO SECTION (id, name, description) VALUES (?, ?, ?)`,
        [section.id, section.name, section.description]
      );
    }
    
    console.log('Sections seeded successfully.');
  } catch (error) {
    console.error('Error seeding sections:', error.message);
  }
}

/**
 * Seed settings
 */
async function seedSettings() {
  console.log('Seeding settings...');
  
  try {
    // Check if settings already exist
    const existingSettings = await query('SELECT COUNT(*) as count FROM SETTINGS');
    if (existingSettings[0].count > 0) {
      console.log('Settings already exist, skipping settings seeding.');
      return;
    }
    
    // Define settings
    const settings = [
      { key: 'site_title', value: 'CJF Noticias Judiciales', description: 'Título del sitio' },
      { key: 'site_description', value: 'Portal de Noticias Judiciales del Consejo de la Judicatura Federal', description: 'Descripción del sitio' },
      { key: 'extraction_time', value: '08:00', description: 'Hora de extracción diaria (formato 24h)' },
      { key: 'pdf_url', value: 'https://www.cjf.gob.mx/documentos/diarios/sintetis.pdf', description: 'URL del PDF de noticias' },
      { key: 'maintenance_mode', value: 'false', description: 'Modo de mantenimiento (true/false)' },
      { key: 'items_per_page', value: '10', description: 'Número de elementos por página' },
      { key: 'contact_email', value: 'contacto@cjfnoticias.gob.mx', description: 'Email de contacto' }
    ];
    
    // Insert settings
    for (const setting of settings) {
      await run(
        `INSERT INTO SETTINGS (key, value, description) VALUES (?, ?, ?)`,
        [setting.key, setting.value, setting.description]
      );
    }
    
    console.log('Settings seeded successfully.');
  } catch (error) {
    console.error('Error seeding settings:', error.message);
  }
}

/**
 * Seed sample articles (for development only)
 */
async function seedSampleArticles() {
  console.log('Seeding sample articles...');
  
  try {
    // Check if articles already exist
    const existingArticles = await query('SELECT COUNT(*) as count FROM ARTICLE');
    if (existingArticles[0].count > 0) {
      console.log('Articles already exist, skipping sample article seeding.');
      return;
    }
    
    // Get current date
    const today = new Date().toISOString().split('T')[0];
    
    // Sample articles for each section
    const sections = ['ocho-columnas', 'primeras-planas', 'columnas-politicas', 'informacion-general', 
                     'cartones', 'suprema-corte', 'tribunal-electoral', 'dof', 'consejo-judicatura'];
    
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
      }
    }
    
    console.log('Sample articles seeded successfully.');
  } catch (error) {
    console.error('Error seeding sample articles:', error.message);
  }
}

/**
 * Main seeding function
 * @param {Array} entities - Entities to seed
 */
async function seedDatabase(entities = []) {
  try {
    console.log('Starting database seeding...');
    
    // If no specific entities are provided, seed everything
    const seedAll = entities.length === 0;
    
    // Seed users
    if (seedAll || entities.includes('users')) {
      await seedUsers();
    }
    
    // Seed sections
    if (seedAll || entities.includes('sections')) {
      await seedSections();
    }
    
    // Seed settings
    if (seedAll || entities.includes('settings')) {
      await seedSettings();
    }
    
    // Seed sample articles (only if explicitly requested or in development mode)
    if (entities.includes('articles') || (seedAll && process.env.NODE_ENV === 'development')) {
      await seedSampleArticles();
    }
    
    console.log('Database seeding completed successfully.');
  } catch (error) {
    console.error('Error seeding database:', error.message);
    process.exit(1);
  }
}

// Main execution
const entities = process.argv.slice(2);
seedDatabase(entities);