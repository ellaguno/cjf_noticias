import { useState, useEffect } from 'react';
import { FiSave, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import FormField from '../../../components/admin/FormField';
import { settingsApi } from '../../../utils/adminApi';

export default function SettingsPage() {
  const [settings, setSettings] = useState([]);
  const [formValues, setFormValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editingKey, setEditingKey] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await settingsApi.getSettings();
      setSettings(data);
      
      // Initialize form values
      const initialValues = {};
      data.forEach(setting => {
        initialValues[setting.key] = setting.value;
      });
      setFormValues(initialValues);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to load settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async (key) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const setting = settings.find(s => s.key === key);
      if (!setting) return;
      
      await settingsApi.updateSetting(key, formValues[key], setting.description);
      
      setSuccess(`Setting "${key}" updated successfully`);
      setEditingKey(null);
      
      // Refresh settings
      await fetchSettings();
    } catch (err) {
      console.error('Error saving setting:', err);
      setError(err.response?.data?.error || 'Failed to save setting. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (key) => {
    setEditingKey(key);
    setSuccess(null);
    setError(null);
  };

  const cancelEditing = () => {
    setEditingKey(null);
    
    // Reset form value to original
    const setting = settings.find(s => s.key === editingKey);
    if (setting) {
      setFormValues(prev => ({
        ...prev,
        [editingKey]: setting.value
      }));
    }
  };

  // Group settings by category (based on key prefix)
  const groupSettings = () => {
    const groups = {
      extraction: [],
      system: [],
      other: []
    };
    
    settings.forEach(setting => {
      if (setting.key.startsWith('extraction_')) {
        groups.extraction.push(setting);
      } else if (setting.key.startsWith('system_')) {
        groups.system.push(setting);
      } else {
        groups.other.push(setting);
      }
    });
    
    return groups;
  };

  // Render a setting based on its type
  const renderSetting = (setting) => {
    const isEditing = editingKey === setting.key;
    
    // Determine input type based on value and key
    let inputType = 'text';
    if (setting.key.includes('time')) {
      inputType = 'time';
    } else if (setting.key.includes('date')) {
      inputType = 'date';
    } else if (setting.key.includes('url')) {
      inputType = 'url';
    } else if (setting.value === 'true' || setting.value === 'false') {
      inputType = 'select';
    } else if (!isNaN(setting.value) && !setting.value.includes('.')) {
      inputType = 'number';
    }
    
    return (
      <div key={setting.key} className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
        <dt className="text-sm font-medium text-gray-500">
          {setting.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          {setting.description && (
            <p className="mt-1 text-xs text-gray-400">{setting.description}</p>
          )}
        </dt>
        <dd className="mt-1 flex text-sm text-gray-900 sm:mt-0 sm:col-span-2">
          {isEditing ? (
            <div className="flex-grow">
              {inputType === 'select' && setting.value === 'true' || setting.value === 'false' ? (
                <FormField
                  name={setting.key}
                  type="select"
                  value={formValues[setting.key]}
                  onChange={handleChange}
                  options={[
                    { value: 'true', label: 'Enabled' },
                    { value: 'false', label: 'Disabled' }
                  ]}
                />
              ) : (
                <FormField
                  name={setting.key}
                  type={inputType}
                  value={formValues[setting.key]}
                  onChange={handleChange}
                  placeholder={`Enter ${setting.key}`}
                />
              )}
              
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="mr-2 inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(setting.key)}
                  disabled={saving}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <span className="flex-grow">
                {setting.value === 'true' ? 'Enabled' : 
                 setting.value === 'false' ? 'Disabled' : 
                 setting.value}
              </span>
              <span className="ml-4 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => startEditing(setting.key)}
                  className="bg-white rounded-md font-medium text-primary hover:text-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Edit
                </button>
              </span>
            </>
          )}
        </dd>
      </div>
    );
  };

  const groups = groupSettings();

  return (
    <AdminLayout title="System Settings">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure system settings and parameters
        </p>
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

      {success && (
        <div className="mb-6 rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <FiCheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">{success}</h3>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Extraction Settings */}
          {groups.extraction.length > 0 && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Extraction Settings</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Configure content extraction parameters
                </p>
              </div>
              <div className="border-t border-gray-200">
                <dl className="divide-y divide-gray-200">
                  {groups.extraction.map(renderSetting)}
                </dl>
              </div>
            </div>
          )}

          {/* System Settings */}
          {groups.system.length > 0 && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">System Settings</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Configure general system parameters
                </p>
              </div>
              <div className="border-t border-gray-200">
                <dl className="divide-y divide-gray-200">
                  {groups.system.map(renderSetting)}
                </dl>
              </div>
            </div>
          )}

          {/* Other Settings */}
          {groups.other.length > 0 && (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Other Settings</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Miscellaneous configuration options
                </p>
              </div>
              <div className="border-t border-gray-200">
                <dl className="divide-y divide-gray-200">
                  {groups.other.map(renderSetting)}
                </dl>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}