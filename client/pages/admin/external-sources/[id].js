import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/AdminLayout';
import FormField from '../../../components/admin/FormField';

export default function EditExternalSource() {
  const router = useRouter();
  const { id } = router.query;
  const [source, setSource] = useState({
    name: '',
    base_url: '',
    rss_url: '',
    logo_url: '',
    api_key: '',
    is_active: 1,
    fetch_frequency: 60
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      fetchSource();
    }
  }, [id]);

  const fetchSource = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/external-sources/${id}`);
      const data = await response.json();
      
      if (data.success) {
        setSource(data.data);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error fetching source: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const response = await fetch(`/api/external-sources/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(source)
      });
      
      const data = await response.json();
      if (data.success) {
        router.push('/admin/external-sources');
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Error saving source: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTestFetch = async () => {
    try {
      const response = await fetch(`/api/external-sources/${id}/fetch`, {
        method: 'POST'
      });
      
      const data = await response.json();
      if (data.success) {
        alert(`Test successful: ${data.message}`);
      } else {
        alert(`Test failed: ${data.error}`);
      }
    } catch (err) {
      alert(`Test failed: ${err.message}`);
    }
  };

  if (loading) return <AdminLayout><div>Loading...</div></AdminLayout>;

  return (
    <AdminLayout title="Edit External Source">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <button
            onClick={() => router.push('/admin/external-sources')}
            className="bg-gray-600 text-white px-4 py-2 rounded"
          >
            Back to Sources
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <FormField
                label="Name"
                name="name"
                type="text"
                value={source.name}
                onChange={(e) => setSource({...source, name: e.target.value})}
                required
              />
              <FormField
                label="Base URL"
                name="base_url"
                type="url"
                value={source.base_url}
                onChange={(e) => setSource({...source, base_url: e.target.value})}
                required
              />
              <FormField
                label="RSS Feed URL"
                name="rss_url"
                type="url"
                value={source.rss_url || ''}
                onChange={(e) => setSource({...source, rss_url: e.target.value})}
                placeholder="Optional - URL to RSS feed"
              />
              <FormField
                label="Logo URL"
                name="logo_url"
                type="url"
                value={source.logo_url || ''}
                onChange={(e) => setSource({...source, logo_url: e.target.value})}
                placeholder="Optional - URL to source logo"
              />
              <FormField
                label="API Key"
                name="api_key"
                type="password"
                value={source.api_key || ''}
                onChange={(e) => setSource({...source, api_key: e.target.value})}
                placeholder="Optional - API key if required"
              />
              <FormField
                label="Fetch Frequency (minutes)"
                name="fetch_frequency"
                type="number"
                value={source.fetch_frequency}
                onChange={(e) => setSource({...source, fetch_frequency: parseInt(e.target.value)})}
                min="15"
                max="1440"
              />
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={source.is_active}
                  onChange={(e) => setSource({...source, is_active: e.target.checked ? 1 : 0})}
                  className="mr-2"
                />
                Active
              </label>
            </div>

            {source.logo_url && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo Preview
                </label>
                <img 
                  src={source.logo_url} 
                  alt="Source logo" 
                  className="h-16 w-auto border rounded"
                  onError={(e) => e.target.style.display = 'none'}
                />
              </div>
            )}

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">Last Fetch Information</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Last Fetch:</strong> {source.last_fetch ? new Date(source.last_fetch).toLocaleString() : 'Never'}
                </div>
                <div>
                  <strong>Created:</strong> {new Date(source.created_at).toLocaleString()}
                </div>
                <div>
                  <strong>Updated:</strong> {new Date(source.updated_at).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex space-x-4 pt-4 border-t">
              <button
                type="submit"
                disabled={saving}
                className="bg-blue-600 text-white px-6 py-2 rounded disabled:bg-gray-400"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={handleTestFetch}
                className="bg-green-600 text-white px-6 py-2 rounded"
              >
                Test Fetch
              </button>
              <button
                type="button"
                onClick={() => router.push('/admin/external-sources')}
                className="bg-gray-600 text-white px-6 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}