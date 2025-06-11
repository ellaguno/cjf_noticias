import React from 'react';
import Head from 'next/head';
import { FaTools, FaClock } from 'react-icons/fa';

/**
 * Maintenance Mode Page
 * 
 * This page is displayed when the site is in maintenance mode.
 * It's a standalone page without the regular Layout to ensure it's displayed
 * even if there are issues with other components.
 */
export default function MaintenancePage() {
  return (
    <>
      <Head>
        <title>En mantenimiento | CJF Noticias</title>
        <meta name="description" content="El portal de noticias se encuentra en mantenimiento" />
        <meta name="robots" content="noindex" />
      </Head>
      
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-lg w-full text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-100 p-3 rounded-full">
              <FaTools className="text-blue-600 text-4xl" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-800 mb-4">
            Sitio en mantenimiento
          </h1>
          
          <p className="text-gray-600 mb-6">
            Estamos realizando mejoras en el Portal de Noticias Judiciales del CJF.
            Por favor, vuelva a intentarlo más tarde.
          </p>
          
          <div className="flex items-center justify-center text-gray-500 mb-4">
            <FaClock className="mr-2" />
            <span>Volveremos pronto</span>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Para más información, contacte al administrador del sistema.
            </p>
            <p className="text-sm text-gray-500 mt-1">
              © {new Date().getFullYear()} Consejo de la Judicatura Federal
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Server-side function to check if maintenance mode is enabled
 */
export async function getServerSideProps(context) {
  // In a real implementation, this would check the database or environment
  // to determine if maintenance mode is enabled
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true';
  
  // If not in maintenance mode, redirect to home page
  if (!isMaintenanceMode) {
    return {
      redirect: {
        destination: '/',
        permanent: false,
      },
    };
  }
  
  return {
    props: {}, // Will be passed to the page component as props
  };
}