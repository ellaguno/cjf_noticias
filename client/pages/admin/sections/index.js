import { useState, useEffect } from 'react';
import { FiEdit, FiTrash2, FiAlertCircle, FiPlus } from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import DataTable from '../../../components/admin/DataTable';
import FormField from '../../../components/admin/FormField';
import { sectionApi } from '../../../utils/adminApi';

export default function SectionsManagement() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editModal, setEditModal] = useState({ show: false, section: null, isNew: false });
  const [deleteModal, setDeleteModal] = useState({ show: false, section: null });
  const [formData, setFormData] = useState({ id: '', name: '', description: '' });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await sectionApi.getSections();
      setSections(data);
    } catch (err) {
      console.error('Error fetching sections:', err);
      setError('Failed to load sections. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (section) => {
    setFormData({
      id: section.id,
      name: section.name,
      description: section.description || ''
    });
    setFormErrors({});
    setEditModal({ show: true, section, isNew: false });
  };

  const handleDelete = (section) => {
    setDeleteModal({ show: true, section });
  };

  const handleNewSection = () => {
    setFormData({ id: '', name: '', description: '' });
    setFormErrors({});
    setEditModal({ show: true, section: null, isNew: true });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field-specific error when user makes changes
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.id && editModal.isNew) {
      errors.id = 'Section ID is required';
    } else if (formData.id && !/^[a-z0-9-]+$/.test(formData.id)) {
      errors.id = 'Section ID can only contain lowercase letters, numbers, and hyphens';
    }
    
    if (!formData.name) {
      errors.name = 'Section name is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveSection = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setSaving(true);
      
      if (editModal.isNew) {
        // Create new section
        // Note: This is a mock implementation since we don't have a create section API
        // In a real app, you would call the API to create the section
        console.log('Creating new section:', formData);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Add to local state
        setSections(prev => [...prev, formData]);
      } else {
        // Update section
        // Note: This is a mock implementation since we don't have an update section API
        // In a real app, you would call the API to update the section
        console.log('Updating section:', formData);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Update local state
        setSections(prev => 
          prev.map(section => 
            section.id === formData.id ? { ...section, ...formData } : section
          )
        );
      }
      
      // Close modal
      setEditModal({ show: false, section: null, isNew: false });
    } catch (err) {
      console.error('Error saving section:', err);
      setError('Failed to save section. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSection = async () => {
    if (!deleteModal.section) return;
    
    try {
      setLoading(true);
      
      // Note: This is a mock implementation since we don't have a delete section API
      // In a real app, you would call the API to delete the section
      console.log('Deleting section:', deleteModal.section);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update local state
      setSections(prev => prev.filter(section => section.id !== deleteModal.section.id));
      
      // Close modal
      setDeleteModal({ show: false, section: null });
    } catch (err) {
      console.error('Error deleting section:', err);
      setError('Failed to delete section. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: 'id',
      header: 'ID',
      render: (section) => (
        <div className="font-mono text-sm text-gray-600">{section.id}</div>
      )
    },
    {
      key: 'name',
      header: 'Name',
      render: (section) => (
        <div className="font-medium text-gray-900">{section.name}</div>
      )
    },
    {
      key: 'description',
      header: 'Description',
      render: (section) => section.description || '-'
    },
    {
      key: 'articleCount',
      header: 'Articles',
      render: (section) => section.articleCount || '0'
    }
  ];

  return (
    <AdminLayout title="Sections Management">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sections</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage content sections and categories
          </p>
        </div>
        <div>
          <button
            onClick={handleNewSection}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <FiPlus className="-ml-1 mr-2 h-5 w-5" />
            Add Section
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

      <DataTable
        data={sections}
        columns={columns}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={loading}
      />

      {/* Edit/Create Section Modal */}
      {editModal.show && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {editModal.isNew ? 'Create New Section' : 'Edit Section'}
                    </h3>
                    <div className="mt-4">
                      {editModal.isNew && (
                        <FormField
                          label="Section ID"
                          name="id"
                          value={formData.id}
                          onChange={handleFormChange}
                          required
                          error={formErrors.id}
                          placeholder="e.g., news, sports, politics"
                          helpText="Unique identifier for the section (lowercase letters, numbers, and hyphens only)"
                        />
                      )}
                      
                      <FormField
                        label="Section Name"
                        name="name"
                        value={formData.name}
                        onChange={handleFormChange}
                        required
                        error={formErrors.name}
                        placeholder="Enter section name"
                      />
                      
                      <FormField
                        label="Description"
                        name="description"
                        type="textarea"
                        value={formData.description}
                        onChange={handleFormChange}
                        error={formErrors.description}
                        placeholder="Enter section description"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm ${
                    saving ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                  onClick={handleSaveSection}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setEditModal({ show: false, section: null, isNew: false })}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <FiTrash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Delete Section
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete the section "{deleteModal.section?.name}"? This action cannot be undone and may affect articles assigned to this section.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={handleDeleteSection}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setDeleteModal({ show: false, section: null })}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}