import Link from 'next/link';
import Image from 'next/image';
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
    imageUrl,
    images,
    sectionId,
    content,
    url,
    external_source_id
  } = article;

  // Get the first image URL from images array, image_url, or direct imageUrl
  const firstImageUrl = image_url || 
    (images && images.length > 0 
      ? (images[0].url || (images[0].filename?.startsWith('/storage') ? images[0].filename : `/storage/uploads/${images[0].filename}`))
      : imageUrl);

  // Format the date
  const formattedDate = date
    ? format(new Date(date), 'dd MMM yyyy', { locale: es })
    : '';

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
        
        {firstImageUrl && !imageError && !compact && (
          <div className="flex justify-center mb-4">
            <img
              src={firstImageUrl}
              alt={source || 'Imagen del artículo'}
              className="max-h-48 w-auto object-contain rounded-lg shadow-sm"
              onError={(e) => {
                setImageError(true);
                e.target.onerror = null;
              }}
            />
          </div>
        )}
        
        {firstImageUrl && !imageError && compact && (
          <div className={`flex justify-center mb-3 ${compact ? 'h-12' : 'h-16'}`}>
            <img
              src={firstImageUrl}
              alt={source || 'Imagen del artículo'}
              className="h-full object-contain rounded"
              onError={(e) => {
                setImageError(true);
                e.target.onerror = null;
              }}
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