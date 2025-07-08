import { useState } from 'react';
import { format } from 'date-fns/index.js';
import es from 'date-fns/locale/es/index.js';
import Link from 'next/link';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3000';

export default function ImageCard({ image, compact = false, onImageClick }) {
  const [imageError, setImageError] = useState(false);
  const { id, title, imageUrl: rawImageUrl, filename, source, date, publication_date } = image;

  const imageUrl = rawImageUrl || (filename ? `${API_BASE_URL}${filename.startsWith('/') ? '' : '/'}${filename}` : null);

  const dateToFormat = publication_date || date;
  const formattedDate = dateToFormat
    ? format(new Date(dateToFormat + 'T12:00:00'), 'dd MMM yyyy', { locale: es })
    : '';

  const handleImageClick = (e) => {
    e.stopPropagation();
    
    if (onImageClick) {
      // Si hay una función de carrusel, usarla
      onImageClick();
    } else if (imageUrl) {
      // Comportamiento por defecto: abrir en nueva pestaña
      window.open(imageUrl, '_blank');
    }
  };

  return (
    <div className={`card h-full flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg ${compact ? 'border border-gray-200' : ''}`}>
      <div className={`p-4 flex-grow ${compact ? 'p-2' : ''}`}>
        <div
          className="thumbnail mb-3 relative overflow-hidden rounded cursor-pointer group"
          style={{ height: compact ? '120px' : '180px' }}
          onClick={handleImageClick}
        >
          {!imageError && imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt={title || 'Imagen'}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={() => setImageError(true)}
              />
              {/* Overlay con icono para indicar acción */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                {onImageClick ? (
                  // Icono de galería para carrusel
                  <svg className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ) : (
                  // Icono de abrir en nueva pestaña
                  <svg className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                )}
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
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
  );
}