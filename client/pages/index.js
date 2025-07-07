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
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [sectionsLoading, setSectionsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    const fetchLatestNews = async () => {
      try {
        setLoading(true);
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
        
        allArticles.sort((a, b) => new Date(b.publication_date || b.created_at) - new Date(a.publication_date || a.created_at));
        setRecentArticles(allArticles.slice(0, 16));
        
      } catch (err) {
        console.error('Error fetching recent articles:', err);
      } finally {
        setArticlesLoading(false);
      }
    };

    const fetchSections = async () => {
      try {
        setSectionsLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
        const response = await fetch(`${apiUrl}/sections`);
        const sectionsData = await response.json();
        
        const sectionsWithContent = sectionsData
          .filter(section => section.articleCount > 0)
          .map(section => ({
            ...section,
            path: getSectionPath(section.id),
            description: getSectionDescription(section.id),
            icon: getSectionIcon(section.id)
          }))
          .sort((a, b) => {
            if (a.id === 'ultimas-noticias') return -1;
            if (b.id === 'ultimas-noticias') return 1;
            return 0;
          });
        
        setSections(sectionsWithContent);
      } catch (err) {
        console.error('Error fetching sections:', err);
      } finally {
        setSectionsLoading(false);
      }
    };

    fetchLatestNews();
    fetchRecentArticles();
    fetchSections();
  }, []);

  const getSectionPath = (sectionId) => {
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
    return sectionPaths[sectionId] || `/section/${sectionId}`;
  };

  const getSectionDescription = (sectionId) => {
    const descriptions = {
      'ultimas-noticias': 'Últimas noticias del día',
      'ocho-columnas': 'Principales noticias y titulares de los medios nacionales',
      'primeras-planas': 'Portadas de los principales periódicos nacionales',
      'columnas-politicas': 'Opiniones y análisis de columnistas sobre temas políticos y judiciales',
      'informacion-general': 'Noticias generales relacionadas con el ámbito judicial',
      'cartones': 'Caricaturas políticas y editoriales gráficos',
      'suprema-corte': 'Noticias y resoluciones de la Suprema Corte de Justicia',
      'tribunal-electoral': 'Noticias y resoluciones del Tribunal Electoral',
      'dof': 'Publicaciones relevantes del Diario Oficial de la Federación',
      'consejo-judicatura': 'Noticias y comunicados del Consejo de la Judicatura Federal',
      'agenda': 'Agenda de eventos y actividades',
      'sintesis-informativa': 'Síntesis informativa diaria'
    };
    return descriptions[sectionId] || 'Contenido de la sección';
  };

  const getSectionIcon = (sectionId) => {
    const icons = {
      'ultimas-noticias': (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      'ocho-columnas': (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1M19 20a2 2 0 002-2V8a2 2 0 00-2-2h-5a2 2 0 00-2 2v12a2 2 0 002 2h5z" />
        </svg>
      ),
      'primeras-planas': (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      'columnas-politicas': (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      'informacion-general': (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      'cartones': (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
      ),
      'suprema-corte': (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
        </svg>
      ),
      'tribunal-electoral': (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      'dof': (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      'consejo-judicatura': (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      'agenda': (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      'sintesis-informativa': (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    };
    return icons[sectionId] || (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  const formattedDate = latestNews.date
    ? format(parseISO(latestNews.date), "EEEE d 'de' MMMM 'de' yyyy", { locale: es })
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
          <div className="grid grid-cols-1 gap-8">
            {/* Main Content Area */}
            <div className="lg:col-span-1">
              {/* Dynamic Sections */}
              <div className="">
                {sectionsLoading ? (
                  <div className="space-y-12">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                        <div className="h-64 bg-gray-200 rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : sections.length > 0 ? (
                  <div className="space-y-12">
                    {sections.map((section) => (
                      <SectionWrapper key={section.id} section={section} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p>No hay secciones con contenido disponible</p>
                    <p className="text-sm mt-1">Las secciones aparecerán cuando tengan artículos</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
