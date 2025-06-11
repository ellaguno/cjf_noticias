import { useState, useEffect } from 'react';
import { format } from 'date-fns/index.js';
import es from 'date-fns/locale/es/index.js';
import Link from 'next/link';

// Get the API URL from environment variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3000';

export default function ImageCard({ image, compact = false, images = [], currentIndex = 0, onNavigate }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [localCurrentIndex, setLocalCurrentIndex] = useState(currentIndex);
  
  // Use current image based on index
  const currentImage = images.length > 0 ? images[localCurrentIndex] : image;
  const {
    id,
    title,
    imageUrl: rawImageUrl,
    filename,
    source,
    date,
    sectionId
  } = currentImage;
  
  // Use imageUrl or filename, whichever is available
  const imageUrl = rawImageUrl || filename;

  // Format the date
  const formattedDate = date
    ? format(new Date(date), 'dd MMM yyyy', { locale: es })
    : '';

  const toggleExpand = (e) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
    // Reset loading state when opening modal
    if (!isExpanded) {
      setIsLoading(true);
    }
  };

  // Navigation functions
  const goToPrevious = () => {
    if (images.length > 1) {
      const newIndex = localCurrentIndex > 0 ? localCurrentIndex - 1 : images.length - 1;
      setLocalCurrentIndex(newIndex);
      setIsLoading(true);
      if (onNavigate) {
        onNavigate(newIndex);
      }
    }
  };

  const goToNext = () => {
    if (images.length > 1) {
      const newIndex = localCurrentIndex < images.length - 1 ? localCurrentIndex + 1 : 0;
      setLocalCurrentIndex(newIndex);
      setIsLoading(true);
      if (onNavigate) {
        onNavigate(newIndex);
      }
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsExpanded(false);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPrevious();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToNext();
      }
    };
    
    if (isExpanded) {
      window.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isExpanded, localCurrentIndex, images.length]);

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isExpanded]);

  return (
    <>
      <div className={`card h-full flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg ${compact ? 'border border-gray-200' : ''}`}>
        <div className={`p-4 flex-grow ${compact ? 'p-2' : ''}`}>
          <div
            className="thumbnail mb-3 relative overflow-hidden rounded"
            onClick={toggleExpand}
            style={{ height: compact ? '120px' : '180px' }}
          >
            {!imageError && imageUrl ? (
              <img
                src={imageUrl.startsWith('http') ? imageUrl : `${API_BASE_URL}${imageUrl}`}
                alt={title || 'Imagen'}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                onError={(e) => {
                  setImageError(true);
                  e.target.onerror = null;
                }}
                onLoad={() => setIsLoading(false)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            
            {isLoading && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            )}
            
            <div className="absolute bottom-0 right-0 p-1 bg-blue-600 text-white text-xs rounded-tl-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          {title && (
            <h3 className={`font-semibold ${compact ? 'text-xs line-clamp-2' : 'text-sm'} text-center`}>
              <Link href={`/article/${id}`} className="hover:text-blue-600 transition-colors duration-200">
                {title}
              </Link>
            </h3>
          )}
        </div>
        
        <div className="bg-gray-50 px-4 py-2 text-xs text-gray-500 flex justify-between items-center">
          {source && <span className="truncate max-w-[120px]" title={source}>{source}</span>}
          {formattedDate && <span>{formattedDate}</span>}
        </div>
      </div>

      {/* Expanded image modal */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={toggleExpand}
        >
          <div
            className="relative max-w-5xl max-h-full bg-white rounded-lg overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black to-transparent h-16 z-10">
              <div className="flex justify-between items-center p-4">
                <h3 className="text-white font-medium truncate">{title}</h3>
                <button
                  className="bg-white bg-opacity-20 rounded-full p-2 text-white hover:bg-opacity-30 transition-all duration-200"
                  onClick={toggleExpand}
                  aria-label="Cerrar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="relative">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              )}
              
              {imageUrl && (
                <img
                  src={imageUrl.startsWith('http') ? imageUrl : `${API_BASE_URL}${imageUrl}`}
                  alt={title || 'Imagen ampliada'}
                  className="max-w-full max-h-[80vh] object-contain mx-auto"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/800x1200?text=Error+al+cargar+imagen';
                  }}
                  onLoad={() => setIsLoading(false)}
                />
              )}
            </div>
            
            <div className="bg-white p-4">
              {title && <h3 className="font-semibold text-lg">{title}</h3>}
              
              <div className="flex justify-between items-center mt-2 text-sm text-gray-600">
                {source && <span>{source}</span>}
                {formattedDate && <span>{formattedDate}</span>}
              </div>
              
              {sectionId && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <Link
                    href={`/section/${sectionId}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Ver más de esta sección
                  </Link>
                </div>
              )}
            </div>
            
            {/* Navigation arrows - only show if there are multiple images */}
            {images.length > 1 && (
              <div className="absolute bottom-20 left-0 right-0 flex justify-between px-4">
                <button
                  className="bg-black bg-opacity-50 rounded-full p-3 text-white hover:bg-opacity-70 transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrevious();
                  }}
                  aria-label="Imagen anterior"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <div className="flex items-center space-x-2">
                  <span className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                    {localCurrentIndex + 1} / {images.length}
                  </span>
                </div>
                
                <button
                  className="bg-black bg-opacity-50 rounded-full p-3 text-white hover:bg-opacity-70 transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNext();
                  }}
                  aria-label="Siguiente imagen"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}