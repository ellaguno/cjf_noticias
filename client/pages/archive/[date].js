import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { format, parseISO, isValid } from 'date-fns/index.js';
import es from 'date-fns/locale/es/index.js';
import SectionPreview from '../../components/SectionPreview';
import CalendarWidget from '../../components/CalendarWidget';
import { apiService } from '../../utils/api';

export default function ArchivePage() {
  const router = useRouter();
  const { date } = router.query;
  const [archiveData, setArchiveData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    if (!date) return;

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError('Formato de fecha inválido. Use el formato YYYY-MM-DD.');
      setLoading(false);
      return;
    }

    // Check if date is valid
    const parsedDate = parseISO(date);
    if (!isValid(parsedDate)) {
      setError('Fecha inválida.');
      setLoading(false);
      return;
    }

    const fetchArchiveData = async () => {
      try {
        setLoading(true);
        const response = await apiService.getArchiveByDate(date);
        setArchiveData(response.data);
        setLoading(false);
      } catch (err) {
        console.error(`Error fetching archive for ${date}:`, err);
        setError('Error al cargar el archivo. Por favor, intente de nuevo más tarde.');
        setLoading(false);
        
        // Only use mock data if explicitly in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log('Using mock data for archive in development mode');
          const mockData = generateMockArchiveData(date);
          setArchiveData(mockData);
        }
      }
    };

    fetchArchiveData();
  }, [date]);

  // Function to generate mock archive data for development
  const generateMockArchiveData = (dateStr) => {
    const parsedDate = parseISO(dateStr);
    
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
    
    // Generate sections with content counts
    const sectionsWithCounts = sections.map(sectionId => {
      // Generate a random count between 0 and 10, with some sections having more content
      let count;
      if (['ocho-columnas', 'primeras-planas', 'informacion-general'].includes(sectionId)) {
        count = Math.floor(Math.random() * 6) + 5; // 5-10 items
      } else {
        count = Math.floor(Math.random() * 6); // 0-5 items
      }
      
      return {
        id: sectionId,
        name: formatSectionName(sectionId),
        count
      };
    });
    
    return {
      date: dateStr,
      formattedDate: format(parsedDate, 'EEEE d \'de\' MMMM \'de\' yyyy', { locale: es }),
      sections: sectionsWithCounts,
      totalItems: sectionsWithCounts.reduce((sum, section) => sum + section.count, 0)
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
      'consejo-judicatura': 'CONSEJO DE LA JUDICATURA FEDERAL'
    };
    
    return names[id] || id;
  };

  const toggleCalendar = () => {
    setShowCalendar(!showCalendar);
  };

  return (
    <>
      <Head>
        <title>
          {archiveData 
            ? `Archivo: ${archiveData.formattedDate}` 
            : 'Archivo de Noticias'} | Portal de Noticias Judiciales
        </title>
        <meta 
          name="description" 
          content={`Archivo de noticias judiciales del ${archiveData?.formattedDate || date}`} 
        />
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
        
        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-3/4">
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
              <div className="p-6 bg-primary text-white">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                  <h1 className="text-2xl md:text-3xl font-bold mb-2 md:mb-0">
                    Archivo de Noticias
                  </h1>
                  
                  <button 
                    onClick={toggleCalendar}
                    className="flex items-center text-white bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 md:hidden"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{showCalendar ? 'Ocultar calendario' : 'Mostrar calendario'}</span>
                  </button>
                </div>
                
                {archiveData && (
                  <p className="mt-2 text-white text-opacity-90 capitalize">
                    {archiveData.formattedDate}
                  </p>
                )}
              </div>
              
              {showCalendar && (
                <div className="p-6 border-b border-gray-200 md:hidden">
                  <CalendarWidget compact={true} />
                </div>
              )}
              
              <div className="p-6">
                {loading ? (
                  <div className="space-y-8">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[...Array(4)].map((_, j) => (
                            <div key={j} className="h-48 bg-gray-200 rounded"></div>
                          ))}
                        </div>
                      </div>
                    ))}
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
                        <p className="text-sm text-red-600 mt-1">Intente seleccionar otra fecha o volver a la página de inicio.</p>
                      </div>
                    </div>
                  </div>
                ) : archiveData?.totalItems === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">No hay contenido disponible</h3>
                    <p className="text-gray-500">
                      No se encontraron noticias para la fecha seleccionada.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-12">
                    {archiveData.sections
                      .filter(section => section.count > 0)
                      .map((section) => (
                        <div key={section.id} className="mb-8">
                          <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">{section.name}</h2>
                            <Link 
                              href={`/section/${section.id}?date=${date}`}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Ver todo ({section.count})
                            </Link>
                          </div>
                          <SectionPreview sectionId={section.id} maxItems={6} />
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="md:w-1/4 hidden md:block">
            <div className="sticky top-8">
              <CalendarWidget />
              
              <div className="mt-8 bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 bg-primary text-white">
                  <h2 className="font-semibold">Fechas recientes</h2>
                </div>
                
                <div className="p-4">
                  <ul className="space-y-2">
                    {[...Array(5)].map((_, i) => {
                      const d = new Date();
                      d.setDate(d.getDate() - i);
                      const dateStr = format(d, 'yyyy-MM-dd');
                      const formattedDate = format(d, 'EEEE d \'de\' MMMM', { locale: es });
                      
                      return (
                        <li key={i}>
                          <Link 
                            href={`/archive/${dateStr}`}
                            className={`block px-3 py-2 rounded-md hover:bg-gray-100 capitalize ${
                              date === dateStr ? 'bg-blue-50 text-blue-700 font-medium' : ''
                            }`}
                          >
                            {formattedDate}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
              
              <div className="mt-8 bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-4 bg-primary text-white">
                  <h2 className="font-semibold">Buscar por fecha</h2>
                </div>
                
                <div className="p-4">
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formDate = e.target.elements.dateInput.value;
                      if (formDate) {
                        router.push(`/archive/${formDate}`);
                      }
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label htmlFor="dateInput" className="block text-sm font-medium text-gray-700 mb-1">
                        Seleccione una fecha
                      </label>
                      <input
                        type="date"
                        id="dateInput"
                        name="dateInput"
                        defaultValue={date}
                        max={new Date().toISOString().split('T')[0]}
                        className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
                      />
                    </div>
                    
                    <button
                      type="submit"
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Ir a esta fecha
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}