import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/AdminLayout';
import DataTable from '../../../components/admin/DataTable';
import FormField from '../../../components/admin/FormField';

export default function ExternalSourcesAdmin() {
  const router = useRouter();
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [newSource, setNewSource] = useState({
    name: '',
    base_url: '',
    rss_url: '',
    logo_url: '',
    fetch_frequency: 60
  });

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/external-sources');
      const data = await response.json();
      
      if (data.success) {
        setSources(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error fetching sources: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSource = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/external-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSource)
      });
      
      const data = await response.json();
      if (data.success) {
        setSources([...sources, data.data]);
        setNewSource({ name: '', base_url: '', rss_url: '', logo_url: '', fetch_frequency: 60 });
        setShowAddForm(false);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error adding source: ' + err.message);
    }
  };

  const handleToggleActive = async (id) => {
    try {
      const response = await fetch(`/api/external-sources/${id}/toggle`, {
        method: 'PATCH'
      });
      
      const data = await response.json();
      if (data.success) {
        setSources(sources.map(s => s.id === id ? data.data : s));
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error toggling source: ' + err.message);
    }
  };

  const handleFetchFromSource = async (id) => {
    try {
      setFetching(true);
      const response = await fetch(`/api/external-sources/${id}/fetch`, {
        method: 'POST'
      });
      
      const data = await response.json();
      if (data.success) {
        alert(`${data.message}`);
        fetchSources(); // Refresh to update last_fetch time
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error fetching articles: ' + err.message);
    } finally {
      setFetching(false);
    }
  };

  const handleFetchFromAll = async () => {
    try {
      setFetching(true);
      const response = await fetch('/api/external-sources/fetch', {
        method: 'POST'
      });
      
      const data = await response.json();
      if (data.success) {
        alert(`${data.message}`);
        fetchSources(); // Refresh to update last_fetch times
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error fetching articles: ' + err.message);
    } finally {
      setFetching(false);
    }
  };

  const handleDeleteSource = async (id) => {
    if (!confirm('Are you sure you want to delete this source?')) return;
    
    try {
      const response = await fetch(`/api/external-sources/${id}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      if (data.success) {
        setSources(sources.filter(s => s.id !== id));
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error deleting source: ' + err.message);
    }
  };

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'base_url', header: 'Base URL' },
    { key: 'rss_url', header: 'RSS URL' },
    { 
      key: 'is_active', 
      header: 'Status',
      render: (source) => (
        <span className={`px-2 py-1 rounded text-sm ${source.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {source.is_active ? 'Active' : 'Inactive'}
        </span>
      )
    },
    { 
      key: 'last_fetch', 
      header: 'Last Fetch',
      render: (source) => source.last_fetch ? new Date(source.last_fetch).toLocaleString() : 'Never'
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (source) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleToggleActive(source.id)}
            className={`px-3 py-1 rounded text-sm ${source.is_active ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}
          >
            {source.is_active ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={() => handleFetchFromSource(source.id)}
            disabled={fetching}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm disabled:bg-gray-400"
          >
            Fetch
          </button>
          <button
            onClick={() => router.push(`/admin/external-sources/${source.id}`)}
            className="px-3 py-1 bg-yellow-500 text-white rounded text-sm"
          >
            Edit
          </button>
          <button
            onClick={() => handleDeleteSource(source.id)}
            className="px-3 py-1 bg-red-500 text-white rounded text-sm"
          >
            Delete
          </button>
        </div>
      )
    }
  ];

  if (loading) return <AdminLayout><div>Loading...</div></AdminLayout>;

  return (
    <AdminLayout title="External News Sources">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-x-2">
            <button
              onClick={handleFetchFromAll}
              disabled={fetching}
              className="bg-green-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
            >
              {fetching ? 'Fetching...' : 'Fetch from All Sources'}
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              Add New Source
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {showAddForm && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Add New External Source</h3>
            <form onSubmit={handleAddSource} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  label="Name"
                  name="name"
                  type="text"
                  value={newSource.name}
                  onChange={(e) => setNewSource({...newSource, name: e.target.value})}
                  placeholder="e.g., CNN"
                  required
                />
                <FormField
                  label="Base URL"
                  name="base_url"
                  type="url"
                  value={newSource.base_url}
                  onChange={(e) => setNewSource({...newSource, base_url: e.target.value})}
                  placeholder="https://www.cnn.com"
                  required
                />
                <FormField
                  label="RSS Feed URL"
                  name="rss_url"
                  type="url"
                  value={newSource.rss_url}
                  onChange={(e) => setNewSource({...newSource, rss_url: e.target.value})}
                  placeholder="https://rss.cnn.com/rss/edition.rss"
                />
                <FormField
                  label="Logo URL"
                  name="logo_url"
                  type="url"
                  value={newSource.logo_url}
                  onChange={(e) => setNewSource({...newSource, logo_url: e.target.value})}
                  placeholder="https://example.com/logo.png"
                />
                <FormField
                  label="Fetch Frequency (minutes)"
                  name="fetch_frequency"
                  type="number"
                  value={newSource.fetch_frequency}
                  onChange={(e) => setNewSource({...newSource, fetch_frequency: parseInt(e.target.value)})}
                  min="15"
                  placeholder="60"
                />
              </div>
              <div className="flex space-x-2 pt-4">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add Source
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <DataTable
            data={sources}
            columns={columns}
          />
        </div>
      </div>
    </AdminLayout>
  );
}