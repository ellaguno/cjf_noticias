import Link from 'next/link';
import { format } from 'date-fns/index.js';
import es from 'date-fns/locale/es/index.js';
import { useState } from 'react';

export default function ArticleCard({ article, compact = false, showBanners = true }) {
  const [imageError, setImageError] = useState(false);
  const {
    id,
    title,
    summary,
    source,
    source_url,
    image_url,
    date,
    publication_date,
    url,
    external_source_id
  } = article;

  // Prioritize image_url from the article object
  const displayImageUrl = image_url;

  // Safely format the date - use publication_date or date
  const dateToFormat = publication_date || date;
  let formattedDate = '';
  if (dateToFormat) {
    const potentialDate = new Date(dateToFormat + 'T12:00:00');
    if (!isNaN(potentialDate.getTime())) {
      formattedDate = format(potentialDate, 'dd MMM yyyy', { locale: es });
    } else {
      const fallbackDate = new Date(dateToFormat);
      if (!isNaN(fallbackDate.getTime())) {
        formattedDate = format(fallbackDate, 'dd MMM yyyy', { locale: es });
      } else {
        console.warn('Invalid date value received:', dateToFormat);
      }
    }
  }

  const isExternal = external_source_id || source_url;

  return (
    <div className={`${showBanners ? 'card' : 'bg-white rounded-lg shadow-sm border'} h-full flex flex-col overflow-hidden transition-all duration-300 hover:shadow-lg ${compact ? 'border border-gray-200' : 'min-h-[300px]'}`}>
      <div className={`${compact ? 'p-3' : 'p-6'} flex-grow`}>
        <h3 className={`font-semibold ${compact ? 'text-sm' : 'text-xl'} mb-3 line-clamp-3`}>
          <Link
            href={`/article/${id}`}
            className="hover:text-blue-600 transition-colors duration-200"
          >
            {title}
          </Link>
        </h3>
        
        {displayImageUrl && !imageError && (
          <div className={`mb-4 ${compact ? 'h-32' : 'h-48'}`}>
            <img
              src={displayImageUrl}
              alt={title || 'Imagen del artículo'}
              className="w-full h-full object-cover rounded-lg"
              onError={() => setImageError(true)}
            />
          </div>
        )}
        
        {summary && !compact && (
          <p className="text-gray-700 text-base mb-4 line-clamp-4 leading-relaxed">
            {summary}
          </p>
        )}

        {compact && summary && (
          <p className="text-gray-600 text-xs mb-2 line-clamp-2">
            {summary}
          </p>
        )}
      </div>
      
      {showBanners && (
        <div className="bg-gray-50 px-4 py-2 text-xs text-gray-500">
          <div className="flex justify-between items-center mb-1">
            {source && <span className="truncate max-w-[120px]" title={source}>{source}</span>}
            {formattedDate && <span>{formattedDate}</span>}
          </div>
          {(url || source_url) && (
            <div className="flex justify-center">
              <a 
                href={source_url || url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline text-xs"
              >
                {isExternal ? 'Ver fuente original' : 'Ver PDF original'}
              </a>
            </div>
          )}
        </div>
      )}
      
      {!showBanners && (
        <div className="px-3 pb-2 flex justify-between items-center">
          {formattedDate && (
            <span className="text-xs text-gray-500">{formattedDate}</span>
          )}
          {(url || source_url) && (
            <a 
              href={source_url || url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700 text-xs inline-flex items-center"
            >
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {isExternal ? 'Fuente' : 'PDF'}
            </a>
          )}
        </div>
      )}
    </div>
  );
}