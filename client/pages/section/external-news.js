import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { format, parseISO } from 'date-fns/index.js';
import es from 'date-fns/locale/es/index.js';
import Layout from '../../components/Layout';
import ArticleCard from '../../components/ArticleCard';
import { apiService } from '../../utils/api';

export default function ExternalNewsSection() {
  const router = useRouter();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchExternalNews();
  }, []);

  const fetchExternalNews = async () => {
    try {
      setLoading(true);
      const response = await apiService.getSectionContent('external-news');
      
      // If section data format, extract articles
      if (response.data && response.data.articles) {
        setArticles(response.data.articles);
      } else if (Array.isArray(response.data)) {
        setArticles(response.data);
      } else {
        setArticles([]);
      }
    } catch (err) {
      console.error('Error fetching external news:', err);
      setError('Error al cargar las noticias externas. Por favor, intente de nuevo más tarde.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      // Trigger fetch from all external sources
      await fetch('/api/external-sources/fetch', {
        method: 'POST'
      });
      
      // Refresh the page data
      await fetchExternalNews();
    } catch (err) {
      console.error('Error refreshing external news:', err);
      setError('Error al actualizar las noticias externas.');
    } finally {
      setLoading(false);
    }
  };

  const pageTitle = 'Noticias Externas';
  const pageDescription = 'Noticias de fuentes externas y medios internacionales';

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando noticias externas...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null);
                fetchExternalNews();
              }}
              className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <>
      <Head>
        <title>{pageTitle} | Portal de Noticias Judiciales</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={`${pageTitle} | Portal de Noticias Judiciales`} />
        <meta property="og:description" content={pageDescription} />
      </Head>

      <Layout>
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-8">
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold mb-2">{pageTitle}</h1>
                <p className="text-blue-100">{pageDescription}</p>
                {articles.length > 0 && (
                  <p className="text-sm text-blue-200 mt-2">
                    {articles.length} artículo{articles.length !== 1 ? 's' : ''} disponible{articles.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-4 py-2 rounded-lg transition-all duration-200 disabled:opacity-50"
              >
                <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Actualizar
              </button>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          {articles.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay noticias externas disponibles
              </h3>
              <p className="text-gray-600 mb-6">
                No se han encontrado artículos de fuentes externas para mostrar.
              </p>
              <button
                onClick={handleRefresh}
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors"
              >
                Buscar noticias
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {articles.map((article) => (
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
          )}

          {articles.length > 0 && (
            <div className="mt-8 text-center">
              <p className="text-gray-600 text-sm">
                Última actualización: {new Date().toLocaleString('es-ES')}
              </p>
            </div>
          )}
        </div>
      </Layout>
    </>
  );
}