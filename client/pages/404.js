import React from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';
import { FaExclamationTriangle, FaHome, FaSearch } from 'react-icons/fa';

/**
 * 404 Not Found Error Page
 * 
 * This page is displayed when a user tries to access a page that doesn't exist.
 */
export default function NotFoundPage() {
  return (
    <Layout title="Página no encontrada | CJF Noticias">
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center">
        <FaExclamationTriangle className="text-yellow-500 text-6xl mb-6" />
        
        <h1 className="text-4xl font-bold mb-4">404 - Página no encontrada</h1>
        
        <p className="text-xl text-gray-600 mb-8 max-w-lg">
          Lo sentimos, la página que estás buscando no existe o ha sido movida.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Link 
            href="/" 
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <FaHome /> Ir al inicio
          </Link>
          
          <Link 
            href="/search" 
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            <FaSearch /> Buscar contenido
          </Link>
        </div>
      </div>
    </Layout>
  );
}