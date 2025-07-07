import { useState, useEffect } from 'react';
import Link from 'next/link';
import SectionPreview from './SectionPreview';
import { apiService } from '../utils/api';

export default function SectionWrapper({ section, maxItems = 6 }) {
  const [hasContent, setHasContent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkContent = async () => {
      try {
        setLoading(true);
        const response = await apiService.getSectionPreview(section.id);
        const items = response.data.items || [];
        setHasContent(items.length > 0);
        setLoading(false);
      } catch (err) {
        console.error(`Error checking content for ${section.id}:`, err);
        setHasContent(false);
        setLoading(false);
      }
    };

    checkContent();
  }, [section.id]);

  if (loading) {
    return (
      <div className="flex bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="w-16 flex items-center justify-center" style={{backgroundColor: 'var(--primary-color, #1a56db)', color: 'var(--section-text-color, #ffffff)'}}>
          <div className="transform -rotate-90 whitespace-nowrap">
            <div className="flex items-center">
              <span className="text-xs mr-1">{section.icon}</span>
              <h3 className="text-sm font-semibold">{section.name}</h3>
            </div>
          </div>
        </div>
        <div className="flex-1">
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
          <div className="p-4">
            <div className="animate-pulse grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!hasContent) {
    return null; // Don't render sections without content
  }

  return (
    <div className="flex bg-white rounded-lg shadow-md overflow-hidden mb-8">
      {/* Vertical Section Label */}
      <div className="w-16 flex items-center justify-center relative" style={{backgroundColor: 'var(--primary-color, #1a56db)', color: 'var(--section-text-color, #ffffff)'}}>
        <div className="transform -rotate-90 whitespace-nowrap">
          <div className="flex items-center">
            <span className="text-xs mr-1">{section.icon}</span>
            <h3 className="text-sm font-semibold">{section.name}</h3>
          </div>
        </div>
      </div>
      {/* Content Area */}
      <div className="flex-1">
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{section.description || 'Contenido de la sección'}</span>
            <Link
              href={section.path}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
            >
              Ver todo
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
        <div className="p-4">
          <SectionPreview sectionId={section.id} maxItems={maxItems} compact={true} />
        </div>
      </div>
    </div>
  );
}