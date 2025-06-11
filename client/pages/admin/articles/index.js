import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { FiPlus, FiEdit, FiTrash2, FiAlertCircle, FiFilter, FiSearch, FiX } from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import DataTable from '../../../components/admin/DataTable';
import FormField from '../../../components/admin/FormField';
import { articleApi, sectionApi } from '../../../utils/adminApi';
import { format } from 'date-fns/index.js';

export default function ArticlesManagement() {
  const [articles, setArticles] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ show: false, article: null });
  const [viewModal, setViewModal] = useState({ show: false, article: null });
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    section: '',
    date: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    limit: 10,
    from: 1,
    to: 10
  });
  
  const router = useRouter();

  useEffect(() => {
    fetchSections();
    fetchArticles();
  }, [pagination.currentPage, pagination.limit]);

  const fetchSections = async () => {
    try {
      const data = await sectionApi.getSections();
      setSections(data);
    } catch (err) {
      console.error('Error fetching sections:', err);
    }
  };

  const fetchArticles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        limit: pagination.limit,
        offset: (pagination.currentPage - 1) * pagination.limit,
        section: filters.section || undefined,
        date: filters.date || undefined,
        search: filters.search || undefined
      };
      
      const data = await articleApi.getArticles(params);
      
      setArticles(data.articles);
      setPagination({
        ...pagination,
        total: data.total,
        totalPages: Math.ceil(data.total / pagination.limit),
        from: data.offset + 1,
        to: Math.min(data.offset + data.limit, data.total)
      });
    } catch (err) {
      console.error('Error fetching articles:', err);
      setError('Failed to load articles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setPagination({
      ...pagination,
      currentPage: page
    });
  };

  const handleLimitChange = (e) => {
    const newLimit = parseInt(e.target.value);
    setPagination({
      ...pagination,
      limit: newLimit,
      currentPage: 1
    });
  };

  const handleEdit = (article) => {
    router.push(`/admin/articles/${article.id}`);
  };

  const handleView = (article) => {
    setViewModal({ show: true, article });
  };

  const handleDelete = (article) => {
    setDeleteModal({ show: true, article });
  };

  const confirmDelete = async () => {
    if (!deleteModal.article) return;
    
    try {
      setLoading(true);
      await articleApi.deleteArticle(deleteModal.article.id);
      setArticles(articles.filter(article => article.id !== deleteModal.article.id));
      setDeleteModal({ show: false, article: null });
    } catch (err) {
      console.error('Error deleting article:', err);
      setError(err.response?.data?.error || 'Failed to delete article. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const cancelDelete = () => {
    setDeleteModal({ show: false, article: null });
  };

  const closeViewModal = () => {
    setViewModal({ show: false, article: null });
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value
    });
  };

  const applyFilters = (e) => {
    e.preventDefault();
    setPagination({
      ...pagination,
      currentPage: 1
    });
    fetchArticles();
    setFilterOpen(false);
  };

  const resetFilters = () => {
    setFilters({
      section: '',
      date: '',
      search: ''
    });
    setPagination({
      ...pagination,
      currentPage: 1
    });
    fetchArticles();
    setFilterOpen(false);
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'PPP');
    } catch (error) {
      return dateString;
    }
  };

  const columns = [
    {
      key: 'title',
      header: 'Title',
      render: (article) => (
        <button
          onClick={() => handleView(article)}
          className="font-medium text-gray-900 hover:text-blue-600 text-left cursor-pointer underline-none hover:underline"
        >
          {article.title}
        </button>
      )
    },
    {
      key: 'section_id',
      header: 'Section',
      render: (article) => {
        const section = sections.find(s => s.id === article.section_id);
        return section ? section.name : article.section_id;
      }
    },
    {
      key: 'publication_date',
      header: 'Published',
      render: (article) => formatDate(article.publication_date)
    },
    {
      key: 'source',
      header: 'Source',
      render: (article) => (
        <div className="truncate max-w-xs">{article.source || 'No source'}</div>
      )
    },
    {
      key: 'url',
      header: 'URL',
      render: (article) => (
        article.url || article.source_url ? (
          <a 
            href={article.url || article.source_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline truncate max-w-xs block"
            title={article.url || article.source_url}
          >
            Ver enlace
          </a>
        ) : (
          <span className="text-gray-400">No URL</span>
        )
      )
    }
  ];

  return (
    <AdminLayout title="Articles Management">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Articles</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage articles and content
          </p>
        </div>
        <div className="flex space-x-3 items-center">
          <div className="flex items-center space-x-2">
            <label htmlFor="pageSize" className="text-sm font-medium text-gray-700">
              Mostrar:
            </label>
            <select
              id="pageSize"
              value={pagination.limit}
              onChange={handleLimitChange}
              className="block border-gray-300 rounded-md shadow-sm text-sm focus:ring-primary focus:border-primary"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-gray-500">artículos</span>
          </div>
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <FiFilter className="-ml-1 mr-2 h-5 w-5" />
            Filter
          </button>
          <button
            onClick={() => router.push('/admin/articles/new')}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <FiPlus className="-ml-1 mr-2 h-5 w-5" />
            Add Article
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {filterOpen && (
        <div className="mb-6 bg-white shadow rounded-lg p-4">
          <form onSubmit={applyFilters}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="section" className="block text-sm font-medium text-gray-700">
                  Section
                </label>
                <select
                  id="section"
                  name="section"
                  value={filters.section}
                  onChange={handleFilterChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                >
                  <option value="">All Sections</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                  Publication Date
                </label>
                <input
                  type="date"
                  id="date"
                  name="date"
                  value={filters.date}
                  onChange={handleFilterChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                />
              </div>
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                  Search
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="search"
                    name="search"
                    value={filters.search}
                    onChange={handleFilterChange}
                    className="focus:ring-primary focus:border-primary block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                    placeholder="Search articles..."
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Reset
              </button>
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Apply Filters
              </button>
            </div>
          </form>
        </div>
      )}

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
        data={articles}
        columns={columns}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isLoading={loading}
        pagination={pagination}
        onPageChange={handlePageChange}
      />

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
                      Delete Article
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete the article "{deleteModal.article?.title}"? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={confirmDelete}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={cancelDelete}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Article Modal */}
      {viewModal.show && (
        <div className="fixed z-50 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={closeViewModal}></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              {/* Modal Header */}
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-2">
                      {viewModal.article?.title}
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>
                        <strong>Sección:</strong> {sections.find(s => s.id === viewModal.article?.section_id)?.name || viewModal.article?.section_id}
                      </span>
                      <span>
                        <strong>Fuente:</strong> {viewModal.article?.source}
                      </span>
                      <span>
                        <strong>Fecha:</strong> {formatDate(viewModal.article?.publication_date)}
                      </span>
                    </div>
                    {(viewModal.article?.url || viewModal.article?.source_url) && (
                      <div className="mt-2">
                        <span className="text-sm text-gray-500">
                          <strong>URL:</strong> 
                          <a 
                            href={viewModal.article?.url || viewModal.article?.source_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline ml-1"
                          >
                            {viewModal.article?.url || viewModal.article?.source_url}
                          </a>
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={closeViewModal}
                    className="ml-4 bg-white rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    <span className="sr-only">Cerrar</span>
                    <FiX className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="bg-white px-4 py-5 sm:p-6">
                {/* Images Section */}
                {viewModal.article?.images && viewModal.article.images.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Imágenes:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {viewModal.article.images.map((image, index) => (
                        <div key={index} className="border border-gray-200 rounded-md overflow-hidden">
                          <img
                            src={image.url}
                            alt={`Imagen ${index + 1}`}
                            className="w-full h-48 object-cover cursor-pointer hover:opacity-75"
                            onClick={() => window.open(image.url, '_blank')}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {viewModal.article?.summary && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Resumen:</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                      {viewModal.article.summary}
                    </p>
                  </div>
                )}
                
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Contenido:</h4>
                  <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md p-4">
                    {viewModal.article?.content ? (
                      <div 
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: viewModal.article.content.replace(/\n/g, '<br/>') }}
                      />
                    ) : (
                      <p className="text-gray-500 italic">No hay contenido disponible</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => handleEdit(viewModal.article)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Editar Artículo
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={closeViewModal}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}