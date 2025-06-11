import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { format, parseISO } from 'date-fns/index.js';
import es from 'date-fns/locale/es/index.js';
import Layout from '../components/Layout';
import SectionWrapper from '../components/SectionWrapper';
import CalendarWidget from '../components/CalendarWidget';
import ArticleCard from '../components/ArticleCard';
import { apiService } from '../utils/api';

export default function Home() {
  const [latestNews, setLatestNews] = useState({
    date: new Date().toISOString().split('T')[0],
    sections: []
  });
  const [recentArticles, setRecentArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    const fetchLatestNews = async () => {
      try {
        setLoading(true);
        // Use the API service instead of direct axios call
        const response = await apiService.getLatestNews();
        setLatestNews(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching latest news:', err);
        setError('Error al cargar las noticias. Por favor, intente de nuevo más tarde.');
        setLoading(false);
      }
    };

    const fetchRecentArticles = async () => {
      try {
        setArticlesLoading(true);
        // Fetch recent articles from multiple sections
        const today = new Date().toISOString().split('T')[0];
        const promises = [
          fetch(`/api/sections/ultimas-noticias?date=${today}&limit=8`),
          fetch(`/api/sections/ocho-columnas?date=${today}&limit=4`),
          fetch(`/api/sections/informacion-general?date=${today}&limit=4`)
        ];
        
        const responses = await Promise.all(promises);
        const articlesData = await Promise.all(responses.map(r => r.json()));
        
        let allArticles = [];
        articlesData.forEach(data => {
          if (data.articles) {
            allArticles = allArticles.concat(data.articles);
          }
        });
        
        // Sort by publication date and take the most recent 16
        allArticles.sort((a, b) => new Date(b.publication_date || b.created_at) - new Date(a.publication_date || a.created_at));
        setRecentArticles(allArticles.slice(0, 16));
        
      } catch (err) {
        console.error('Error fetching recent articles:', err);
      } finally {
        setArticlesLoading(false);
      }
    };

    fetchLatestNews();
    fetchRecentArticles();
  }, []);

  const sections = [
    {
      id: 'ocho-columnas',
      name: 'Ocho Columnas',
      path: '/section/ocho-columnas',
      description: 'Principales noticias y titulares de los medios nacionales',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1M19 20a2 2 0 002-2V8a2 2 0 00-2-2h-5a2 2 0 00-2 2v12a2 2 0 002 2h5z" />
        </svg>
      )
    },
    {
      id: 'primeras-planas',
      name: 'Primeras Planas',
      path: '/section/primeras-planas',
      description: 'Portadas de los principales periódicos nacionales',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'columnas-politicas',
      name: 'Columnas Políticas',
      path: '/section/columnas-politicas',
      description: 'Opiniones y análisis de columnistas sobre temas políticos y judiciales',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    },
    {
      id: 'informacion-general',
      name: 'Información General',
      path: '/section/informacion-general',
      description: 'Noticias generales relacionadas con el ámbito judicial',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'cartones',
      name: 'Cartones',
      path: '/section/cartones',
      description: 'Caricaturas políticas y editoriales gráficos',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
      )
    },
    {
      id: 'suprema-corte',
      name: 'Suprema Corte de Justicia de la Nación',
      path: '/section/suprema-corte',
      description: 'Noticias y resoluciones de la Suprema Corte de Justicia',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      )
    },
    {
      id: 'tribunal-electoral',
      name: 'Tribunal Electoral del Poder Judicial de la Federación',
      path: '/section/tribunal-electoral',
      description: 'Noticias y resoluciones del Tribunal Electoral',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    {
      id: 'dof',
      name: 'DOF (Diario Oficial)',
      path: '/section/dof',
      description: 'Publicaciones relevantes del Diario Oficial de la Federación',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      id: 'consejo-judicatura',
      name: 'CONSEJO DE LA JUDICATURA FEDERAL',
      path: '/section/consejo-judicatura',
      description: 'Noticias y comunicados del Consejo de la Judicatura Federal',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    }
  ];

  const formattedDate = latestNews.date
    ? format(parseISO(latestNews.date), 'EEEE d \'de\' MMMM \'de\' yyyy', { locale: es })
    : '';

  return (
    <>
      <Head>
        <title>Portal de Noticias Judiciales | CJF</title>
        <meta name="description" content="Portal de noticias judiciales del Consejo de la Judicatura Federal" />
      </Head>

      <div className="container mx-auto px-4 py-8">
        
        {showCalendar && (
          <div className="mb-8">
            <CalendarWidget />
          </div>
        )}
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-64 bg-gray-200 rounded mb-4"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8">
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
        ) : (
          <>
            {/* Latest News Section - Small Cards Grid */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Últimas Noticias</h2>
                <Link
                  href="/ultimas-noticias"
                  className="text-blue-600 hover:text-blue-800 font-medium flex items-center"
                >
                  Ver todas
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              
              {articlesLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                  {[...Array(16)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-32 bg-gray-200 rounded-lg mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : recentArticles.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                  {recentArticles.map((article) => (
                    <ArticleCard 
                      key={article.id} 
                      article={{
                        ...article,
                        date: article.publication_date || article.date
                      }}
                      compact={true}
                      showBanners={false}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1M19 20a2 2 0 002-2V8a2 2 0 00-2-2h-5a2 2 0 00-2 2v12a2 2 0 002 2h5z" />
                  </svg>
                  <p>No hay artículos recientes disponibles</p>
                </div>
              )}
            </div>

            {/* Traditional Sections */}
            <div className="border-t pt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-8">Secciones</h2>
              <div className="space-y-12">
                {sections.map((section) => (
                  <SectionWrapper key={section.id} section={section} />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}