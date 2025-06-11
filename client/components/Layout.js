import { useState } from 'react';
import Head from 'next/head';
import Navigation from './Navigation';
import SearchBar from './SearchBar';
import Footer from './Footer';
import CalendarWidget from './CalendarWidget';

export default function Layout({ children }) {
  const [showCalendar, setShowCalendar] = useState(false);

  const toggleCalendar = () => {
    setShowCalendar(!showCalendar);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Head>
        <title>Portal de Noticias Judiciales | CJF</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-3">
          {/* Top row with logo, navigation, search and date/calendar */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <img 
                src="/logo-cjf.png" 
                alt="Logo CJF" 
                className="h-10"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://www.cjf.gob.mx/resources/index/images/logo-cjf.png';
                }}
              />
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