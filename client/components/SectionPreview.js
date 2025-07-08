import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ArticleCard from './ArticleCard';
import ImageCard from './ImageCard';
import ImageCarousel from './ImageCarousel';
import { apiService } from '../utils/api';

export default function SectionPreview({ sectionId, maxItems = 6, showViewAll = true, compact = false }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCarousel, setShowCarousel] = useState(false);
  const [carouselStartIndex, setCarouselStartIndex] = useState(0);

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

  const openCarousel = (startIndex = 0) => {
    setCarouselStartIndex(startIndex);
    setShowCarousel(true);
  };

  const closeCarousel = () => {
    setShowCarousel(false);
  };

  if (loading) {
    return <div className="animate-pulse h-64 bg-gray-200 rounded"></div>;
  }

  if (error || items.length === 0) {
    return null;
  }

  const visibleItems = isImageSection ? items.slice(0, maxItems) : items;

  return (
    <div className="w-full relative">
      <div className={`grid ${compact ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'} gap-3`}>
        {visibleItems.map((item, index) => (
          <div key={item.id}>
            {item.type === 'image' ? (
              <ImageCard 
                image={item} 
                compact={compact} 
                onImageClick={isImageSection ? () => openCarousel(index) : undefined}
              />
            ) : (
              <ArticleCard article={item} compact={compact} showBanners={!compact} />
            )}
          </div>
        ))}
      </div>

      {/* Carrusel Modal */}
      {isImageSection && (
        <ImageCarousel
          isOpen={showCarousel}
          onClose={closeCarousel}
          images={items.filter(item => item.imageUrl || item.filename)}
          initialIndex={carouselStartIndex}
        />
      )}
    </div>
  );
}