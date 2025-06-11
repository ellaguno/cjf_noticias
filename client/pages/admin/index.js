import { useState, useEffect } from 'react';
import { FiUsers, FiFileText, FiDownload, FiSettings, FiAlertCircle, FiCheckCircle, FiGlobe } from 'react-icons/fi';
import AdminLayout from '../../components/admin/AdminLayout';
import { StatsCard } from '../../components/admin/Card';
import { articleApi, userApi, extractionApi } from '../../utils/adminApi';
import { format } from 'date-fns/index.js';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    articles: { count: 0, loading: true },
    users: { count: 0, loading: true },
    lastExtraction: { data: null, loading: true },
    recentActivity: { data: [], loading: true }
  });
  const [fetchingExternal, setFetchingExternal] = useState(false);

  useEffect(() => {
    // Fetch dashboard data
    const fetchDashboardData = async () => {
      try {
        // Fetch article stats
        const articlesPromise = articleApi.getArticles({ limit: 1 })
          .then(data => {
            setStats(prev => ({
              ...prev,
              articles: { count: data.total, loading: false }
            }));
          })
          .catch(err => {
            console.error('Error fetching articles:', err);
            setStats(prev => ({
              ...prev,
              articles: { count: 0, loading: false, error: true }
            }));
          });

        // Fetch user stats (admin only)
        const usersPromise = userApi.getUsers()
          .then(data => {
            setStats(prev => ({
              ...prev,
              users: { count: data.length, loading: false }
            }));
          })
          .catch(err => {
            console.error('Error fetching users:', err);
            setStats(prev => ({
              ...prev,
              users: { count: 0, loading: false, error: true }
            }));
          });

        // Fetch extraction status
        const extractionPromise = extractionApi.getStatus()
          .then(data => {
            setStats(prev => ({
              ...prev,
              lastExtraction: { data, loading: false }
            }));
          })
          .catch(err => {
            console.error('Error fetching extraction status:', err);
            setStats(prev => ({
              ...prev,
              lastExtraction: { data: null, loading: false, error: true }
            }));
          });

        // Fetch recent activity logs
        const logsPromise = extractionApi.getLogs()
          .then(data => {
            setStats(prev => ({
              ...prev,
              recentActivity: { data: data.slice(0, 5), loading: false }
            }));
          })
          .catch(err => {
            console.error('Error fetching logs:', err);
            setStats(prev => ({
              ...prev,
              recentActivity: { data: [], loading: false, error: true }
            }));
          });

        // Wait for all promises to resolve
        await Promise.all([articlesPromise, usersPromise, extractionPromise, logsPromise]);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchDashboardData();
  }, []);

  // Format date for display
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'PPP');
    } catch (error) {
      return 'Unknown';
    }
  };

  // Format time for display
  const formatTime = (dateString) => {
    try {
      return format(new Date(dateString), 'p');
    } catch (error) {
      return '';
    }
  };

  // Handle external sources fetch
  const handleFetchExternalSources = async () => {
    try {
      setFetchingExternal(true);
      const response = await fetch('/api/external-sources/fetch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Successfully fetched ${data.data?.length || 0} articles from external sources`);
      } else {
        throw new Error(data.error || 'Failed to fetch external sources');
      }
    } catch (error) {
      console.error('Error fetching external sources:', error);
      alert('Error fetching external sources: ' + error.message);
    } finally {
      setFetchingExternal(false);
    }
  };

  return (
    <AdminLayout title="Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Total Articles"
          value={stats.articles.loading ? '...' : stats.articles.count}
          icon={<FiFileText />}
          color="primary"
          loading={stats.articles.loading}
          link="/admin/articles"
          linkText="Manage Articles"
        />
        
        <StatsCard
          title="Users"
          value={stats.users.loading ? '...' : stats.users.count}
          icon={<FiUsers />}
          color="info"
          loading={stats.users.loading}
          link="/admin/users"
          linkText="Manage Users"
        />
        
        <StatsCard
          title="Last Extraction"
          value={
            stats.lastExtraction.loading
              ? '...'
              : stats.lastExtraction.data?.lastExtraction
                ? formatDate(stats.lastExtraction.data.lastExtraction.timestamp)
                : 'Never'
          }
          description={
            stats.lastExtraction.loading
              ? ''
              : stats.lastExtraction.data?.lastExtraction
                ? formatTime(stats.lastExtraction.data.lastExtraction.timestamp)
                : ''
          }
          icon={<FiDownload />}
          color="success"
          loading={stats.lastExtraction.loading}
          link="/admin/extraction"
          linkText="View Details"
        />
        
        <StatsCard
          title="Next Extraction"
          value={
            stats.lastExtraction.loading
              ? '...'
              : stats.lastExtraction.data?.nextExtraction || 'Not scheduled'
          }
          icon={<FiSettings />}
          color="warning"
          loading={stats.lastExtraction.loading}
          link="/admin/settings"
          linkText="Configure"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          </div>
          
          {stats.recentActivity.loading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ) : stats.recentActivity.data.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No recent activity
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {stats.recentActivity.data.map((log) => (
                <li key={log.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-1">
                      {log.action.includes('ERROR') ? (
                        <FiAlertCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <FiCheckCircle className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {log.action}
                      </div>
                      <div className="mt-1 text-sm text-gray-500 flex justify-between">
                        <span>{log.entity_type}{log.entity_id ? ` #${log.entity_id}` : ''}</span>
                        <span>{formatDate(log.timestamp)} {formatTime(log.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          
          <div className="bg-gray-50 px-4 py-4 sm:px-6 border-t border-gray-200">
            <a
              href="/admin/extraction"
              className="text-sm font-medium text-primary hover:text-primary-dark"
            >
              View all activity
            </a>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <a
                href="/admin/extraction/trigger"
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <FiDownload className="mr-2 h-5 w-5" />
                Trigger Manual Extraction
              </a>
              
              <a
                href="/admin/articles/new"
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <FiFileText className="mr-2 h-5 w-5" />
                Create New Article
              </a>
              
              <a
                href="/admin/users/new"
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <FiUsers className="mr-2 h-5 w-5" />
                Add New User
              </a>
              
              <a
                href="/admin/settings"
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <FiSettings className="mr-2 h-5 w-5" />
                Configure System Settings
              </a>
              
              <button
                onClick={handleFetchExternalSources}
                disabled={fetchingExternal}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiGlobe className={`mr-2 h-5 w-5 ${fetchingExternal ? 'animate-spin' : ''}`} />
                {fetchingExternal ? 'Fetching...' : 'Fetch External Sources'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}