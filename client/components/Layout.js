import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Navigation from './Navigation';
import SearchBar from './SearchBar';
import Footer from './Footer';
import CalendarWidget from './CalendarWidget';

export default function Layout({ children }) {
  const [showCalendar, setShowCalendar] = useState(false);
  const [logoUrl, setLogoUrl] = useState('/logo-cjf.png');
  const [logoLink, setLogoLink] = useState('/');

  const toggleCalendar = () => {
    setShowCalendar(!showCalendar);
  };

  useEffect(() => {
    // Load custom CSS settings
    const loadCSSSettings = async () => {
      try {
        const response = await fetch('/api/admin/settings');
        if (response.ok) {
          const settings = await response.json();
          
          settings.forEach(setting => {
            if (setting.key === 'css_logo_url') {
              setLogoUrl(setting.value);
            }
            if (setting.key === 'css_logo_link') {
              setLogoLink(setting.value);
            }
            if (setting.key === 'css_primary_color') {
              document.documentElement.style.setProperty('--primary-color', setting.value);
            }
            if (setting.key === 'css_section_text_color') {
              document.documentElement.style.setProperty('--section-text-color', setting.value);
            }
            if (setting.key === 'css_header_bg') {
              document.documentElement.style.setProperty('--header-bg-color', setting.value);
            }
          });
        }
      } catch (error) {
        console.error('Error loading CSS settings:', error);
      }
    };

    loadCSSSettings();

    // Listen for CSS settings changes
    const handleCSSChange = (event) => {
      const settings = event.detail;
      if (settings.css_logo_url) setLogoUrl(settings.css_logo_url);
      if (settings.css_logo_link) setLogoLink(settings.css_logo_link);
    };

    window.addEventListener('cssSettingsChanged', handleCSSChange);
    return () => window.removeEventListener('cssSettingsChanged', handleCSSChange);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Head>
        <title>Portal de Noticias Judiciales | CJF</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="bg-white shadow-md" style={{backgroundColor: 'var(--header-bg-color, #ffffff)'}}>
        <div className="container mx-auto px-4 py-3">
          {/* Top row with logo, navigation, search and date/calendar */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href={logoLink}>
                <img 
                  src={logoUrl} 
                  alt="Logo CJF" 
                  className="h-10 cursor-pointer"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://www.cjf.gob.mx/resources/index/images/logo-cjf.png';
                  }}
                />
              </Link>
              <Navigation />
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 font-medium">
                {new Date().toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
              <SearchBar />
              <button 
                onClick={toggleCalendar}
                className="p-2 rounded-full hover:bg-gray-100"
                aria-label="Calendario"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
          
          {showCalendar && (
            <div className="mt-4">
              <CalendarWidget />
            </div>
          )}
        </div>
      </header>

      <main className="flex-grow">
        {children}
      </main>

      <Footer />
    </div>
  );
}