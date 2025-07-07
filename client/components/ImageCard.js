import { useState } from 'react';
import { format } from 'date-fns/index.js';
import es from 'date-fns/locale/es/index.js';
import Link from 'next/link';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3000';

export default function ImageCard({ image, compact = false }) {
  const [imageError, setImageError] = useState(false);
  const { id, title, imageUrl: rawImageUrl, filename, source, date, publication_date } = image;

  const imageUrl = rawImageUrl || (filename ? `${API_BASE_URL}${filename.startsWith('/') ? '' : '/'}${filename}` : null);

  const dateToFormat = publication_date || date;
  const formattedDate = dateToFormat
    ? format(new Date(dateToFormat + 'T12:00:00'), 'dd MMM yyyy', { locale: es })
    : '';

  const handleImageClick = (e) => {
    e.preventDefault();
    if (imageUrl) {
      window.open(imageUrl, '_blank');
    }
  };

  return (
    <div className={`card h-full flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg ${compact ? 'border border-gray-200' : ''}`}>
      <div className={`p-4 flex-grow ${compact ? 'p-2' : ''}`}>
        <a href={imageUrl} onClick={handleImageClick} target="_blank" rel="noopener noreferrer" className="block">
          <div
            className="thumbnail mb-3 relative overflow-hidden rounded cursor-pointer"
            style={{ height: compact ? '120px' : '180px' }}
          >
            {!imageError && imageUrl ? (
              <img
                src={imageUrl}
                alt={title || 'Imagen'}
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>
        </a>
        
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