import React, { useState, useEffect } from 'react';
import { FaSearch, FaFilter, FaDownload, FaSync, FaExclamationTriangle, FaInfoCircle, FaExclamationCircle, FaBug } from 'react-icons/fa';
import { formatDate } from '../../utils/dateUtils';
import { fetchLogs } from '../../utils/adminApi';

/**
 * LogViewer Component
 * 
 * Displays application logs with filtering and search capabilities.
 * Used in the admin section to monitor and troubleshoot the application.
 */
const LogViewer = ({ logs: initialLogs, isLoading: initialLoading, onRefresh, onFilter, filters: initialFilters }) => {
  // State
  const [logs, setLogs] = useState(initialLogs || []);
  const [filteredLogs, setFilteredLogs] = useState(initialLogs || []);
  const [loading, setLoading] = useState(initialLoading !== undefined ? initialLoading : true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState(initialFilters || {
    level: 'all',
    startDate: '',
    endDate: '',
    module: 'all'
  });
  const [modules, setModules] = useState([]);
  const [expandedLogId, setExpandedLogId] = useState(null);

  const ITEMS_PER_PAGE = 50;

  // Update logs when props change
  useEffect(() => {
    if (initialLogs) {
      setLogs(initialLogs);
      setFilteredLogs(initialLogs);
    }
  }, [initialLogs]);

  // Update loading state when props change
  useEffect(() => {
    if (initialLoading !== undefined) {
      setLoading(initialLoading);
    }
  }, [initialLoading]);

  // Load logs on component mount and when filters change (only if no external logs provided)
  useEffect(() => {
    if (!initialLogs) {
      loadLogs();
    }
  }, [page, filters, initialLogs]);

  // Filter logs when search term changes
  useEffect(() => {
    filterLogs();
  }, [searchTerm, logs]);

  /**
   * Load logs from the API
   */
  const loadLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchLogs({
        page,
        limit: ITEMS_PER_PAGE,
        level: filters.level !== 'all' ? filters.level : undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        module: filters.module !== 'all' ? filters.module : undefined
      });

      setLogs(response.logs);
      setFilteredLogs(response.logs);
      setTotalPages(Math.ceil(response.total / ITEMS_PER_PAGE));
      
      // Extract unique modules for filter dropdown
      if (response.modules) {
        setModules(response.modules);
      }
    } catch (err) {
      setError('Failed to load logs. Please try again.');
      console.error('Error loading logs:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Filter logs based on search term
   */
  const filterLogs = () => {
    if (!searchTerm.trim()) {
      setFilteredLogs(logs);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = logs.filter(log => 
      log.message.toLowerCase().includes(term) || 
      (log.details && JSON.stringify(log.details).toLowerCase().includes(term))
    );
    
    setFilteredLogs(filtered);
  };

  /**
   * Handle filter change
   * @param {Object} e - Event object
   */
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setPage(1); // Reset to first page when filters change
  };

  /**
   * Handle search input change
   * @param {Object} e - Event object
   */
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  /**
   * Reset all filters and search
   */
  const handleResetFilters = () => {
    setFilters({
      level: 'all',
      startDate: '',
      endDate: '',
      module: 'all'
    });
    setSearchTerm('');
    setPage(1);
  };

  /**
   * Export logs as JSON file
   */
  const handleExportLogs = () => {
    const dataStr = JSON.stringify(filteredLogs, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportFileDefaultName = `logs-export-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  /**
   * Toggle expanded view for a log
   * @param {number} id - Log ID
   */
  const toggleExpandLog = (id) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  /**
   * Get icon for log level
   * @param {string} level - Log level
   * @returns {JSX.Element} Icon component
   */
  const getLevelIcon = (level) => {
    switch (level.toUpperCase()) {
      case 'ERROR':
        return <FaExclamationTriangle className="text-red-500" />;
      case 'WARN':
        return <FaExclamationCircle className="text-yellow-500" />;
      case 'INFO':
        return <FaInfoCircle className="text-blue-500" />;
      case 'DEBUG':
        return <FaBug className="text-gray-500" />;
      default:
        return <FaInfoCircle className="text-blue-500" />;
    }
  };

  /**
   * Get CSS class for log level
   * @param {string} level - Log level
   * @returns {string} CSS class
   */
  const getLevelClass = (level) => {
    switch (level.toUpperCase()) {
      case 'ERROR':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'WARN':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'INFO':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'DEBUG':
        return 'bg-gray-100 border-gray-300 text-gray-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  /**
   * Format log details for display
   * @param {Object} details - Log details
   * @returns {string} Formatted details
   */
  const formatDetails = (details) => {
    if (!details) return '';
    
    try {
      const detailsObj = typeof details === 'string' ? JSON.parse(details) : details;
      return JSON.stringify(detailsObj, null, 2);
    } catch (err) {
      return String(details);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Application Logs</h2>
      
      {/* Filters and Search */}
      <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          {/* Log Level Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Log Level</label>
            <select
              name="level"
              value={filters.level}
              onChange={handleFilterChange}
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Levels</option>
              <option value="error">Error</option>
              <option value="warn">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
          </div>
          
          {/* Module Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
            <select
              name="module"
              value={filters.module}
              onChange={handleFilterChange}
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Modules</option>
              {modules.map(module => (
                <option key={module} value={module}>{module}</option>
              ))}
            </select>
          </div>
          
          {/* Date Range Filter */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full rounded-md border border-gray-300 shadow-sm pl-10 px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FaFilter className="mr-2" /> Reset
            </button>
            
            <button
              onClick={onRefresh || loadLogs}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FaSync className="mr-2" /> Refresh
            </button>
            
            <button
              onClick={handleExportLogs}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FaDownload className="mr-2" /> Export
            </button>
          </div>
        </div>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-700 rounded-md">
          <p className="flex items-center">
            <FaExclamationTriangle className="mr-2" /> {error}
          </p>
        </div>
      )}
      
      {/* Logs Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No logs found matching your criteria.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Module
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Message
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map(log => {
                const isExpanded = expandedLogId === log.id;
                const moduleMatch = log.message.match(/\[(.*?)\]/);
                const module = moduleMatch ? moduleMatch[1] : 'system';
                const message = moduleMatch ? log.message.replace(/\[.*?\]\s*/, '') : log.message;
                
                return (
                  <React.Fragment key={log.id}>
                    <tr 
                      className={`hover:bg-gray-50 cursor-pointer ${isExpanded ? 'bg-gray-50' : ''}`}
                      onClick={() => toggleExpandLog(log.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getLevelClass(log.level)}`}>
                          {getLevelIcon(log.level)}
                          <span className="ml-1">{log.level.toUpperCase()}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {module}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 truncate max-w-md">
                        {message}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-gray-50">
                        <td colSpan="4" className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            <h4 className="font-medium mb-2">Details:</h4>
                            {log.details ? (
                              <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto text-xs">
                                {formatDetails(log.details)}
                              </pre>
                            ) : (
                              <p className="text-gray-500 italic">No additional details available</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6 mt-4">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                page === 1 ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Previous
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                page === totalPages ? 'bg-gray-100 text-gray-400' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{(page - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(page * ITEMS_PER_PAGE, filteredLogs.length + (page - 1) * ITEMS_PER_PAGE)}
                </span>{' '}
                of <span className="font-medium">{filteredLogs.length + (page - 1) * ITEMS_PER_PAGE}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                    page === 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span className="sr-only">First</span>
                  <span className="text-xs">First</span>
                </button>
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className={`relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium ${
                    page === 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span className="sr-only">Previous</span>
                  <span className="text-xs">Prev</span>
                </button>
                
                {/* Page Numbers */}
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  
                  if (pageNum <= totalPages) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          page === pageNum
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  return null;
                })}
                
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className={`relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium ${
                    page === totalPages ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span className="sr-only">Next</span>
                  <span className="text-xs">Next</span>
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                    page === totalPages ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span className="sr-only">Last</span>
                  <span className="text-xs">Last</span>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogViewer;