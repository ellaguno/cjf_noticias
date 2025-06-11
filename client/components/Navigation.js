import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Navigation() {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Function to refresh sections (can be called from parent components)
  const refreshSections = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sectionsCache');
      localStorage.removeItem('sectionsCacheTime');
    }
    
    // Re-fetch sections without page reload
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/sections`);
      const sectionsData = await response.json();
      
      // Cache the new data
      if (typeof window !== 'undefined') {
        localStorage.setItem('sectionsCache', JSON.stringify(sectionsData));
        localStorage.setItem('sectionsCacheTime', Date.now().toString());
      }
      
      const sectionsWithContent = sectionsData
        .filter(section => section.articleCount > 0)
        .map(section => ({
          ...section,
          path: sectionPaths[section.id] || `/section/${section.id}`
        }));
      
      setSections(sectionsWithContent);
    } catch (error) {
      console.error('Error refreshing sections:', error);
    } finally {
      setLoading(false);
    }
  };

  // Static section definitions with paths
  const sectionPaths = {
    'ultimas-noticias': '/ultimas-noticias',
    'ocho-columnas': '/section/ocho-columnas',
    'primeras-planas': '/section/primeras-planas',
    'columnas-politicas': '/section/columnas-politicas',
    'informacion-general': '/section/informacion-general',
    'cartones': '/section/cartones',
    'suprema-corte': '/section/suprema-corte',
    'tribunal-electoral': '/section/tribunal-electoral',
    'dof': '/section/dof',
    'consejo-judicatura': '/section/consejo-judicatura',
    'agenda': '/section/agenda',
    'sintesis-informativa': '/section/sintesis-informativa'
  };

  useEffect(() => {
    const fetchSections = async () => {
      try {
        setLoading(true);
        
        // Check if we have cached data (cache for 5 minutes)
        const cachedData = typeof window !== 'undefined' ? localStorage.getItem('sectionsCache') : null;
        const cacheTime = typeof window !== 'undefined' ? localStorage.getItem('sectionsCacheTime') : null;
        const now = Date.now();
        
        if (cachedData && cacheTime && (now - parseInt(cacheTime)) < 5 * 60 * 1000) {
          try {
            const sectionsData = JSON.parse(cachedData);
            const sectionsWithContent = sectionsData
              .filter(section => section.articleCount > 0)
              .map(section => ({
                ...section,
                path: sectionPaths[section.id] || `/section/${section.id}`
              }));
            setSections(sectionsWithContent);
            setLoading(false);
            return;
          } catch (e) {
            // Clear corrupted cache
            localStorage.removeItem('sectionsCache');
            localStorage.removeItem('sectionsCacheTime');
          }
        }
        
        // Fetch from API
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const response = await fetch(`${apiUrl}/sections`);
        const sectionsData = await response.json();
        
        // Cache the data
        if (typeof window !== 'undefined') {
          localStorage.setItem('sectionsCache', JSON.stringify(sectionsData));
          localStorage.setItem('sectionsCacheTime', now.toString());
        }
        
        // Filter sections that have content and add paths
        const sectionsWithContent = sectionsData
          .filter(section => section.articleCount > 0)
          .map(section => ({
            ...section,
            path: sectionPaths[section.id] || `/section/${section.id}`
          }));
        
        setSections(sectionsWithContent);
      } catch (error) {
        console.error('Error fetching sections:', error);
        // Fallback to static sections if API fails
        setSections([
          { id: 'ocho-columnas', name: 'Ocho Columnas', path: '/section/ocho-columnas' }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchSections();
  }, []);

  return (
    <div className="relative">
      <div className="flex items-center space-x-4">
        <Link href="/" className="font-bold text-lg text-primary hover:text-blue-700">
          Inicio
        </Link>
        
        {/* Dropdown menu */}
        <div className="relative">
          <button
            onClick={toggleDropdown}
            className="flex items-center space-x-1 px-3 py-2 text-primary hover:text-blue-700 font-medium"
          >
            <span>Secciones</span>
            <svg
              className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isDropdownOpen && (
            <div className="absolute left-0 top-full mt-1 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-50">
              <div className="py-2">
                {loading ? (
                  <div className="px-4 py-3 text-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto mb-2"></div>
                    <p className="text-xs text-gray-500">Cargando secciones...</p>
                  </div>
                ) : sections.length === 0 ? (
                  <div className="px-4 py-3 text-center text-gray-500 text-sm">
                    <p>No hay secciones con contenido</p>
                    <p className="text-xs mt-1">Las secciones aparecerán cuando tengan artículos</p>
                  </div>
                ) : (
                  sections.map((section) => (
                    <Link
                      key={section.id}
                      href={section.path}
                      className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                        router.pathname === section.path || router.pathname.startsWith(`/section/${section.id}`) || 
                        (section.id === 'ultimas-noticias' && router.pathname.startsWith('/ultimas-noticias'))
                          ? 'bg-blue-50 text-blue-700 font-medium'
                          : 'text-gray-700'
                      }`}
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <div className="flex justify-between items-center">
                        <span>{section.name}</span>
                        <span className="text-xs text-gray-400">({section.articleCount})</span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}