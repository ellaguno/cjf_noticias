import { useState, useEffect } from 'react';
import Link from 'next/link';
import SectionPreview from './SectionPreview';
import { apiService } from '../utils/api';

export default function SectionWrapper({ section }) {
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
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-4 bg-primary text-white flex items-center justify-between">
          <div className="flex items-center">
            {section.icon}
            <h3 className="text-xl font-semibold ml-2">{section.name}</h3>
          </div>
        </div>
        <div className="p-4">
          <div className="animate-pulse grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!hasContent) {
    return null; // Don't render sections without content
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 bg-primary text-white flex items-center justify-between">
        <div className="flex items-center">
          {section.icon}
          <h3 className="text-xl font-semibold ml-2">{section.name}</h3>
        </div>
        <Link
          href={section.path}
          className="text-white bg-blue-700 hover:bg-blue-800 px-4 py-1 rounded-full text-sm font-medium transition-colors duration-200"
        >
          Ver todo
        </Link>
      </div>
      <div className="p-4">
        <SectionPreview sectionId={section.id} maxItems={6} compact={true} />
      </div>
    </div>
  );
}