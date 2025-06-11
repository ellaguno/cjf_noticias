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
  const [relatedArticles, setRelatedArticles] = useState([]);
  const [latestNews, setLatestNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    const fetchArticle = async () => {
      try {
        setLoading(true);
        const response = await apiService.getArticleById(id);
        setArticle(response.data);
        
        // Fetch latest news for sidebar after article is loaded
        // This will be called again after article state is set
        
        // Also fetch related articles from same section
        if (response.data.sectionId) {
          const relatedResponse = await apiService.getSectionContent(
            response.data.sectionId, 
            { limit: 4, exclude: id }
          );
          setRelatedArticles(relatedResponse.data.items || []);
        }
        
        setLoading(false);
      } catch (err) {
        console.error(`Error fetching article ${id}:`, err);
        setError('Error al cargar el artículo. Por favor, intente de nuevo más tarde.');
        setLoading(false);
        
        // For development purposes, let's create mock data
        const mockArticle = generateMockArticle(id);
        setArticle(mockArticle);
        setRelatedArticles(generateMockRelatedArticles(mockArticle.sectionId, id));
      }
    };

    fetchArticle();
  }, [id]);

  // Fetch sidebar content when article is loaded
  useEffect(() => {
    if (article) {
      fetchLatestNews();
    }
  }, [article]);

  const fetchLatestNews = async () => {
    try {
      // If article has a sectionId, fetch articles from that section first
      if (article && article.sectionId) {
        try {
          const sectionResponse = await apiService.getSectionContent(
            article.sectionId, 
            { limit: 20 }
          );
          
          let sectionArticles = [];
          if (sectionResponse.data.articles) {
            sectionArticles = sectionResponse.data.articles.filter(item => item.id !== id);
          }
          
          // If we have enough articles from the section, use them
          if (sectionArticles.length >= 10) {
            sectionArticles.sort((a, b) => new Date(b.publication_date || b.created_at) - new Date(a.publication_date || a.created_at));
            setLatestNews(sectionArticles.slice(0, 20));
            return;
          }
        } catch (sectionErr) {
          console.error('Error fetching section articles:', sectionErr);
        }
      }
      
      // Fallback: Fetch recent articles from multiple sections like in index.js
      const today = new Date().toISOString().split('T')[0];
      const promises = [
        fetch(`/api/sections/external-news?date=${today}&limit=12`),
        fetch(`/api/sections/ocho-columnas?date=${today}&limit=6`),
        fetch(`/api/sections/informacion-general?date=${today}&limit=6`)
      ];
      
      const responses = await Promise.all(promises);
      const articlesData = await Promise.all(responses.map(r => r.json()));
      
      let allArticles = [];
      articlesData.forEach(data => {
        if (data.articles) {
          allArticles = allArticles.concat(data.articles.filter(item => item.id !== id));
        }
      });
      
      // Sort by publication date and take the most recent 20
      allArticles.sort((a, b) => new Date(b.publication_date || b.created_at) - new Date(a.publication_date || a.created_at));
      setLatestNews(allArticles.slice(0, 20));
      
    } catch (err) {
      console.error('Error fetching latest news:', err);
      // Use mock data as fallback
      setLatestNews(generateMockLatestNews());
    }
  };

  const generateMockLatestNews = () => {
    const mockArticles = [];
    for (let i = 1; i <= 20; i++) {
      mockArticles.push({
        id: `latest-${i}`,
        title: `Última noticia ${i} - Ejemplo de titular judicial`,
        summary: `Resumen de la noticia ${i} con información relevante sobre el ámbito judicial.`,
        source: `Fuente ${i % 5 + 1}`,
        date: new Date(Date.now() - i * 3600000).toISOString(), // Hours ago
        publication_date: new Date(Date.now() - i * 3600000).toISOString(),
        imageUrl: i % 3 === 0 ? `https://via.placeholder.com/100x100?text=Noticia+${i}` : null,
        sectionId: ['external-news', 'ocho-columnas', 'informacion-general'][i % 3]
      });
    }
    return mockArticles;
  };

  // Function to generate mock article data for development
  const generateMockArticle = (articleId) => {
    // Extract section ID from article ID (assuming format: sectionId-number)
    const sectionId = articleId.split('-')[0];
    
    return {
      id: articleId,
      title: `Artículo de ejemplo ${articleId}`,
      content: `
        <p>Este es un artículo de ejemplo para la sección ${formatSectionName(sectionId)}. El contenido de este artículo es generado automáticamente para propósitos de desarrollo.</p>
        
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam auctor, nisl eget ultricies tincidunt, nisl nisl aliquam nisl, eget ultricies nisl nisl eget nisl. Nullam auctor, nisl eget ultricies tincidunt, nisl nisl aliquam nisl, eget ultricies nisl nisl eget nisl.</p>
        
        <h2>Subtítulo del artículo</h2>
        
        <p>Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
        
        <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
        
        <blockquote>
          <p>Esta es una cita importante dentro del artículo que destaca información relevante sobre el tema tratado.</p>
        </blockquote>
        
        <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
      `,
      summary: `Resumen del artículo ${articleId} para la sección ${formatSectionName(sectionId)}. Este es un texto generado automáticamente para propósitos de desarrollo.`,
      source: `Fuente ${parseInt(articleId.split('-')[1]) % 5 + 1}`,
      author: `Autor ${parseInt(articleId.split('-')[1]) % 3 + 1}`,
      date: new Date().toISOString(),
      imageUrl: parseInt(articleId.split('-')[1]) % 2 === 0 
        ? `https://via.placeholder.com/800x400?text=Imagen+${articleId}` 
        : null,
      images: parseInt(articleId.split('-')[1]) % 2 === 0 
        ? [{filename: `/storage/images/article-${articleId}.jpg`, title: `Imagen ${articleId}`}] 
        : [],
      sectionId: sectionId,
      tags: ['judicial', 'noticias', sectionId, 'ejemplo']
    };
  };

  // Function to generate mock related articles
  const generateMockRelatedArticles = (sectionId, currentId) => {
    const articles = [];
    
    for (let i = 1; i <= 4; i++) {
      const id = `${sectionId}-${i}`;
      if (id !== currentId) {
        articles.push({
          id,
          type: 'article',
          title: `Artículo relacionado ${i}`,
          summary: `Resumen del artículo relacionado ${i} para la sección ${formatSectionName(sectionId)}.`,
          source: `Fuente ${i % 5 + 1}`,
          date: new Date().toISOString(),
          imageUrl: i % 2 === 0 ? `https://via.placeholder.com/100x100?text=Imagen+${i}` : null,
          sectionId
        });
      }
    }
    
    return articles;
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

  // Format the date
  const formattedDate = article?.date 
    ? format(new Date(article.date), 'EEEE d \'de\' MMMM \'de\' yyyy', { locale: es })
    : '';

  return (
    <>
      <Head>
        <title>{article ? article.title : 'Artículo'} | Portal de Noticias Judiciales</title>
        <meta name="description" content={article?.summary || 'Artículo del Portal de Noticias Judiciales del CJF'} />
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
        
        {loading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="h-64 bg-gray-200 rounded mb-8"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-red-700">{error}</p>
                <p className="text-sm text-red-600 mt-1">Intente recargar la página o contacte al administrador.</p>
              </div>
            </div>
          </div>
        ) : article ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <article className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="mb-6">
                    {article.sectionId && (
                      <Link 
                        href={`/section/${article.sectionId}`}
                        className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full mb-3"
                      >
                        {formatSectionName(article.sectionId)}
                      </Link>
                    )}
                    
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">{article.title}</h1>
                    
                    <div className="flex flex-wrap items-center text-sm text-gray-600 mb-4">
                      {article.source && (
                        <span className="mr-4 mb-2">
                          <span className="font-medium">Fuente:</span> {article.source}
                        </span>
                      )}
                      
                      {article.author && (
                        <span className="mr-4 mb-2">
                          <span className="font-medium">Autor:</span> {article.author}
                        </span>
                      )}
                      
                      {formattedDate && (
                        <span className="mb-2 capitalize">
                          <span className="font-medium">Fecha:</span> {formattedDate}
                        </span>
                      )}
                    </div>
                    
                    {article.summary && (
                      <div className="bg-gray-50 border-l-4 border-blue-500 p-4 mb-6">
                        <p className="text-gray-700 italic">{article.summary}</p>
                      </div>
                    )}
                    
                    {(article.url || article.source_url) && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          <span className="text-blue-800 font-medium mr-3">
                            {article.source_url ? 'Fuente Original:' : 'PDF Original:'}
                          </span>
                          <a 
                            href={article.source_url || article.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline flex items-center"
                          >
                            {article.source_url ? 'Ver artículo completo' : 'Ver documento completo'}
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {((article.images && article.images.length > 0) || article.imageUrl) && (
                    <div className="mb-6">
                      <img
                        src={
                          article.images && article.images.length > 0 
                            ? (article.images[0].url || (article.images[0].filename?.startsWith('/storage') ? article.images[0].filename : `/storage/uploads/${article.images[0].filename}`))
                            : article.imageUrl
                        }
                        alt={
                          article.images && article.images.length > 0 && article.images[0].title 
                            ? article.images[0].title 
                            : article.title
                        }
                        className="w-full h-auto rounded-lg"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/800x400?text=Error+al+cargar+imagen';
                        }}
                      />
                      {(article.imageCaption || (article.images && article.images.length > 0 && article.images[0].description)) && (
                        <p className="text-sm text-gray-500 mt-2 text-center">
                          {article.imageCaption || article.images[0].description}
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div 
                    className="prose prose-blue max-w-none"
                    dangerouslySetInnerHTML={{ __html: article.content }}
                  />
                  
                  {article.tags && article.tags.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <h3 className="text-sm font-medium text-gray-500 mb-3">Etiquetas:</h3>
                      <div className="flex flex-wrap gap-2">
                        {article.tags.map((tag, index) => (
                          <Link 
                            key={index}
                            href={`/search?q=${encodeURIComponent(tag)}`}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs px-3 py-1 rounded-full"
                          >
                            {tag}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <Link 
                        href={`/section/${article.sectionId}`}
                        className="text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                        </svg>
                        Volver a {formatSectionName(article.sectionId)}
                      </Link>
                      
                      <div className="flex space-x-4">
                        <button 
                          className="text-gray-500 hover:text-gray-700"
                          aria-label="Compartir en Twitter"
                        >
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                          </svg>
                        </button>
                        
                        <button 
                          className="text-gray-500 hover:text-gray-700"
                          aria-label="Compartir en Facebook"
                        >
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                            <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                          </svg>
                        </button>
                        
                        <button 
                          className="text-gray-500 hover:text-gray-700"
                          aria-label="Compartir por correo"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </div>
            
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md overflow-hidden sticky top-8">
                <div className="p-4 bg-primary text-white">
                  <h2 className="font-semibold">
                    {article && article.sectionId ? `Más de ${formatSectionName(article.sectionId)}` : 'Últimas Noticias'}
                  </h2>
                  <p className="text-sm text-blue-100 mt-1">
                    {article && article.sectionId ? 'Navega entre artículos de esta sección' : 'Navega entre las noticias más recientes'}
                  </p>
                </div>
                
                <div className="p-4 max-h-96 overflow-y-auto">
                  {latestNews.length > 0 ? (
                    <div className="space-y-3">
                      {latestNews.map((news, index) => (
                        <div key={news.id} className={`border-b border-gray-100 pb-3 last:border-b-0 last:pb-0 ${news.id === id ? 'bg-blue-50 rounded-lg p-2 -m-2' : ''}`}>
                          <Link 
                            href={`/article/${news.id}`}
                            className={`block hover:bg-gray-50 rounded p-2 -m-2 transition-colors ${news.id === id ? 'pointer-events-none' : ''}`}
                          >
                            <div className="flex items-start">
                              {((news.images && news.images.length > 0) || news.imageUrl) && (
                                <img 
                                  src={
                                    news.images && news.images.length > 0 
                                      ? (news.images[0].url || (news.images[0].filename?.startsWith('/storage') ? news.images[0].filename : `/storage/uploads/${news.images[0].filename}`))
                                      : news.imageUrl
                                  } 
                                  alt={news.title}
                                  className="w-12 h-12 object-cover rounded mr-3 flex-shrink-0"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                  }}
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <h3 className={`text-xs font-medium line-clamp-2 mb-1 ${news.id === id ? 'text-blue-800' : 'text-gray-900'}`}>
                                  {news.title}
                                  {news.id === id && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                      Actual
                                    </span>
                                  )}
                                </h3>
                                <p className="text-xs text-gray-500 truncate">
                                  {news.source} · {format(new Date(news.date || news.publication_date), 'dd MMM', { locale: es })}
                                </p>
                                {index < 3 && (
                                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                    {news.summary}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Link>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm text-center py-4">
                      Cargando últimas noticias...
                    </p>
                  )}
                </div>
                
                {/* Navigation indicators */}
                {latestNews.length > 0 && (
                  <div className="px-4 py-3 bg-gray-50 border-t">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{latestNews.length} artículos disponibles</span>
                      <Link 
                        href={article && article.sectionId ? `/section/${article.sectionId}` : "/"}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        {article && article.sectionId ? 'Ver sección completa' : 'Ver todas'}
                      </Link>
                    </div>
                  </div>
                )}
                
                {/* Related articles section - smaller and at bottom */}
                {relatedArticles.length > 0 && (
                  <div className="border-t">
                    <div className="px-4 py-3 bg-gray-100">
                      <h3 className="text-sm font-medium text-gray-700 mb-2">
                        Más de {formatSectionName(article.sectionId)}
                      </h3>
                      <div className="space-y-2">
                        {relatedArticles.slice(0, 2).map((related) => (
                          <Link 
                            key={related.id}
                            href={`/article/${related.id}`}
                            className="block text-xs text-gray-600 hover:text-blue-600 line-clamp-2"
                          >
                            {related.title}
                          </Link>
                        ))}
                      </div>
                      <Link 
                        href={`/section/${article.sectionId}`}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-2 inline-block"
                      >
                        Ver sección completa →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-1">Artículo no encontrado</h3>
            <p className="text-gray-500">
              El artículo que estás buscando no existe o ha sido eliminado.
            </p>
          </div>
        )}
      </div>
    </>
  );
}