import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Sidebar from './Sidebar';
import AdminHeader from './AdminHeader';
import { FiMenu } from 'react-icons/fi';

export default function AdminLayout({ children, title = 'Admin Dashboard' }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/admin/profile', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          // Redirect to login page
          router.push('/admin/login');
        }
      } catch (error) {
        console.error('Authentication error:', error);
        router.push('/admin/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to login page
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>{title} | CJF Noticias Admin</title>
      </Head>

      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <div 
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } fixed inset-y-0 left-0 z-30 w-64 bg-primary text-white transition duration-300 transform lg:translate-x-0 lg:static lg:inset-0`}
        >
          <Sidebar />
        </div>

        {/* Main Content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <AdminHeader toggleSidebar={toggleSidebar} />

          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-100">
            <div className="w-full">
              {/* Mobile menu button */}
              <div className="lg:hidden mb-4">
                <button
                  onClick={toggleSidebar}
                  className="p-2 rounded-md text-gray-600 hover:text-gray-900 focus:outline-none"
                >
                  <FiMenu className="h-6 w-6" />
                </button>
              </div>

              {/* Page title - only show if title is provided and different from default */}
              {title && title !== 'Admin Dashboard' && (
                <div className="mb-6">
                  <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                </div>
              )}

              {/* Page content */}
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}