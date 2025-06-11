import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { format } from 'date-fns/index.js';
import es from 'date-fns/locale/es/index.js';
import ArticleCard from '../../components/ArticleCard';
import ImageCard from '../../components/ImageCard';
import SearchBar from '../../components/SearchBar';
import { apiService } from '../../utils/api';

export default function SectionPage() {
  const router = useRouter();
  const { id, date, q } = router.query;
  const [section, setSection] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [view, setView] = useState('grid'); // 'grid' or 'list'
  const [sortBy, setSortBy] = useState('date'); // 'date', 'source', 'title'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [filter, setFilter] = useState(q || '');
  const itemsPerPage = 12;

  useEffect(() => {
    if (!id) return;

    // Redirect ultimas-noticias to the custom page
    if (id === 'ultimas-noticias') {
      router.replace('/ultimas-noticias');
      return;
    }

    const fetchSectionContent = async () => {
      try {
        setLoading(true);
        
        // Prepare query parameters
        const params = {};
        if (date) params.date = date;
        if (q) params.q = q;
        params.page = page;
        params.limit = itemsPerPage;
        params.sort = sortBy;
        params.order = sortOrder;
        
        // Use the API service
        const response = await apiService.getSectionContent(id, params);
        
        // Convert articles and images to a unified items format
        const articles = (response.data.articles || []).map(article => ({
          ...article,
          type: 'article'
        }));
        
        const images = (response.data.images || []).map(image => ({
          ...image,
          type: 'image',
          imageUrl: image.filename || image.imageUrl // Map filename to imageUrl for compatibility
        }));
        
        const allItems = [...articles, ...images];
        
        if (page === 1) {
          setItems(allItems);
        } else {
          setItems(prev => [...prev, ...allItems]);
        }
        
        setSection({ 
          id, 
          name: formatSectionName(id),
          date: response.data.date 
        });
        setHasMore(allItems.length >= itemsPerPage);
        setLoading(false);
      } catch (err) {
        console.error(`Error fetching section ${id}:`, err);
        setError(`Error al cargar la sección. Por favor, intente de nuevo más tarde.`);
        setLoading(false);
        
        // For development purposes, let's create some mock data
        const mockData = generateMockData(id, page, itemsPerPage);
        
        if (page === 1) {
          setItems(mockData.items);
        } else {
          setItems(prev => [...prev, ...mockData.items]);
        }
        
        setSection({ id, name: formatSectionName(id) });
        setHasMore(mockData.hasMore);
      }
    };

    fetchSectionContent();
  }, [id, date, q, page, sortBy, sortOrder]);

  // Function to generate mock data for development
  const generateMockData = (sectionId, page, limit) => {
    const totalItems = 50;
    const startIndex = (page - 1) * limit;
    const mockItems = [];
    const count = Math.min(limit, totalItems - startIndex);
    
    // Generate different types of mock data based on section
    if (sectionId === 'primeras-planas' || sectionId === 'cartones') {
      // For sections with images
      for (let i = 1; i <= count; i++) {
        const itemIndex = startIndex + i;
        mockItems.push({
          id: `${sectionId}-${itemIndex}`,
          type: 'image',
          title: `Imagen ${itemIndex} de ${formatSectionName(sectionId)}`,
          imageUrl: `https://via.placeholder.com/300x400?text=${formatSectionName(sectionId)}+${itemIndex}`,
          source: `Fuente ${itemIndex % 5 + 1}`,
          date: new Date(2023, 4, Math.floor(itemIndex / 3) + 1).toISOString()
        });
      }
    } else {
      // For sections with articles
      for (let i = 1; i <= count; i++) {
        const itemIndex = startIndex + i;
        mockItems.push({
          id: `${sectionId}-${itemIndex}`,
          type: 'article',
          title: `Artículo ${itemIndex} de ${formatSectionName(sectionId)}`,
          summary: `Este es un resumen de ejemplo para el artículo ${itemIndex} de la sección ${formatSectionName(sectionId)}. Contiene información relevante sobre noticias judiciales.`,
          source: `Fuente ${itemIndex % 5 + 1}`,
          date: new Date(2023, 4, Math.floor(itemIndex / 3) + 1).toISOString(),
          imageUrl: itemIndex % 3 === 0 ? `https://via.placeholder.com/100x100?text=Logo+${itemIndex}` : null
        });
      }
    }
    
    return {
      items: mockItems,
      hasMore: startIndex + limit < totalItems
    };
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
      'consejo-judicatura': 'CONSEJO DE LA JUDICATURA FEDERAL',
      'ultimas-noticias': 'Últimas Noticias',
      'external-news': 'Noticias Externas'
    };
    
    return names[id] || id;
  };

  const loadMore = () => {
    setPage(page + 1);
  };

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    
    // Reset page to 1 when applying a new filter
    setPage(1);
    
    // Update URL with the filter
    router.push({
      pathname: router.pathname,
      query: { 
        ...router.query,
        q: filter || undefined
      }
    }, undefined, { shallow: true });
  };

  const handleSortChange = (e) => {
    const value = e.target.value;
    const [newSortBy, newSortOrder] = value.split('-');
    
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPage(1); // Reset to first page when sorting changes
  };

  const handleViewChange = (newView) => {
    setView(newView);
  };

  const formattedDate = date 
    ? format(new Date(date), 'EEEE d \'de\' MMMM \'de\' yyyy', { locale: es })
    : '';

  return (
    <>
      <Head>
        <title>{section ? section.name : 'Sección'} | Portal de Noticias Judiciales</title>
        <meta name="description" content={`Noticias de la sección ${section ? section.name : ''} del Portal de Noticias Judiciales del CJF`} />
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
            <h1 className="text-2xl md:text-3xl font-bold">{section ? section.name : 'Cargando...'}</h1>
            {date && (
              <p className="mt-2 text-white text-opacity-90 capitalize">
                {formattedDate}
              </p>
            )}
          </div>
          
          <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
              <div className="w-full md:w-auto">
                <SearchBar compact={true} />
              </div>
              
              <div className="flex items-center space-x-4 w-full md:w-auto">
                <div>
                  <label htmlFor="sort-select" className="block text-sm font-medium text-gray-700 mb-1">
                    Ordenar por
                  </label>
                  <select
                    id="sort-select"
                    value={`${sortBy}-${sortOrder}`}
                    onChange={handleSortChange}
                    className="rounded-md border border-gray-300 py-2 px-3 text-sm"
                  >
                    <option value="date-desc">Fecha (más reciente)</option>
                    <option value="date-asc">Fecha (más antigua)</option>
                    <option value="title-asc">Título (A-Z)</option>
                    <option value="title-desc">Título (Z-A)</option>
                    <option value="source-asc">Fuente (A-Z)</option>
                    <option value="source-desc">Fuente (Z-A)</option>
                  </select>
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
            </div>
            
            {loading && page === 1 ? (
              <div className={`grid ${view === 'grid' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-6`}>
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-48 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : error && items.length === 0 ? (
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
            ) : items.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-1">No hay contenido disponible</h3>
                <p className="text-gray-500">
                  No se encontraron artículos para esta sección{date ? ' en la fecha seleccionada' : ''}.
                </p>
              </div>
            ) : (
              <>
                <div className={view === 'grid' 
                  ? `grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6` 
                  : `space-y-6`
                }>
                  {items.map((item, index) => (
                    <div key={item.id} className={view === 'list' ? 'border-b border-gray-200 pb-6' : ''}>
                      {item.type === 'image' ? (
                        <ImageCard 
                          image={item} 
                          compact={view === 'list'}
                          images={items.filter(i => i.type === 'image')}
                          currentIndex={items.filter(i => i.type === 'image').findIndex(img => img.id === item.id)}
                        />
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
                      Cargar más
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