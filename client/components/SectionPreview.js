import { useState, useEffect } from 'react';
import Link from 'next/link';
import ArticleCard from './ArticleCard';
import ImageCard from './ImageCard';
import { apiService } from '../utils/api';

export default function SectionPreview({ sectionId, maxItems = 10, showViewAll = true, compact = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const fetchSectionItems = async () => {
      try {
        setLoading(true);
        // Use the API service instead of direct axios call
        const response = await apiService.getSectionPreview(sectionId);
        const fetchedItems = (response.data.items || []).map(item => ({
          ...item,
          imageUrl: item.imageUrl || item.filename // Ensure imageUrl is available
        }));
        
        setItems(fetchedItems.slice(0, maxItems));
        setHasMore(fetchedItems.length > maxItems);
        setLoading(false);
      } catch (err) {
        console.error(`Error fetching ${sectionId} preview:`, err);
        setError(`Error al cargar la sección ${sectionId}`);
        setLoading(false);
        
        // Only use mock data if explicitly in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log(`Using mock data for section ${sectionId} in development mode`);
          const mockData = generateMockData(sectionId);
          setItems(mockData.slice(0, maxItems));
          setHasMore(mockData.length > maxItems);
        }
      }
    };

    fetchSectionItems();
  }, [sectionId, maxItems]);

  // Function to generate mock data for development
  const generateMockData = (sectionId) => {
    const mockItems = [];
    const count = sectionId === 'primeras-planas' || sectionId === 'cartones' ? 12 : 15;
    
    // Generate different types of mock data based on section
    if (sectionId === 'primeras-planas' || sectionId === 'cartones') {
      // For sections with images
      for (let i = 1; i <= count; i++) {
        mockItems.push({
          id: `${sectionId}-${i}`,
          type: 'image',
          title: `Imagen ${i} de ${formatSectionName(sectionId)}`,
          imageUrl: `https://via.placeholder.com/300x400?text=${formatSectionName(sectionId)}+${i}`,
          source: `Fuente ${i}`,
          date: new Date().toISOString()
        });
      }
    } else {
      // For sections with articles
      for (let i = 1; i <= count; i++) {
        mockItems.push({
          id: `${sectionId}-${i}`,
          type: 'article',
          title: `Artículo ${i} de ${formatSectionName(sectionId)}`,
          summary: `Este es un resumen de ejemplo para el artículo ${i} de la sección ${formatSectionName(sectionId)}. Contiene información relevante sobre noticias judiciales.`,
          source: `Fuente ${i}`,
          date: new Date().toISOString(),
          imageUrl: i % 2 === 0 ? `https://via.placeholder.com/100x100?text=Logo+${i}` : null
        });
      }
    }
    
    return mockItems;
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

  const loadMore = async () => {
    setPage(page + 1);
    
    try {
      // Fetch more items from the API
      const response = await apiService.getSectionContent(sectionId, {
        page: page + 1,
        limit: maxItems
      });
      
      // Convert articles and images to unified format, same as in [id].js
      const articles = (response.data.articles || []).map(article => ({
        ...article,
        type: 'article'
      }));
      
      const images = (response.data.images || []).map(image => ({
        ...image,
        type: 'image',
        imageUrl: image.filename || image.imageUrl
      }));
      
      const newItems = [...articles, ...images];
      setItems([...items, ...newItems]);
      setHasMore(newItems.length === maxItems);
    } catch (err) {
      console.error(`Error loading more items for ${sectionId}:`, err);
      
      // Only use mock data if explicitly in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log(`Using mock data for loadMore in section ${sectionId}`);
        const mockData = generateMockData(sectionId);
        setItems([...items, ...mockData.slice(maxItems * (page), maxItems * (page + 1))]);
        setHasMore(mockData.length > maxItems * (page + 1));
      }
    }
  };

  if (loading) {
    return (
      <div className="w-full">
        <div className="animate-pulse flex space-x-4 overflow-x-auto py-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-64 h-64 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return null; // Hide sections with errors instead of showing error message
  }

  // Hide sections without content
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      {compact ? (
        // Compact grid layout for sections on home page
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {items.slice(0, 6).map((item) => (
            <div key={item.id}>
              {item.type === 'image' ? (
                <ImageCard 
                  image={item}
                  images={items.filter(i => i.type === 'image')}
                  currentIndex={items.filter(i => i.type === 'image').findIndex(img => img.id === item.id)}
                  compact={true}
                />
              ) : (
                <ArticleCard 
                  article={item} 
                  compact={true}
                  showBanners={false}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        // Traditional horizontal scroll layout
        <div className="scroll-container pb-6">
          {items.map((item) => (
            <div key={item.id} className="flex-shrink-0 w-64">
              {item.type === 'image' ? (
                <ImageCard 
                  image={item}
                  images={items.filter(i => i.type === 'image')}
                  currentIndex={items.filter(i => i.type === 'image').findIndex(img => img.id === item.id)}
                />
              ) : (
                <ArticleCard article={item} />
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="flex justify-between items-center mt-2">
        {hasMore && !compact && (
          <button
            onClick={loadMore}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Cargar más
          </button>
        )}
        
        {showViewAll && items.length > 0 && (
          <Link
            href={`/section/${sectionId}`}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium ml-auto"
          >
            Ver todo
          </Link>
        )}
      </div>
    </div>
  );
}