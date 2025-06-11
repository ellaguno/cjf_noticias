/**
 * Shared constants for both client and server
 */

// Section IDs and names
const SECTIONS = [
  { id: 'ocho-columnas', name: 'Ocho Columnas' },
  { id: 'primeras-planas', name: 'Primeras Planas' },
  { id: 'columnas-politicas', name: 'Columnas Políticas' },
  { id: 'informacion-general', name: 'Información General' },
  { id: 'cartones', name: 'Cartones' },
  { id: 'suprema-corte', name: 'Suprema Corte de Justicia de la Nación' },
  { id: 'tribunal-electoral', name: 'Tribunal Electoral del Poder Judicial de la Federación' },
  { id: 'dof', name: 'DOF (Diario Oficial)' },
  { id: 'consejo-judicatura', name: 'Consejo de la Judicatura Federal' }
];

// Section types (for determining how to display content)
const SECTION_TYPES = {
  'primeras-planas': 'image',
  'cartones': 'image',
  'columnas-politicas': 'image',
  'ocho-columnas': 'article',
  'informacion-general': 'article',
  'suprema-corte': 'article',
  'tribunal-electoral': 'article',
  'dof': 'article',
  'consejo-judicatura': 'article'
};

// User roles
const USER_ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer'
};

// API endpoints
const API_ENDPOINTS = {
  LATEST: '/api/latest',
  ARTICLES: '/api/articles',
  SECTIONS: '/api/sections',
  ARCHIVE: '/api/archive',
  SEARCH: '/api/search',
  ADMIN: '/api/admin'
};

// Date formats
const DATE_FORMATS = {
  API: 'yyyy-MM-dd',
  DISPLAY: 'dd MMMM yyyy',
  URL: 'yyyy-MM-dd'
};

// Export for CommonJS (Node.js)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SECTIONS,
    SECTION_TYPES,
    USER_ROLES,
    API_ENDPOINTS,
    DATE_FORMATS
  };
}

// Export for ES modules (browser)
if (typeof window !== 'undefined') {
  window.AppConstants = {
    SECTIONS,
    SECTION_TYPES,
    USER_ROLES,
    API_ENDPOINTS,
    DATE_FORMATS
  };
}