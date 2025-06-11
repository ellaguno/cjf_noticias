/**
 * Database Initialization Script
 * 
 * This script initializes the SQLite database and creates the necessary tables.
 * It can also seed the database with sample data for development purposes.
 */

require('dotenv').config();
const { setupDatabase, run } = require('../server/database');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

// Flag to determine if sample data should be added
const SEED_DATA = process.argv.includes('--seed');

/**
 * Initialize the database
 */
async function initializeDatabase() {
  try {
    console.log('Initializing database...');
    
    // Set up database schema
    await setupDatabase();
    
    console.log('Database schema created successfully');
    
    // Seed with sample data if requested
    if (SEED_DATA) {
      await seedSampleData();
      console.log('Database seeded with sample data');
    }
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Database initialization failed:', error.message);
    process.exit(1);
  }
}

/**
 * Create admin user
 */
async function createAdminUser() {
  console.log('Creating admin user...');
  
  // Get admin credentials from environment variables or use defaults
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  
  // Check if admin user already exists
  try {
    const result = await run(
      `SELECT * FROM USER WHERE username = ?`,
      [username]
    );
    
    if (result.changes > 0) {
      console.log('Admin user already exists, skipping creation');
      return;
    }
  } catch (error) {
    // Table might not exist yet, continue
  }
  
  // Hash the password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  
  // Create admin user
  await run(
    `INSERT INTO USER (username, password, email, role) VALUES (?, ?, ?, ?)`,
    [username, hashedPassword, email, 'admin']
  );
  
  console.log(`Admin user '${username}' created successfully`);
}

/**
 * Seed the database with sample data
 */
async function seedSampleData() {
  console.log('Seeding database with sample data...');
  
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  // Create admin user
  await createAdminUser();
  
  // Create sample settings
  await run(
    `INSERT OR REPLACE INTO SETTINGS (key, value, description) VALUES (?, ?, ?)`,
    ['site_title', 'Portal de Noticias Judiciales', 'Site title']
  );
  
  // Create sample articles for each section
  const sections = [
    'ocho-columnas', 'primeras-planas', 'columnas-politicas', 
    'informacion-general', 'cartones', 'suprema-corte', 
    'tribunal-electoral', 'dof', 'consejo-judicatura'
  ];
  
  for (const section of sections) {
    // Create articles for today
    for (let i = 1; i <= 5; i++) {
      await run(
        `INSERT INTO ARTICLE (title, content, summary, source, section_id, publication_date) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          `Artículo ${i} de ${section}`,
          `Este es el contenido completo del artículo ${i} de la sección ${section}. Aquí iría el texto completo extraído del PDF.`,
          `Este es un resumen del artículo ${i} de la sección ${section}.`,
          `Fuente ${i}`,
          section,
          today
        ]
      );
    }
    
    // Create articles for yesterday
    for (let i = 1; i <= 3; i++) {
      await run(
        `INSERT INTO ARTICLE (title, content, summary, source, section_id, publication_date) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          `Artículo ${i} de ${section} (ayer)`,
          `Este es el contenido completo del artículo ${i} de la sección ${section} de ayer. Aquí iría el texto completo extraído del PDF.`,
          `Este es un resumen del artículo ${i} de la sección ${section} de ayer.`,
          `Fuente ${i}`,
          section,
          yesterday
        ]
      );
    }
    
    // Create sample images for image-heavy sections
    if (section === 'primeras-planas' || section === 'cartones') {
      for (let i = 1; i <= 5; i++) {
        await run(
          `INSERT INTO IMAGE (filename, title, description, section_id, publication_date) VALUES (?, ?, ?, ?, ?)`,
          [
            `sample-${section}-${i}.jpg`,
            `Imagen ${i} de ${section}`,
            `Descripción de la imagen ${i} de ${section}`,
            section,
            today
          ]
        );
      }
      
      for (let i = 1; i <= 3; i++) {
        await run(
          `INSERT INTO IMAGE (filename, title, description, section_id, publication_date) VALUES (?, ?, ?, ?, ?)`,
          [
            `sample-${section}-${i}-yesterday.jpg`,
            `Imagen ${i} de ${section} (ayer)`,
            `Descripción de la imagen ${i} de ${section} de ayer`,
            section,
            yesterday
          ]
        );
      }
    }
  }
  
  // Create sample audit logs
  await run(
    `INSERT INTO AUDIT_LOG (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
    [1, 'CREATE', 'article', 1, '{"title":"Sample article creation"}']
  );
  
  await run(
    `INSERT INTO AUDIT_LOG (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)`,
    [1, 'UPDATE', 'settings', null, '{"key":"site_title","value":"Portal de Noticias Judiciales"}']
  );
}

// Run the script if called directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = {
  initializeDatabase,
  seedSampleData,
  createAdminUser
};