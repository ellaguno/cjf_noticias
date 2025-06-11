import { useState } from 'react';
import { FiTrash2, FiAlertTriangle, FiCalendar, FiCheck } from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import { extractionApi } from '../../../utils/adminApi';
import { format } from 'date-fns/index.js';

export default function DeleteContent() {
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    setShowConfirmation(false);
    setResult(null);
    setError(null);
  };

  const handleShowConfirmation = () => {
    if (!selectedDate) {
      setError('Please select a date first');
      return;
    }
    setError(null);
    setShowConfirmation(true);
  };

  const handleCancelDelete = () => {
    setShowConfirmation(false);
  };

  const handleDelete = async () => {
    if (!selectedDate) {
      setError('Please select a date first');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);
      
      // Call the API to delete content for the selected date
      const response = await extractionApi.deleteContentByDate(selectedDate);
      
      setResult({
        success: true,
        message: 'Content deleted successfully',
        details: response
      });
      
      setShowConfirmation(false);
    } catch (err) {
      console.error('Error deleting content:', err);
      setError(err.response?.data?.error || 'Failed to delete content. Please try again.');
      setResult({
        success: false,
        message: 'Failed to delete content'
      });
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'PPP');
    } catch (error) {
      return dateString;
    }
  };

  return (
    <AdminLayout title="Delete Content">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Delete Content</h1>
        <p className="mt-1 text-sm text-gray-500">
          Delete news articles and images for a specific date
        </p>
      </div>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="mb-6">
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
            Select Date
          </label>
          <div className="flex items-center">
            <div className="relative rounded-md shadow-sm flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiCalendar className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="date"
                id="date"
                name="date"
                value={selectedDate}
                onChange={handleDateChange}
                className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                disabled={loading}
              />
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            All news articles and images for this date will be permanently deleted.
          </p>
        </div>

        {!showConfirmation && (
          <div className="flex justify-end">
            <button
              onClick={handleShowConfirmation}
              disabled={loading || !selectedDate}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              <FiTrash2 className="-ml-1 mr-2 h-5 w-5" />
              Delete Content
            </button>
          </div>
        )}

        {showConfirmation && (
          <div className="border border-red-200 bg-red-50 rounded-md p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiAlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Confirm Deletion</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    Are you sure you want to delete all content for <strong>{formatDate(selectedDate)}</strong>?
                  </p>
                  <p className="mt-1">
                    This action cannot be undone. All news articles and images for this date will be permanently deleted.
                  </p>
                </div>
                <div className="mt-4 flex space-x-4">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={loading}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    {loading ? 'Deleting...' : 'Yes, Delete Everything'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelDelete}
                    disabled={loading}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 border border-red-200 bg-red-50 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiAlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {result && result.success && (
          <div className="mt-4 border border-green-200 bg-green-50 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <FiCheck className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Success</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>{result.message}</p>
                  {result.details && (
                    <div className="mt-2">
                      <p>Deleted {result.details.articlesDeleted} articles and {result.details.imagesDeleted} images.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}