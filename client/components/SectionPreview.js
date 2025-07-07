import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ArticleCard from './ArticleCard';
import ImageCard from './ImageCard';
import { apiService } from '../utils/api';

export default function SectionPreview({ sectionId, maxItems = 6, showViewAll = true, compact = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef(null);

  const isImageSection = sectionId === 'primeras-planas' || sectionId === 'cartones' || sectionId === 'columnas-politicas';

  useEffect(() => {
    const fetchSectionItems = async () => {
      try {
        setLoading(true);
        const response = await apiService.getSectionPreview(sectionId, { limit: isImageSection ? 50 : maxItems });
        let fetchedItems = (response.data.items || []).map(item => ({
          ...item,
          imageUrl: item.imageUrl || item.filename
        }));

        if (isImageSection) {
          fetchedItems = fetchedItems.filter(item => item.imageUrl);
        }
        
        setItems(fetchedItems);
        setLoading(false);
      } catch (err) {
        console.error(`Error fetching ${sectionId} preview:`, err);
        setError(`Error al cargar la sección ${sectionId}`);
        setLoading(false);
      }
    };

    fetchSectionItems();
  }, [sectionId, maxItems, isImageSection]);

  const handleNext = () => {
    const newIndex = currentIndex + (compact ? 6 : 4);
    if (newIndex < items.length) {
      setCurrentIndex(newIndex);
    }
  };

  const handlePrev = () => {
    const newIndex = currentIndex - (compact ? 6 : 4);
    if (newIndex >= 0) {
      setCurrentIndex(newIndex);
    }
  };

  if (loading) {
    return <div className="animate-pulse h-64 bg-gray-200 rounded"></div>;
  }

  if (error || items.length === 0) {
    return null;
  }

  const visibleItems = isImageSection ? items.slice(currentIndex, currentIndex + maxItems) : items;

  return (
    <div className="w-full relative">
      {isImageSection && items.length > maxItems && (
        <div className="absolute top-1/2 -translate-y-1/2 flex justify-between w-full z-10">
          <button 
            onClick={handlePrev} 
            disabled={currentIndex === 0}
            className="bg-white bg-opacity-70 hover:bg-opacity-100 rounded-full p-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed -ml-4"
          >
            <svg className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button 
            onClick={handleNext} 
            disabled={currentIndex + maxItems >= items.length}
            className="bg-white bg-opacity-70 hover:bg-opacity-100 rounded-full p-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed -mr-4"
          >
            <svg className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      )}
      <div className={`grid ${compact ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'} gap-3`}>
        {visibleItems.map((item) => (
          <div key={item.id}>
            {item.type === 'image' ? (
              <ImageCard image={item} compact={compact} />
            ) : (
              <ArticleCard article={item} compact={compact} showBanners={!compact} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}