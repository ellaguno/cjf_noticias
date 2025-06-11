import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function ExtractionTest() {
  const [availablePDFs, setAvailablePDFs] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  // Fetch available PDFs for re-extraction
  const fetchAvailablePDFs = async () => {
    try {
      console.log('Fetching available PDFs...');
      
      // Use direct fetch to bypass authentication
      const response = await fetch('/api/extraction/available-pdfs');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const pdfs = await response.json();
      
      console.log('Available PDFs:', pdfs);
      setAvailablePDFs(pdfs);
      setMessage(`Successfully loaded ${pdfs.length} PDF files.`);
    } catch (err) {
      console.error('Error fetching available PDFs:', err);
      setError(`Error fetching PDFs: ${err.message}`);
    }
  };

  // Handle re-extraction
  const handleReExtraction = async () => {
    console.log('handleReExtraction called, selectedDate:', selectedDate);
    
    if (!selectedDate) {
      console.log('No date selected, showing error');
      setError('Please select a PDF file first');
      return;
    }

    try {
      console.log('Starting re-extraction process for date:', selectedDate);
      setLoading(true);
      setError(null);
      setMessage(null);
      setStatus('starting');
      
      console.log('Triggering re-extraction for date:', selectedDate);
      setMessage(`Starting re-extraction for ${selectedDate}...`);
      
      // Use direct fetch for re-extraction
      try {
        console.log('Sending fetch request to API...');
        
        // Log the request details for debugging
        const requestBody = JSON.stringify({ date: selectedDate });
        console.log('Request body:', requestBody);
        
        const fetchResponse = await fetch('/api/extraction/run', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: requestBody,
        });
        
        console.log('Re-extraction response status:', fetchResponse.status);
        
        if (!fetchResponse.ok) {
          const errorText = await fetchResponse.text();
          console.error('Error response text:', errorText);
          setStatus('error');
          setMessage(`Error: HTTP status ${fetchResponse.status} - ${errorText}`);
          throw new Error(`HTTP error! status: ${fetchResponse.status}, message: ${errorText}`);
        }
        
        try {
          const responseText = await fetchResponse.text();
          console.log('Raw response text:', responseText);
          
          let response;
          try {
            response = JSON.parse(responseText);
          } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
            throw new Error(`Invalid JSON response: ${responseText}`);
          }
          
          console.log('Re-extraction response:', response);
          
          if (response.success) {
            setStatus('success');
            setMessage(`Re-extraction for ${selectedDate} completed successfully.`);
          } else {
            throw new Error(response.message || 'Unknown error');
          }
        } catch (jsonError) {
          console.error('Error parsing JSON response:', jsonError);
          setStatus('error');
          setMessage(`Error parsing response: ${jsonError.message}`);
        }
      } catch (fetchError) {
        console.error('Fetch error:', fetchError);
        setStatus('error');
        setMessage(`Error: ${fetchError.message}`);
        // Don't rethrow the error, just display it to the user
      }
    } catch (err) {
      console.error('Error triggering re-extraction:', err);
      setError(err.message || 'Failed to trigger re-extraction. Please try again.');
      setStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  // Fetch PDFs on page load
  useEffect(() => {
    fetchAvailablePDFs();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <Head>
        <title>PDF Re-extraction Test</title>
      </Head>

      <h1 className="text-2xl font-bold mb-6">PDF Re-extraction Test</h1>
      
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Available PDF Files</h2>
        
        <div className="mb-4">
          <label htmlFor="pdf-select" className="block text-sm font-medium text-gray-700 mb-1">
            Select a PDF file to re-extract:
          </label>
          <select
            id="pdf-select"
            value={selectedDate}
            onChange={(e) => {
              console.log('Selected date changed to:', e.target.value);
              setSelectedDate(e.target.value);
            }}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            disabled={loading}
          >
            <option value="">Select a PDF file... ({availablePDFs.length} available)</option>
            {availablePDFs.map((date) => (
              <option key={date} value={date}>
                {date}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex space-x-4">
          <button
            type="button"
            onClick={() => {
              console.log('Re-extract button clicked');
              console.log('Selected date:', selectedDate);
              console.log('Loading state:', loading);
              
              // Direct fetch call instead of using handleReExtraction
              (async () => {
                try {
                  console.log('Starting direct re-extraction for date:', selectedDate);
                  setLoading(true);
                  setError(null);
                  setMessage(null);
                  setStatus('starting');
                  
                  console.log('Sending direct fetch request to API...');
                  const requestBody = JSON.stringify({ date: selectedDate });
                  console.log('Request body:', requestBody);
                  
                  try {
                    console.log('Attempting fetch to /api/extraction/run');
                    const fetchResponse = await fetch('/api/extraction/run', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: requestBody,
                    });
                    
                    console.log('Re-extraction response status:', fetchResponse.status);
                    
                    if (!fetchResponse.ok) {
                      const errorText = await fetchResponse.text();
                      console.error('Error response text:', errorText);
                      setStatus('error');
                      setMessage(`Error: HTTP status ${fetchResponse.status} - ${errorText}`);
                    } else {
                      const responseText = await fetchResponse.text();
                      console.log('Raw response text:', responseText);
                      
                      try {
                        const response = JSON.parse(responseText);
                        console.log('Re-extraction response:', response);
                        
                        if (response.success) {
                          setStatus('success');
                          setMessage(`Re-extraction for ${selectedDate} completed successfully.`);
                        } else {
                          throw new Error(response.message || 'Unknown error');
                        }
                      } catch (jsonError) {
                        console.error('Error parsing JSON response:', jsonError);
                        setStatus('error');
                        setMessage(`Error parsing response: ${jsonError.message}`);
                      }
                    }
                  } catch (fetchError) {
                    console.error('Fetch error details:', fetchError);
                    setStatus('error');
                    setMessage(`Network error: ${fetchError.message}`);
                  }
                } catch (error) {
                  console.error('Overall error:', error);
                  setStatus('error');
                  setMessage(`Error: ${error.message}`);
                } finally {
                  setLoading(false);
                }
              })();
            }}
            disabled={!selectedDate || loading}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              (!selectedDate || loading) ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Processing...' : 'Re-extract PDF'}
          </button>
          
          <button
            type="button"
            onClick={fetchAvailablePDFs}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Refresh PDF List
          </button>
        </div>
      </div>
      
      {message && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{message}</p>
            </div>
          </div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
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
      )}
      
      <div className="mt-8 text-sm text-gray-500">
        <p>This page directly accesses the API endpoint without authentication for testing purposes.</p>
        <p>The dropdown shows all available PDF files from the storage/pdf directory.</p>
      </div>
    </div>
  );
}