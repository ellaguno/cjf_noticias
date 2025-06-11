import React from 'react';
import Link from 'next/link';
import Layout from '../components/Layout';
import { FaExclamationCircle, FaHome, FaRedo } from 'react-icons/fa';

/**
 * 500 Server Error Page
 * 
 * This page is displayed when a server error occurs.
 */
export default function ServerErrorPage() {
  return (
    <Layout title="Error del servidor | CJF Noticias">
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 text-center">
        <FaExclamationCircle className="text-red-500 text-6xl mb-6" />
        
        <h1 className="text-4xl font-bold mb-4">500 - Error del servidor</h1>
        
        <p className="text-xl text-gray-600 mb-8 max-w-lg">
          Lo sentimos, ha ocurrido un error en el servidor. Nuestro equipo técnico ha sido notificado y estamos trabajando para resolverlo.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Link 
            href="/" 
            className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <FaHome /> Ir al inicio
          </Link>
          
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          >
            <FaRedo /> Intentar de nuevo
          </button>
        </div>
      </div>
    </Layout>
  );
}