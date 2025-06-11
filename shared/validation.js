/**
 * Shared validation functions for both client and server
 */

// Validate date format (YYYY-MM-DD)
function isValidDate(dateString) {
  if (!dateString) return false;
  
  // Check format
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  // Check if it's a valid date
  const date = new Date(dateString);
  const timestamp = date.getTime();
  
  if (isNaN(timestamp)) return false;
  
  // Check if the date string matches the parsed date
  return date.toISOString().slice(0, 10) === dateString;
}

// Validate section ID
function isValidSectionId(sectionId) {
  if (!sectionId) return false;
  
  const validSections = [
    'ocho-columnas', 'primeras-planas', 'columnas-politicas', 
    'informacion-general', 'cartones', 'suprema-corte', 
    'tribunal-electoral', 'dof', 'consejo-judicatura'
  ];
  
  return validSections.includes(sectionId);
}

// Validate article data
function validateArticle(article) {
  const errors = {};
  
  if (!article.title || article.title.trim() === '') {
    errors.title = 'El título es obligatorio';
  }
  
  if (!article.section_id || !isValidSectionId(article.section_id)) {
    errors.section_id = 'La sección es inválida';
  }
  
  if (!article.publication_date || !isValidDate(article.publication_date)) {
    errors.publication_date = 'La fecha de publicación es inválida';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Validate image data
function validateImage(image) {
  const errors = {};
  
  if (!image.section_id || !isValidSectionId(image.section_id)) {
    errors.section_id = 'La sección es inválida';
  }
  
  if (!image.publication_date || !isValidDate(image.publication_date)) {
    errors.publication_date = 'La fecha de publicación es inválida';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Validate search parameters
function validateSearchParams(params) {
  const errors = {};
  
  if (params.from && !isValidDate(params.from)) {
    errors.from = 'La fecha de inicio es inválida';
  }
  
  if (params.to && !isValidDate(params.to)) {
    errors.to = 'La fecha de fin es inválida';
  }
  
  if (params.section && !isValidSectionId(params.section)) {
    errors.section = 'La sección es inválida';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// Export for CommonJS (Node.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    isValidDate,
    isValidSectionId,
    validateArticle,
    validateImage,
    validateSearchParams
  };
}

// Export for ES modules (browser)
if (typeof window !== 'undefined') {
  window.AppValidation = {
    isValidDate,
    isValidSectionId,
    validateArticle,
    validateImage,
    validateSearchParams
  };
}