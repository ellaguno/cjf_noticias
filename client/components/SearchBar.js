import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { apiService } from '../utils/api';

export default function SearchBar({ compact = false }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    section: 'all',
    date: 'all'
  });
  const router = useRouter();
  const searchRef = useRef(null);

  // Initialize search term from URL if present
  useEffect(() => {
    if (router.query.q) {
      setSearchTerm(router.query.q);
    }
  }, [router.query.q]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch suggestions as user types
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchTerm.trim().length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        // In a real implementation, this would fetch from the API
        // For now, we'll just simulate suggestions
        // const response = await apiService.searchSuggestions(searchTerm);
        // setSuggestions(response.data.suggestions);
        
        // Mock suggestions
        const mockSuggestions = [
          { id: '1', title: `${searchTerm} en Suprema Corte`, type: 'article', sectionId: 'suprema-corte' },
          { id: '2', title: `Noticias sobre ${searchTerm}`, type: 'article', sectionId: 'informacion-general' },
          { id: '3', title: `${searchTerm} en el DOF`, type: 'article', sectionId: 'dof' },
          { id: '4', title: `Columna sobre ${searchTerm}`, type: 'article', sectionId: 'columnas-politicas' },
        ];
        
        setTimeout(() => {
          setSuggestions(mockSuggestions);
          setLoading(false);
        }, 300);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(() => {
      if (searchTerm.trim()) {
        fetchSuggestions();
      } else {
        setSuggestions([]);
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      // Build query parameters
      const query = { q: searchTerm };
      
      if (filters.section !== 'all') {
        query.section = filters.section;
      }
      
      if (filters.date !== 'all') {
        query.date = filters.date;
      }
      
      router.push({
        pathname: '/search',
        query
      });
      
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    if (suggestion.type === 'article') {
      router.push(`/article/${suggestion.id}`);
    } else if (suggestion.sectionId) {
      router.push(`/section/${suggestion.sectionId}?q=${searchTerm}`);
    }
    setShowSuggestions(false);
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="relative" ref={searchRef}>
      <form onSubmit={handleSearch} className={`flex items-center ${compact ? 'flex-col' : 'flex-row'}`}>
        <div className="relative w-full">
          <input
            type="text"
            placeholder="Buscar noticias..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            className={`py-2 pl-10 pr-4 ${compact ? 'w-full' : 'w-64 md:w-80'} rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
            aria-label="Buscar noticias"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          
          {loading && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          )}
        </div>
        
        <button
          type="submit"
          className={`bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            compact ? 'w-full mt-2' : 'ml-2'
          }`}
        >
          Buscar
        </button>
      </form>
      
      {/* Advanced search filters - only show in compact mode */}
      {compact && (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="section-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Sección
            </label>
            <select
              id="section-filter"
              name="section"
              value={filters.section}
              onChange={handleFilterChange}
              className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
            >
              <option value="all">Todas las secciones</option>
              <option value="ocho-columnas">Ocho Columnas</option>
              <option value="primeras-planas">Primeras Planas</option>
              <option value="columnas-politicas">Columnas Políticas</option>
              <option value="informacion-general">Información General</option>
              <option value="cartones">Cartones</option>
              <option value="suprema-corte">Suprema Corte</option>
              <option value="tribunal-electoral">Tribunal Electoral</option>
              <option value="dof">DOF</option>
              <option value="consejo-judicatura">Consejo de la Judicatura</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha
            </label>
            <select
              id="date-filter"
              name="date"
              value={filters.date}
              onChange={handleFilterChange}
              className="w-full rounded-md border border-gray-300 py-2 px-3 text-sm"
            >
              <option value="all">Todas las fechas</option>
              <option value="today">Hoy</option>
              <option value="yesterday">Ayer</option>
              <option value="week">Última semana</option>
              <option value="month">Último mes</option>
            </select>
          </div>
        </div>
      )}
      
      {/* Search suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto">
          <ul className="py-1">
            {suggestions.map((suggestion) => (
              <li key={suggestion.id}>
                <button
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <div className="flex items-center">
                    <span className="mr-2 text-gray-400">
                      {suggestion.type === 'article' ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1M19 20a2 2 0 002-2V8a2 2 0 00-2-2h-5a2 2 0 00-2 2v12a2 2 0 002 2h5z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </span>
                    <span>{suggestion.title}</span>
                  </div>
                  {suggestion.sectionId && (
                    <span className="text-xs text-gray-500 block ml-6">
                      {suggestion.sectionId.replace(/-/g, ' ')}
                    </span>
                  )}
                </button>
              </li>
            ))}
            
            <li className="border-t border-gray-100">
              <Link
                href={`/search?q=${encodeURIComponent(searchTerm)}`}
                className="block px-4 py-2 text-blue-600 hover:bg-gray-100 text-sm font-medium"
                onClick={() => setShowSuggestions(false)}
              >
                Ver todos los resultados para "{searchTerm}"
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}