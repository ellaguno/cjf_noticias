import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { FiDownload, FiArrowLeft, FiAlertCircle, FiCheckCircle, FiLoader, FiRefreshCw, FiCalendar } from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import { extractionApi } from '../../../utils/adminApi';

export default function TriggerExtraction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [status, setStatus] = useState(null);
  const [statusPolling, setStatusPolling] = useState(false);
  const [lastExtraction, setLastExtraction] = useState(null);
  const [availablePDFs, setAvailablePDFs] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [isReExtraction, setIsReExtraction] = useState(false);
  const router = useRouter();

  // Function to fetch extraction status
  const fetchExtractionStatus = async () => {
    try {
      const statusData = await extractionApi.getStatus();
      if (statusData.lastExtraction) {
        setLastExtraction(statusData.lastExtraction);
        
        // Update UI based on extraction status
        if (statusData.lastExtraction.status === 'in_progress') {
          setStatus('in_progress');
          setSuccess('Extraction is in progress...');
          // Continue polling if extraction is still in progress
          return true;
        } else if (statusData.lastExtraction.status === 'completed') {
          setStatus('completed');
          setSuccess('Extraction completed successfully');
          return false;
        } else if (statusData.lastExtraction.status === 'failed') {
          setStatus('failed');
          setError(`Extraction failed: ${statusData.lastExtraction.error || 'Unknown error'}`);
          return false;
        }
      }
      return false;
    } catch (err) {
      console.error('Error fetching extraction status:', err);
      return false;
    }
  };

  // Start polling for status updates
  const startStatusPolling = () => {
    if (statusPolling) return;
    
    setStatusPolling(true);
    
    const pollInterval = setInterval(async () => {
      const shouldContinue = await fetchExtractionStatus();
      if (!shouldContinue) {
        clearInterval(pollInterval);
        setStatusPolling(false);
      }
    }, 5000); // Poll every 5 seconds
    
    // Clean up interval on component unmount
    return () => {
      clearInterval(pollInterval);
      setStatusPolling(false);
    };
  };

  // Fetch available PDFs for re-extraction
  const fetchAvailablePDFs = async () => {
    try {
      console.log('Fetching available PDFs...');
      
      // Use direct fetch instead of the API utility to bypass authentication
      const response = await fetch('http://localhost:3000/api/extraction/available-pdfs');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const pdfs = await response.json();
      
      console.log('Available PDFs:', pdfs);
      setAvailablePDFs(pdfs);
    } catch (err) {
      console.error('Error fetching available PDFs:', err);
    }
  };

  // Fetch initial status and available PDFs on component mount
  useEffect(() => {
    fetchExtractionStatus();
    fetchAvailablePDFs();
  }, []);

  const handleTriggerExtraction = async (isReExtract = false) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setStatus('starting');
      
      let response;
      
      if (isReExtract && selectedDate) {
        // Use direct fetch for re-extraction
        const fetchResponse = await fetch('/api/extraction/run', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ date: selectedDate }),
        });
        
        if (!fetchResponse.ok) {
          throw new Error(`HTTP error! status: ${fetchResponse.status}`);
        }
        
        response = await fetchResponse.json();
        
        if (response.success) {
          setStatus('completed');
          setSuccess(`Re-extraction for ${selectedDate} started successfully. This process may take several minutes...`);
        } else {
          throw new Error(response.message || 'Unknown error');
        }
      } else {
        response = await extractionApi.triggerExtraction();
        
        if (response.status === 'in_progress') {
          setStatus('in_progress');
          setSuccess('Extraction started successfully. This process may take several minutes...');
          startStatusPolling();
        } else {
          setSuccess('Extraction request submitted successfully');
        }
      }
    } catch (err) {
      console.error('Error triggering extraction:', err);
      setError(err.message || 'Failed to trigger extraction. Please try again.');
      setStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerExternalExtraction = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setStatus('starting');

      const response = await extractionApi.triggerExternalExtraction();

      if (response.success) {
        setStatus('completed');
        setSuccess(response.message);
      } else {
        throw new Error(response.message || 'Unknown error');
      }
    } catch (err) {
      console.error('Error triggering external extraction:', err);
      setError(err.message || 'Failed to trigger external extraction. Please try again.');
      setStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStatus = async () => {
    await fetchExtractionStatus();
    await fetchAvailablePDFs();
  };

  return (
    <AdminLayout title="Trigger Extraction">
      <div className="mb-6">
        <button
          onClick={() => router.push('/admin/extraction')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <FiArrowLeft className="mr-1" /> Back to Extraction Status
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Manual Extraction</h3>
          <p className="mt-1 text-sm text-gray-500">
            Trigger a manual extraction of content from the configured source
          </p>
        </div>

        <div className="px-4 py-5 sm:p-6">
          <div className="text-center">
            <FiDownload className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Trigger Content Extraction</h3>
            <p className="mt-1 text-sm text-gray-500">
              This will manually extract content from the configured PDF source.
              <br />
              The process may take a few minutes to complete.
            </p>
            <div className="mt-6">
              <div className="mb-6 border-b border-gray-200 pb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Re-extract Existing PDF File:</h4>
                <div className="flex items-center">
                  <div className="relative flex-grow mr-3">
                    <select
                      id="date-select"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                      disabled={loading || status === 'in_progress'}
                    >
                      <option value="">Select a PDF file... ({availablePDFs.length} available)</option>
                      {console.log('Rendering availablePDFs:', availablePDFs)}
                      {availablePDFs && availablePDFs.length > 0 ? (
                        availablePDFs.map((date) => (
                          <option key={date} value={date}>
                            {date}
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>No PDF files available</option>
                      )}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <FiCalendar className="h-4 w-4" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTriggerExtraction(true)}
                    disabled={!selectedDate || loading || status === 'in_progress'}
                    className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 ${
                      (!selectedDate || loading || status === 'in_progress') ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    <FiRefreshCw className="-ml-1 mr-2 h-5 w-5" />
                    Re-extract PDF
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  This will re-extract content from an existing PDF file in storage/pdf without downloading a new one.
                  The dropdown shows all available PDF files that can be re-extracted.
                </p>
                <button
                  type="button"
                  onClick={fetchAvailablePDFs}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                >
                  Refresh PDF list
                </button>
              </div>
              
              <div className="mb-6 border-b border-gray-200 pb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Re-extract External News Sources:</h4>
                <button
                  type="button"
                  onClick={handleTriggerExternalExtraction}
                  disabled={loading || status === 'in_progress'}
                  className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 ${
                    (loading || status === 'in_progress') ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  <FiRefreshCw className="-ml-1 mr-2 h-5 w-5" />
                  Re-extract External Sources
                </button>
                <p className="mt-2 text-xs text-gray-500">
                  This will re-fetch and process articles from all active external news sources.
                </p>
              </div>

              <h4 className="text-sm font-medium text-gray-900 mb-2">Download & Extract New PDF:</h4>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => handleTriggerExtraction(false)}
                  disabled={loading || status === 'in_progress'}
                  className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
                    (loading || status === 'in_progress') ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? (
                    <>
                      <FiLoader className="animate-spin -ml-1 mr-2 h-5 w-5" />
                      Starting Extraction...
                    </>
                  ) : status === 'in_progress' ? (
                    <>
                      <FiLoader className="animate-spin -ml-1 mr-2 h-5 w-5" />
                      Extraction in Progress...
                    </>
                  ) : (
                    <>
                      <FiDownload className="-ml-1 mr-2 h-5 w-5" />
                      Download & Extract
                    </>
                  )}
                </button>
                
                {(status === 'in_progress' || status === 'completed' || status === 'failed') && (
                  <button
                    type="button"
                    onClick={handleRefreshStatus}
                    className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    <FiRefreshCw className="-ml-1 mr-2 h-5 w-5" />
                    Refresh Status
                  </button>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-md bg-red-50 p-4">
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

          {success && (
            <div className="mt-6 rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  {status === 'in_progress' ? (
                    <FiLoader className="animate-spin h-5 w-5 text-green-400" />
                  ) : (
                    <FiCheckCircle className="h-5 w-5 text-green-400" />
                  )}
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">{success}</h3>
                  {status === 'in_progress' && (
                    <p className="mt-2 text-sm text-green-700">
                      The extraction process is running in the background. You can check the status here or come back later.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {lastExtraction && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Last Extraction Status:</h4>
              <div className="bg-gray-50 p-4 rounded-md overflow-auto max-h-96">
                <div className="mb-2">
                  <span className="font-medium">Status:</span>{' '}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    lastExtraction.status === 'completed' ? 'bg-green-100 text-green-800' :
                    lastExtraction.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {lastExtraction.status === 'completed' ? 'Completed' :
                     lastExtraction.status === 'in_progress' ? 'In Progress' : 'Failed'}
                  </span>
                </div>
                <div className="mb-2">
                  <span className="font-medium">Timestamp:</span>{' '}
                  {new Date(lastExtraction.timestamp).toLocaleString()}
                </div>
                <div className="mb-2">
                  <span className="font-medium">User:</span>{' '}
                  {lastExtraction.user}
                </div>
                {lastExtraction.error && (
                  <div className="mb-2">
                    <span className="font-medium">Error:</span>{' '}
                    <span className="text-red-600">{lastExtraction.error}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}