/**
 * Index Extractor Tests
 * 
 * Tests for the PDF index extraction functionality.
 */

const path = require('path');
const { extractIndex, getSectionByName, getSectionByPage, getAllSections } = require('../server/src/services/pdf/indexExtractor');

describe('PDF Index Extractor', () => {
  test('extractIndex should return the index structure', async () => {
    // Mock file path
    const filePath = path.join(__dirname, '../storage/pdf/2025-05-29.pdf');
    
    // Call the function
    const result = await extractIndex(filePath);
    
    // Check the result
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    
    // Check structure of the first item
    const firstSection = result[0];
    expect(firstSection).toHaveProperty('id');
    expect(firstSection).toHaveProperty('name');
    expect(firstSection).toHaveProperty('pages');
    expect(firstSection.pages).toHaveProperty('start');
    expect(firstSection.pages).toHaveProperty('end');
  });
  
  test('getSectionByName should return the correct section', () => {
    // Test with exact name
    const section1 = getSectionByName('OCHO COLUMNAS');
    expect(section1).toBeDefined();
    expect(section1.id).toBe('ocho-columnas');
    
    // Test with alias
    const section2 = getSectionByName('CJF');
    expect(section2).toBeDefined();
    expect(section2.id).toBe('consejo-judicatura');
    
    // Test with lowercase
    const section3 = getSectionByName('cartones');
    expect(section3).toBeDefined();
    expect(section3.id).toBe('cartones');
    
    // Test with non-existent section
    const section4 = getSectionByName('NON-EXISTENT SECTION');
    expect(section4).toBeNull();
  });
  
  test('getSectionByPage should return the correct section', () => {
    // Test with page in first section
    const section1 = getSectionByPage(3);
    expect(section1).toBeDefined();
    expect(section1.id).toBe('ocho-columnas');
    
    // Test with page in middle section
    const section2 = getSectionByPage(45);
    expect(section2).toBeDefined();
    expect(section2.id).toBe('suprema-corte');
    
    // Test with page in last section
    const section3 = getSectionByPage(80);
    expect(section3).toBeDefined();
    expect(section3.id).toBe('cartones');
    
    // Test with non-existent page
    const section4 = getSectionByPage(200);
    expect(section4).toBeNull();
  });
  
  test('getAllSections should return all sections', () => {
    const sections = getAllSections();
    
    expect(sections).toBeDefined();
    expect(Array.isArray(sections)).toBe(true);
    expect(sections.length).toBeGreaterThan(0);
    
    // Check that all expected sections are present
    const sectionIds = sections.map(section => section.id);
    expect(sectionIds).toContain('ocho-columnas');
    expect(sectionIds).toContain('primeras-planas');
    expect(sectionIds).toContain('agenda');
    expect(sectionIds).toContain('consejo-judicatura');
    expect(sectionIds).toContain('suprema-corte');
    expect(sectionIds).toContain('sintesis-informativa');
    expect(sectionIds).toContain('columnas-politicas');
    expect(sectionIds).toContain('dof');
    expect(sectionIds).toContain('cartones');
  });
});