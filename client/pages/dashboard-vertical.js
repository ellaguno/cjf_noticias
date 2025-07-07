import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import axios from 'axios';

export default function DashboardVerticalPage() {
  const router = useRouter();
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load articles on component mount
  useEffect(() => {
    loadArticles();
  }, []);

  const loadArticles = async () => {
    try {
      setLoading(true);
      
      // Get all sections first
      const sectionsResponse = await axios.get('/api/sections');
      const allSections = sectionsResponse.data;
      
      // Load articles for each section
      const sectionsWithArticles = await Promise.all(
        allSections.map(async (section) => {
          try {
            const articlesResponse = await axios.get(`/api/sections/${section.id}/articles`);
            return {
              ...section,
              articles: articlesResponse.data || []
            };
          } catch (error) {
            console.error(`Error loading articles for section ${section.id}:`, error);
            return { ...section, articles: [] };
          }
        })
      );
      
      setSections(sectionsWithArticles);
    } catch (error) {
      console.error('Error loading sections and articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleArticleClick = (article) => {
    router.push(`/article/${article.id}`);
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  const getSectionDisplayName = (sectionName) => {
    // Map API section names to display names matching the reference image
    const sectionMap = {
      'primeras-planas': 'Primeros Planas',
      'columnas-politicas': 'Columnas Políticas',
      'cartones': 'Y espacio',
      'ocho-columnas': 'Ocho Columnas',
      'suprema-corte': 'Suprema Corte',
      'tribunal-electoral': 'Tribunal Electoral',
      'consejo-judicatura': 'Consejo Judicatura',
      'informacion-general': 'Información General',
      'ultimas-noticias': 'Últimas Noticias'
    };
    
    return sectionMap[sectionName] || sectionName;
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando secciones...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {sections.map((section) => (
              <div key={section.id} className="relative">
                {/* Section with vertical blue bar and rotated text */}
                <div className="flex">
                  {/* Vertical blue bar with rotated text - exactly like the reference image */}
                  <div className="w-16 bg-blue-600 flex items-center justify-center min-h-[400px] mr-6">
                    <div className="transform -rotate-90 whitespace-nowrap">
                      <span className="text-white font-bold text-sm tracking-wider uppercase">
                        {getSectionDisplayName(section.name)}
                      </span>
                    </div>
                    
                    {/* Small decorative icon */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                      <svg className="w-4 h-4 text-white opacity-75" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Articles grid for this section */}
                  <div className="flex-1">
                    {section.articles && section.articles.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {section.articles.slice(0, 6).map((article) => (
                          <div 
                            key={article.id} 
                            className="bg-white border border-gray-200 rounded-lg shadow-sm cursor-pointer hover:shadow-lg transition-shadow duration-200"
                            onClick={() => handleArticleClick(article)}
                          >
                            {/* Article Preview */}
                            <div className="relative h-48 bg-gray-50 rounded-t-lg flex items-center justify-center border-b">
                              {article.image_url ? (
                                <img 
                                  src={article.image_url} 
                                  alt={article.title}
                                  className="w-full h-full object-cover rounded-t-lg"
                                />
                              ) : (
                                <svg className="h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              )}
                              
                              {/* Date overlay like in the reference image */}
                              <div className="absolute top-2 left-2 bg-white rounded px-2 py-1 shadow-sm">
                                <span className="text-xs font-medium text-gray-600">
                                  {formatDate(article.date)}
                                </span>
                              </div>
                            </div>

                            <div className="p-4">
                              <h4 className="font-medium text-gray-900 mb-2 line-clamp-2 text-sm">
                                {article.title}
                              </h4>
                              <div className="space-y-1 text-xs text-gray-500">
                                {article.source && (
                                  <p className="truncate font-medium">{article.source}</p>
                                )}
                                {article.excerpt && (
                                  <p className="line-clamp-2">{article.excerpt}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <svg className="h-12 w-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p>No hay artículos en esta sección</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}