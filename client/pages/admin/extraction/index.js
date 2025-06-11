import { useState, useEffect } from 'react';
import { FiRefreshCw, FiDownload, FiAlertCircle, FiTrash2 } from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import LogViewer from '../../../components/admin/LogViewer';
import { StatsCard } from '../../../components/admin/Card';
import { extractionApi } from '../../../utils/adminApi';
import { format } from 'date-fns/index.js';

export default function ExtractionStatus() {
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    action: '',
    entity_type: 'extraction',
    date: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch extraction status
      const statusData = await extractionApi.getStatus();
      setStatus(statusData);
      
      // Fetch logs
      await fetchLogs();
    } catch (err) {
      console.error('Error fetching extraction data:', err);
      setError('Failed to load extraction data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      const logsData = await extractionApi.getLogs();
      setLogs(logsData);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchData();
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    // In a real app, you would apply these filters to the API call
    // For now, we'll just simulate filtering on the client side
    fetchLogs();
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    try {
      return format(new Date(dateString), 'PPP');
    } catch (error) {
      return dateString;
    }
  };

  // Format time for display
  const formatTime = (dateString) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'p');
    } catch (error) {
      return '';
    }
  };

  // Get status color based on extraction success
  const getStatusColor = () => {
    if (!status || !status.lastExtraction) return 'light';
    return status.lastExtraction.success ? 'success' : 'danger';
  };

  // Get status text based on extraction success
  const getStatusText = () => {
    if (!status || !status.lastExtraction) return 'No extraction data';
    return status.lastExtraction.success ? 'Success' : 'Failed';
  };

  return (
    <AdminLayout title="Extraction Status">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Extraction</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor extraction status and view logs
          </p>
        </div>
        <div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <FiRefreshCw className={`-ml-1 mr-2 h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <FiAlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard
          title="Last Extraction"
          value={status ? formatDate(status.lastExtraction?.timestamp) : '...'}
          description={status ? formatTime(status.lastExtraction?.timestamp) : ''}
          icon={<FiDownload />}
          color={getStatusColor()}
          loading={loading}
        />
        
        <StatsCard
          title="Status"
          value={getStatusText()}
          description={status?.lastExtraction?.error || ''}
          color={getStatusColor()}
          loading={loading}
        />
        
        <StatsCard
          title="Next Scheduled"
          value={status ? status.nextExtraction || 'Not scheduled' : '...'}
          icon={<FiRefreshCw />}
          color="light"
          loading={loading}
          link="/admin/settings"
          linkText="Configure Schedule"
        />
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Extraction Logs</h2>
        
        <LogViewer
          logs={logs}
          isLoading={logsLoading}
          onRefresh={fetchLogs}
          onFilter={handleFilterChange}
          filters={filters}
        />
      </div>

      <div className="mt-8 flex justify-center space-x-4">
        <a
          href="/admin/extraction/trigger"
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <FiDownload className="-ml-1 mr-2 h-5 w-5" />
          Trigger Manual Extraction
        </a>
        <a
          href="/admin/extraction/delete"
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <FiTrash2 className="-ml-1 mr-2 h-5 w-5" />
          Delete Content
        </a>
      </div>
    </AdminLayout>
  );
}