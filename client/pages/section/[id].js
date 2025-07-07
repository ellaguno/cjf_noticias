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
  const [view, setView] = useState('grid');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const itemsPerPage = 12;

  const isImageSection = id === 'primeras-planas' || id === 'cartones' || id === 'columnas-politicas';

  useEffect(() => {
    if (!id) return;

    if (id === 'ultimas-noticias') {
      router.replace('/ultimas-noticias');
      return;
    }

    const fetchSectionContent = async () => {
      try {
        setLoading(true);
        const params = { page, limit: itemsPerPage, sort: sortBy, order: sortOrder };
        if (date) params.date = date;
        if (q) params.q = q;

        const response = await apiService.getSectionContent(id, params);
        
        let allItems = [
          ...(response.data.articles || []).map(article => ({ ...article, type: 'article' })),
          ...(response.data.images || []).map(image => ({ ...image, type: 'image', imageUrl: image.filename || image.imageUrl }))
        ];

        if (isImageSection) {
          allItems = allItems.filter(item => item.imageUrl);
        }
        
        setItems(prev => page === 1 ? allItems : [...prev, ...allItems]);
        setSection({ id, name: formatSectionName(id), date: response.data.date });
        setHasMore(allItems.length >= itemsPerPage);
        setLoading(false);
      } catch (err) {
        console.error(`Error fetching section ${id}:`, err);
        setError(`Error al cargar la sección.`);
        setLoading(false);
      }
    };

    fetchSectionContent();
  }, [id, date, q, page, sortBy, sortOrder, isImageSection]);

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

  const loadMore = () => setPage(prev => prev + 1);
  const handleSortChange = (e) => {
    const [newSortBy, newSortOrder] = e.target.value.split('-');
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setPage(1);
  };

  const formattedDate = date 
    ? format(new Date(date), 'EEEE d \'de\' MMMM \'de\' yyyy', { locale: es })
    : '';

  return (
    <>
      <Head>
        <title>{section ? section.name : 'Sección'} | Portal de Noticias Judiciales</title>
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:underline flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
            Volver a inicio
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="p-6 bg-primary text-white">
            <h1 className="text-2xl md:text-3xl font-bold">{section ? section.name : 'Cargando...'}</h1>
            {date && <p className="mt-2 text-white text-opacity-90 capitalize">{formattedDate}</p>}
          </div>
          
          <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6">
              <div className="w-full md:w-auto mb-4 md:mb-0">
                <SearchBar compact={true} />
              </div>
              <div className="flex items-center space-x-4">
                <select onChange={handleSortChange} className="rounded-md border border-gray-300 py-2 px-3 text-sm">
                  <option value="date-desc">Más reciente</option>
                  <option value="date-asc">Más antiguo</option>
                  <option value="title-asc">Título (A-Z)</option>
                  <option value="title-desc">Título (Z-A)</option>
                </select>
              </div>
            </div>
            
            {loading && page === 1 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => <div key={i} className="animate-pulse h-64 bg-gray-200 rounded"></div>)}
              </div>
            ) : error ? (
              <p className="text-red-500 text-center">{error}</p>
            ) : items.length === 0 ? (
              <p className="text-gray-500 text-center py-12">No hay contenido disponible.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {items.map((item) => (
                    <div key={item.id}>
                      {item.type === 'image' ? <ImageCard image={item} /> : <ArticleCard article={item} />}
                    </div>
                  ))}
                </div>
                {hasMore && !loading && (
                  <div className="flex justify-center mt-8">
                    <button onClick={loadMore} className="bg-blue-600 text-white py-2 px-6 rounded-full hover:bg-blue-700 transition">
                      Cargar más
                    </button>
                  </div>
                )}
                {loading && page > 1 && <p className="text-center mt-8">Cargando...</p>}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}