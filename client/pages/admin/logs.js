import React, { useState } from 'react';
import Head from 'next/head';
import AdminLayout from '../../components/admin/AdminLayout';
import LogViewer from '../../components/admin/LogViewer';
import { FaChartBar, FaList } from 'react-icons/fa';

/**
 * Admin Logs Page
 * 
 * This page displays application logs and log statistics.
 * It allows administrators to monitor system activity and troubleshoot issues.
 */
const LogsPage = () => {
  const [activeTab, setActiveTab] = useState('logs');

  return (
    <AdminLayout>
      <Head>
        <title>Logs | Admin | CJF Noticias</title>
      </Head>

      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">System Logs</h1>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('logs')}
              className={`${
                activeTab === 'logs'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <FaList className="mr-2" />
              Log Entries
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`${
                activeTab === 'stats'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <FaChartBar className="mr-2" />
              Log Statistics
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'logs' ? (
          <LogViewer />
        ) : (
          <LogStats />
        )}
      </div>
    </AdminLayout>
  );
};

/**
 * Log Statistics Component
 * 
 * Displays statistics and charts about system logs.
 */
const LogStats = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  // Fetch log statistics on component mount
  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/admin/logs/stats', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'X-CSRF-Token': localStorage.getItem('csrfToken')
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch log statistics');
        }
        
        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error('Error fetching log statistics:', err);
        setError('Failed to load log statistics. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Log Level Distribution */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Log Level Distribution</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats.levelStats.map(stat => (
            <div 
              key={stat.level} 
              className={`p-4 rounded-lg ${
                stat.level === 'ERROR' ? 'bg-red-100' :
                stat.level === 'WARN' ? 'bg-yellow-100' :
                stat.level === 'INFO' ? 'bg-blue-100' :
                'bg-gray-100'
              }`}
            >
              <div className="text-sm font-medium text-gray-500">{stat.level}</div>
              <div className="mt-1 text-3xl font-semibold">
                {stat.count}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Log Activity */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Daily Log Activity (Last 30 Days)</h2>
        <div className="h-64">
          {/* This would be a chart in a real implementation */}
          <div className="h-full flex items-center justify-center text-gray-500">
            <p>Chart visualization would be displayed here</p>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Errors</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Warnings</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Info</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.dailyStats.slice(0, 7).map((day, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{day.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{day.count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">{day.errorCount || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">{day.warnCount || 0}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">{day.infoCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Errors */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Most Frequent Errors</h2>
        {stats.topErrors.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error Message</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Count</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.topErrors.map((error, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 text-sm text-gray-900">{error.message}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{error.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            No errors recorded in the system.
          </div>
        )}
      </div>
    </div>
  );
};

// Export the page
export default LogsPage;

// Server-side authentication check
export async function getServerSideProps(context) {
  const { req } = context;
  const token = req.cookies.token;

  if (!token) {
    return {
      redirect: {
        destination: '/admin/login',
        permanent: false,
      },
    };
  }

  return {
    props: {}, // Will be passed to the page component as props
  };
}