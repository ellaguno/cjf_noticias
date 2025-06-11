import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import ArticleCard from '../components/ArticleCard';
import ImageCard from '../components/ImageCard';
import SearchBar from '../components/SearchBar';
import { apiService } from '../utils/api';

export default function SearchPage() {
  const router = useRouter();
  const { q, section, date } = router.query;
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [activeFilters, setActiveFilters] = useState({
    section: section || 'all',
    date: date || 'all',
    type: 'all'
  });
  const [view, setView] = useState('grid'); // 'grid' or 'list'
  const itemsPerPage = 12;

  useEffect(() => {
    // Only search if we have a query
    if (!q) {
      setLoading(false);
      return;
    }

    const fetchSearchResults = async () => {
      try {
        setLoading(true);
        
        // Prepare query parameters
        const params = { q };
        if (activeFilters.section !== 'all') params.section = activeFilters.section;
        if (activeFilters.date !== 'all') params.date = activeFilters.date;
        if (activeFilters.type !== 'all') params.type = activeFilters.type;
        params.page = page;
        params.limit = itemsPerPage;
        
        // Use the API service
        const response = await apiService.searchArticles(params);
        
        if (page === 1) {
          setResults(response.data.results || []);
        } else {
          setResults(prev => [...prev, ...(response.data.results || [])]);
        }
        
        setTotalResults(response.data.total || 0);
        setHasMore(response.data.hasMore || false);
        setLoading(false);
      } catch (err) {
        console.error('Error searching:', err);
        setError('Error al realizar la búsqueda. Por favor, intente de nuevo más tarde.');
        setLoading(false);
        
        // For development purposes, let's create mock data
        const mockData = generateMockSearchResults(q, page, itemsPerPage, activeFilters);
        
        if (page === 1) {
          setResults(mockData.results);
        } else {
          setResults(prev => [...prev, ...mockData.results]);
        }
        
        setTotalResults(mockData.total);
        setHasMore(mockData.hasMore);
      }
    };

    fetchSearchResults();
  }, [q, page, activeFilters]);

  // Reset page when query or filters change
  useEffect(() => {
    setPage(1);
  }, [q, activeFilters]);

  // Update active filters when URL params change
  useEffect(() => {
    if (section || date) {
      setActiveFilters(prev => ({
        ...prev,
        section: section || prev.section,
        date: date || prev.date
      }));
    }
  }, [section, date]);

  // Function to generate mock search results for development
  const generateMockSearchResults = (query, page, limit, filters) => {
    const totalItems = 50;
    const startIndex = (page - 1) * limit;
    const mockResults = [];
    const count = Math.min(limit, totalItems - startIndex);
    
    // Apply section filter
    let filteredTotal = totalItems;
    if (filters.section !== 'all') {
      filteredTotal = Math.floor(totalItems / 2);
    }
    
    // Apply date filter
    if (filters.date !== 'all') {
      filteredTotal = Math.floor(filteredTotal / 2);
    }
    
    // Apply type filter
    if (filters.type !== 'all') {
      filteredTotal = Math.floor(filteredTotal / 2);
    }
    
    // Generate results
    for (let i = 1; i <= count; i++) {
      const itemIndex = startIndex + i;
      const isImage = filters.type === 'image' || (filters.type === 'all' && itemIndex % 5 === 0);
      const sectionId = filters.section !== 'all' ? filters.section : getSectionForIndex(itemIndex);
      
      if (isImage) {
        mockResults.push({
          id: `search-image-${itemIndex}`,
          type: 'image',
          title: `Imagen ${itemIndex} para "${query}" en ${formatSectionName(sectionId)}`,
          imageUrl: `https://via.placeholder.com/300x400?text=${encodeURIComponent(query)}+${itemIndex}`,
          source: `Fuente ${itemIndex % 5 + 1}`,
          date: new Date(2023, 4, Math.floor(itemIndex / 3) + 1).toISOString(),
          sectionId,
          relevance: 100 - itemIndex
        });
      } else {
        mockResults.push({
          id: `search-article-${itemIndex}`,
          type: 'article',
          title: `Artículo ${itemIndex} sobre "${query}" en ${formatSectionName(sectionId)}`,
          summary: `Este es un resumen de ejemplo para el artículo ${itemIndex} que contiene el término "${query}". Este artículo pertenece a la sección ${formatSectionName(sectionId)}.`,
          source: `Fuente ${itemIndex % 5 + 1}`,
          date: new Date(2023, 4, Math.floor(itemIndex / 3) + 1).toISOString(),
          imageUrl: itemIndex % 3 === 0 ? `https://via.placeholder.com/100x100?text=Logo+${itemIndex}` : null,
          sectionId,
          relevance: 100 - itemIndex
        });
      }
    }
    
    return {
      results: mockResults,
      total: filteredTotal,
      hasMore: startIndex + limit < filteredTotal
    };
  };

  // Helper function to get a section ID for a mock result
  const getSectionForIndex = (index) => {
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
    
    return sections[index % sections.length];
  };

  // Helper function to format section ID to a readable name
  const formatSectionName = (id) => {
    const names = {
      'ocho-columnas': 'Ocho Columnas',
      'primeras-planas': 'Primeras Planas',
      'columnas-politicas': 'Columnas Políticas',
      'informacion-general': 'Información General',
      'cartones': 'Cartones',
      'suprema-corte': 'Suprema Corte de Justicia de la Nación',
      'tribunal-electoral': 'Tribunal Electoral del Poder Judicial de la Federación',
      'dof': 'DOF (Diario Oficial)',
      'consejo-judicatura': 'CONSEJO DE LA JUDICATURA FEDERAL'
    };
    
    return names[id] || id;
  };

  const loadMore = () => {
    setPage(page + 1);
  };

  const handleFilterChange = (filterType, value) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
    
    // Update URL with the new filters
    router.push({
      pathname: router.pathname,
      query: { 
        ...router.query,
        [filterType]: value === 'all' ? undefined : value
      }
    }, undefined, { shallow: true });
  };

  const handleViewChange = (newView) => {
    setView(newView);
  };

  const clearFilters = () => {
    setActiveFilters({
      section: 'all',
      date: 'all',
      type: 'all'
    });
    
    // Update URL to remove filters
    router.push({
      pathname: router.pathname,
      query: { q }
    }, undefined, { shallow: true });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (activeFilters.section !== 'all') count++;
    if (activeFilters.date !== 'all') count++;
    if (activeFilters.type !== 'all') count++;
    return count;
  };

  return (
    <>
      <Head>
        <title>{q ? `Resultados para "${q}"` : 'Búsqueda'} | Portal de Noticias Judiciales</title>
        <meta name="description" content={`Resultados de búsqueda para "${q}" en el Portal de Noticias Judiciales del CJF`} />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:underline flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a inicio
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="p-6 bg-primary text-white">
            <h1 className="text-2xl md:text-3xl font-bold">
              {q ? `Resultados para "${q}"` : 'Búsqueda de noticias'}
            </h1>
            {totalResults > 0 && q && (
              <p className="mt-2 text-white text-opacity-90">
                Se encontraron {totalResults} resultados
              </p>
            )}
          </div>
          
          <div className="p-6">
            <div className="mb-6">
              <SearchBar compact={true} />
            </div>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <label htmlFor="section-filter" className="block text-sm font-medium text-gray-700 mb-1">
                    Sección
                  </label>
                  <select
                    id="section-filter"
                    value={activeFilters.section}
                    onChange={(e) => handleFilterChange('section', e.target.value)}
                    className="rounded-md border border-gray-300 py-2 px-3 text-sm"
                  >
                    <option value="all">Todas las secciones</option>
                    <option value="ocho-columnas">Ocho Columnas</option>
                    <option value="primeras-planas">Primeras Planas</option>
                    <option value="columnas-politicas">Columnas Políticas</option>
                    <option value="informacion-general">Información General</option>
                    <option value="cartones">Cartones</option>
                    <option value="suprema-corte">Suprema Corte</option>
                    <option value="tribunal-electoral">Tribunal Electoral</option>
                    <option value="dof">DOF</option>
                    <option value="consejo-judicatura">Consejo de la Judicatura</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha
                  </label>
                  <select
                    id="date-filter"
                    value={activeFilters.date}
                    onChange={(e) => handleFilterChange('date', e.target.value)}
                    className="rounded-md border border-gray-300 py-2 px-3 text-sm"
                  >
                    <option value="all">Todas las fechas</option>
                    <option value="today">Hoy</option>
                    <option value="yesterday">Ayer</option>
                    <option value="week">Última semana</option>
                    <option value="month">Último mes</option>
                    <option value="year">Último año</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo
                  </label>
                  <select
                    id="type-filter"
                    value={activeFilters.type}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                    className="rounded-md border border-gray-300 py-2 px-3 text-sm"
                  >
                    <option value="all">Todos los tipos</option>
                    <option value="article">Artículos</option>
                    <option value="image">Imágenes</option>
                  </select>
                </div>
                
                {getActiveFiltersCount() > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center mt-6"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Limpiar filtros ({getActiveFiltersCount()})
                  </button>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleViewChange('grid')}
                  className={`p-2 rounded ${view === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                  aria-label="Vista de cuadrícula"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleViewChange('list')}
                  className={`p-2 rounded ${view === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
                  aria-label="Vista de lista"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
            
            {!q ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Realiza una búsqueda</h3>
                <p className="text-gray-500">
                  Ingresa un término de búsqueda para encontrar noticias, artículos e imágenes.
                </p>
              </div>
            ) : loading && page === 1 ? (
              <div className={`grid ${view === 'grid' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-6`}>
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-48 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : error && results.length === 0 ? (
              <div className="bg-red-50 border-l-4 border-red-500 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No se encontraron resultados</h3>
                <p className="text-gray-500">
                  No hay resultados para "{q}"{getActiveFiltersCount() > 0 ? ' con los filtros seleccionados' : ''}.
                </p>
                {getActiveFiltersCount() > 0 && (
                  <button
                    onClick={clearFilters}
                    className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Limpiar filtros y buscar de nuevo
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className={view === 'grid' 
                  ? `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6` 
                  : `space-y-6`
                }>
                  {results.map((item) => (
                    <div key={item.id} className={view === 'list' ? 'border-b border-gray-200 pb-6' : ''}>
                      {item.type === 'image' ? (
                        <ImageCard image={item} compact={view === 'list'} />
                      ) : (
                        <ArticleCard article={item} compact={view === 'list'} />
                      )}
                    </div>
                  ))}
                </div>
                
                {loading && page > 1 && (
                  <div className="flex justify-center mt-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                )}
                
                {hasMore && !loading && (
                  <div className="flex justify-center mt-8">
                    <button
                      onClick={loadMore}
                      className="bg-white border border-gray-300 rounded-md py-2 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cargar más resultados
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}