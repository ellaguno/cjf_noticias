import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { format } from 'date-fns/index.js';
import es from 'date-fns/locale/es/index.js';
import { apiService } from '../../utils/api';

export default function ArticlePage() {
  const router = useRouter();
  const { id } = router.query;
  const [article, setArticle] = useState(null);
  const [sidebarNews, setSidebarNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    const fetchArticleData = async () => {
      try {
        setLoading(true);
        const articleResponse = await apiService.getArticleById(id);
        const articleData = articleResponse.data;
        
        // Ensure compatibility with both sectionId and section_id
        if (articleData.section_id && !articleData.sectionId) {
          articleData.sectionId = articleData.section_id;
        }
        
        setArticle(articleData);

        if (articleData.section_id) {
          const sectionResponse = await apiService.getSectionContent(
            articleData.section_id, 
            { limit: 20 }
          );
          // Filtrar el artículo actual de los resultados
          const filteredItems = (sectionResponse.data.articles || sectionResponse.data.items || [])
            .filter(item => item.id != id);
          setSidebarNews(filteredItems);
        } else {
          const latestNewsResponse = await apiService.getLatestNews({ limit: 20 });
          setSidebarNews((latestNewsResponse.data.articles || []).filter(item => item.id != id));
        }
        
        setLoading(false);
      } catch (err) {
        console.error(`Error fetching data for article ${id}:`, err);
        setError('Error al cargar el artículo. Por favor, intente de nuevo más tarde.');
        setLoading(false);
      }
    };

    fetchArticleData();
  }, [id]);

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
      'ultimas-noticias': 'Últimas Noticias'
    };
    return names[id] || id;
  };

  const formattedDate = article?.date 
    ? format(new Date(article.date), 'EEEE d \'de\' MMMM \'de\' yyyy', { locale: es })
    : '';

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
    if (imageUrl.startsWith('/storage/')) return imageUrl;
    if (imageUrl.startsWith('/images/')) return `/storage${imageUrl}`;
    if (imageUrl.startsWith('images/')) return `/storage/${imageUrl}`;
    return `/storage/images/${imageUrl}`;
  };

  const mainImageUrl = getImageUrl(article?.image_url) || 
    (article?.images && article.images.length > 0 ? getImageUrl(article.images[0].filename) : null);

  const sourceLink = article?.source_url || article?.url || `https://www.google.com/search?q=${encodeURIComponent(article?.title || '')}`;
  const linkLabel = article?.source_url || article?.url ? 'Ver fuente original' : 'Buscar en Google';

  return (
    <>
      <Head>
        <title>{article ? article.title : 'Artículo'} | Portal de Noticias Judiciales</title>
        <meta name="description" content={article?.summary || 'Artículo del Portal de Noticias Judiciales del CJF'} />
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:underline flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Volver a inicio
          </Link>
        </div>
        
        {loading ? (
          <div className="animate-pulse grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
                <div className="h-96 bg-gray-200 rounded"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-24 bg-gray-200 rounded"></div>
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 p-4"><p className="text-red-700">{error}</p></div>
        ) : article ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <article className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="mb-6">
                    {article.section_id && <Link href={`/section/${article.section_id}`} className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full mb-3">{formatSectionName(article.section_id)}</Link>}
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{article.title}</h1>
                    <div className="flex flex-wrap items-center text-sm text-gray-600 mb-4">
                      {article.source && <span className="mr-4 mb-2"><strong>Fuente:</strong> {article.source}</span>}
                      {article.author && <span className="mr-4 mb-2"><strong>Autor:</strong> {article.author}</span>}
                      {formattedDate && <span className="mb-2 capitalize"><strong>Fecha:</strong> {formattedDate}</span>}
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <a href={sourceLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 font-medium flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                        {linkLabel}
                      </a>
                    </div>
                    {mainImageUrl && (
                      <div className="mb-6"><img src={mainImageUrl} alt={article.title} className="w-full h-auto max-h-[500px] object-contain rounded-lg" onError={(e) => { e.target.style.display = 'none'; }} /></div>
                    )}
                    {article.summary && <div className="bg-gray-50 border-l-4 border-blue-500 p-4 mb-6"><p className="text-gray-700 italic">{article.summary}</p></div>}
                  </div>
                  <div className="prose prose-blue max-w-none" dangerouslySetInnerHTML={{ __html: article.content }} />
                </div>
              </article>
            </div>
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md overflow-hidden sticky top-8">
                <div className="p-4 bg-primary text-white"><h2 className="font-semibold">{article.section_id ? `Más de ${formatSectionName(article.section_id)}` : 'Noticias Recientes'}</h2></div>
                <div className="p-4 max-h-[600px] overflow-y-auto">
                  {sidebarNews.length > 0 ? (
                    <div className="space-y-3">
                      {sidebarNews.map((news) => (
                        <div key={news.id} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                          <Link href={`/article/${news.id}`} className="block hover:bg-gray-50 rounded p-2 -m-2 transition-colors">
                            <h3 className="text-sm font-medium line-clamp-2 text-gray-900">{news.title}</h3>
                            <p className="text-xs text-gray-500 truncate mt-1">{news.source} · {news.date || news.publication_date ? format(new Date(news.date || news.publication_date), 'dd MMM', { locale: es }) : ''}</p>
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-gray-500 text-sm text-center py-4">No hay más noticias para mostrar.</p>}
                </div>
              </div>
            </div>
          </div>
        ) : <div className="text-center py-12"><p>Artículo no encontrado.</p></div>}
      </div>
    </>
  );
}