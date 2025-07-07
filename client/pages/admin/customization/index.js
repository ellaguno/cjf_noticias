import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import AdminLayout from '../../../components/admin/AdminLayout';
import { adminApi } from '../../../utils/adminApi';

export default function CustomizationPage() {
  const router = useRouter();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const customizationSettings = {
    'css_primary_color': {
      label: 'Color Principal de Secciones',
      type: 'color',
      default: '#1a56db',
      description: 'Color de fondo de las etiquetas de secciones verticales'
    },
    'css_logo_url': {
      label: 'URL del Logo',
      type: 'url',
      default: '/images/logo.png',
      description: 'URL de la imagen del logo en el header'
    },
    'css_logo_link': {
      label: 'Enlace del Logo',
      type: 'url',
      default: '/',
      description: 'URL a la que redirige cuando se hace clic en el logo'
    },
    'css_header_bg': {
      label: 'Color de Fondo del Header',
      type: 'color',
      default: '#ffffff',
      description: 'Color de fondo del header principal'
    },
    'css_section_text_color': {
      label: 'Color del Texto de Secciones',
      type: 'color',
      default: '#ffffff',
      description: 'Color del texto en las etiquetas de secciones verticales'
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getSettings();
      const settingsData = {};
      
      // Initialize with defaults
      Object.keys(customizationSettings).forEach(key => {
        settingsData[key] = customizationSettings[key].default;
      });
      
      // Override with saved settings
      response.data.forEach(setting => {
        if (customizationSettings[setting.key]) {
          settingsData[setting.key] = setting.value;
        }
      });
      
      setSettings(settingsData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Error al cargar la configuración');
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setMessage('');

      // Save each setting
      for (const [key, value] of Object.entries(settings)) {
        await adminApi.updateSetting(key, value);
      }

      setMessage('Configuración guardada correctamente');
      
      // Apply CSS changes immediately
      applyCSSChanges();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Error al guardar la configuración');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const applyCSSChanges = () => {
    const root = document.documentElement;
    
    // Apply CSS custom properties
    if (settings.css_primary_color) {
      root.style.setProperty('--primary-color', settings.css_primary_color);
    }
    if (settings.css_section_text_color) {
      root.style.setProperty('--section-text-color', settings.css_section_text_color);
    }
    if (settings.css_header_bg) {
      root.style.setProperty('--header-bg-color', settings.css_header_bg);
    }
    
    // Trigger a custom event for other components to react
    window.dispatchEvent(new CustomEvent('cssSettingsChanged', {
      detail: settings
    }));
  };

  const handleReset = () => {
    const defaultSettings = {};
    Object.keys(customizationSettings).forEach(key => {
      defaultSettings[key] = customizationSettings[key].default;
    });
    setSettings(defaultSettings);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Personalización del Portal</h1>
            <p className="text-gray-600 mt-2">Modifica la apariencia visual del portal de noticias</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Messages */}
            {message && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">{message}</p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L10 10.586l1.293-1.293a1 1 0 001.414 1.414L10 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(customizationSettings).map(([key, config]) => (
                <div key={key} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {config.label}
                  </label>
                  <div className="space-y-1">
                    {config.type === 'color' ? (
                      <div className="flex items-center space-x-3">
                        <input
                          type="color"
                          value={settings[key] || config.default}
                          onChange={(e) => handleChange(key, e.target.value)}
                          className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={settings[key] || config.default}
                          onChange={(e) => handleChange(key, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder={config.default}
                        />
                      </div>
                    ) : (
                      <input
                        type={config.type === 'url' ? 'url' : 'text'}
                        value={settings[key] || config.default}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={config.default}
                      />
                    )}
                    <p className="text-xs text-gray-500">{config.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Preview Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Vista Previa</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-8 h-8 bg-gray-300 rounded" style={{ backgroundColor: settings.css_header_bg }}></div>
                  <span className="text-sm text-gray-600">Header Background</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div 
                    className="w-16 h-12 rounded flex items-center justify-center text-white text-xs font-medium"
                    style={{ 
                      backgroundColor: settings.css_primary_color,
                      color: settings.css_section_text_color 
                    }}
                  >
                    Sección
                  </div>
                  <span className="text-sm text-gray-600">Etiqueta de Sección</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-6 border-t">
              <button
                onClick={handleReset}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Restaurar Valores por Defecto
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}