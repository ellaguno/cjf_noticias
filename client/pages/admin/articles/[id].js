import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { FiSave, FiArrowLeft, FiAlertCircle, FiImage } from 'react-icons/fi';
import AdminLayout from '../../../components/admin/AdminLayout';
import FormField from '../../../components/admin/FormField';
import { articleApi, sectionApi, imageApi } from '../../../utils/adminApi';

export default function ArticleForm() {
  const router = useRouter();
  const { id } = router.query;
  const isNewArticle = id === 'new';
  
  const [article, setArticle] = useState({
    title: '',
    content: '',
    summary: '',
    source: '',
    url: '',
    source_url: '',
    section_id: '',
    publication_date: new Date().toISOString().split('T')[0]
  });
  
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(!isNewArticle);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    fetchSections();
    
    if (!isNewArticle && id) {
      fetchArticle();
    }
  }, [id, isNewArticle]);

  useEffect(() => {
    if (article && article.image_url) {
      setImagePreview(article.image_url);
    }
  }, [article]);

  const fetchSections = async () => {
    try {
      const data = await sectionApi.getSections();
      setSections(data);
    } catch (err) {
      console.error('Error fetching sections:', err);
      setError('Failed to load sections. Please try again.');
    }
  };

  const fetchArticle = async () => {
    try {
      setLoading(true);
      const data = await articleApi.getArticle(id);
      setArticle(data);
    } catch (err) {
      console.error('Error fetching article:', err);
      setError('Failed to load article data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setArticle(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear field-specific error when user makes changes
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Preview image
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
    
    setImageFile(file);
  };

  const uploadImage = async () => {
    if (!imageFile) return null;
    
    try {
      setUploadingImage(true);
      
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('title', article.title);
      formData.append('section_id', article.section_id);
      formData.append('publication_date', article.publication_date);
      
      if (!isNewArticle) {
        formData.append('article_id', id);
      }
      
      const response = await imageApi.uploadImage(formData);
      return response;
    } catch (err) {
      console.error('Error uploading image:', err);
      throw new Error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!article.title) {
      newErrors.title = 'Title is required';
    }
    
    if (!article.section_id) {
      newErrors.section_id = 'Section is required';
    }
    
    if (!article.publication_date) {
      newErrors.publication_date = 'Publication date is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      let savedArticle;
      
      if (isNewArticle) {
        savedArticle = await articleApi.createArticle(article);
        
        // If there's an image to upload, attach it to the new article
        if (imageFile) {
          try {
            const imageData = await uploadImage();
            console.log('Image uploaded:', imageData);
          } catch (imageError) {
            console.error('Error uploading image:', imageError);
            // Continue even if image upload fails
          }
        }
        
        setSuccess('Article created successfully');
        
        // Redirect to edit page
        router.push(`/admin/articles/${savedArticle.id}`);
      } else {
        savedArticle = await articleApi.updateArticle(id, article);
        
        // If there's an image to upload, attach it to the article
        if (imageFile) {
          try {
            const imageData = await uploadImage();
            console.log('Image uploaded:', imageData);
            // Refresh article data to show the new image
            await fetchArticle();
            setImageFile(null);
            setImagePreview(null);
          } catch (imageError) {
            console.error('Error uploading image:', imageError);
            // Continue even if image upload fails
          }
        }
        
        setSuccess('Article updated successfully');
      }
    } catch (err) {
      console.error('Error saving article:', err);
      setError(err.response?.data?.error || 'Failed to save article. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title={isNewArticle ? 'Create Article' : 'Edit Article'}>
      <div className="mb-6">
        <button
          onClick={() => router.push('/admin/articles')}
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <FiArrowLeft className="mr-1" /> Back to Articles
        </button>
      </div>

      {loading ? (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-40 bg-gray-200 rounded"></div>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {isNewArticle ? 'Create New Article' : `Edit Article: ${article.title}`}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {isNewArticle
                ? 'Create a new article with content and metadata'
                : 'Update article content and metadata'}
            </p>
          </div>

          {error && (
            <div className="px-4 py-3 sm:px-6 bg-red-50">
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
            <div className="px-4 py-3 sm:px-6 bg-green-50">
              <div className="flex">
                <div className="flex-shrink-0">
                  <FiAlertCircle className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">{success}</h3>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FormField
                  label="Title"
                  name="title"
                  value={article.title}
                  onChange={handleChange}
                  required
                  error={errors.title}
                  placeholder="Enter article title"
                />
              </div>

              <FormField
                label="Section"
                name="section_id"
                type="select"
                value={article.section_id}
                onChange={handleChange}
                required
                error={errors.section_id}
                options={sections.map(section => ({
                  value: section.id,
                  label: section.name
                }))}
                placeholder="Select a section"
              />

              <FormField
                label="Publication Date"
                name="publication_date"
                type="date"
                value={article.publication_date}
                onChange={handleChange}
                required
                error={errors.publication_date}
              />

              <div className="sm:col-span-2">
                <FormField
                  label="Summary"
                  name="summary"
                  type="textarea"
                  value={article.summary}
                  onChange={handleChange}
                  error={errors.summary}
                  placeholder="Enter a brief summary of the article"
                  rows={3}
                />
              </div>

              <div className="sm:col-span-2">
                <FormField
                  label="Content"
                  name="content"
                  type="textarea"
                  value={article.content}
                  onChange={handleChange}
                  error={errors.content}
                  placeholder="Enter article content"
                  rows={10}
                />
              </div>

              <FormField
                label="Source"
                name="source"
                value={article.source}
                onChange={handleChange}
                error={errors.source}
                placeholder="Enter content source"
              />

              <FormField
                label="URL (PDF/Document)"
                name="url"
                value={article.url || ''}
                onChange={handleChange}
                error={errors.url}
                placeholder="Enter PDF or document URL"
              />

              <FormField
                label="Source URL (External)"
                name="source_url"
                value={article.source_url || ''}
                onChange={handleChange}
                error={errors.source_url}
                placeholder="Enter external source URL"
              />

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Featured Image
                </label>
                
                {/* Show existing images */}
                {article.images && article.images.length > 0 && !imagePreview && (
                  <div className="mt-2 mb-4">
                    <p className="text-sm text-gray-600 mb-2">Current images:</p>
                    <div className="flex space-x-3">
                      {article.images.map((image, index) => (
                        <div key={image.id || index} className="relative">
                          <img
                            src={image.url || `/storage/uploads/${image.filename}`}
                            alt={image.title || `Image ${index + 1}`}
                            className="h-20 w-auto object-cover rounded-md border"
                          />
                          <p className="text-xs text-gray-500 mt-1 text-center">{image.title || 'No title'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="mt-1 flex items-center">
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-32 w-auto object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full p-1"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 w-48 bg-gray-100 rounded-md border-2 border-dashed border-gray-300">
                      <div className="text-center">
                        <FiImage className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="mt-1 text-xs text-gray-500">Upload new image</p>
                      </div>
                    </div>
                  )}
                  <div className="ml-4">
                    <div className="relative">
                      <input
                        id="image-upload"
                        name="image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="sr-only"
                      />
                      <label
                        htmlFor="image-upload"
                        className="cursor-pointer inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                      >
                        {imagePreview ? 'Change Image' : 'Upload Image'}
                      </label>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      JPG, PNG or GIF up to 10MB
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => router.push('/admin/articles')}
                className="mr-3 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || uploadingImage}
                className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
                  (saving || uploadingImage) ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {(saving || uploadingImage) ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {uploadingImage ? 'Uploading...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <FiSave className="-ml-1 mr-2 h-5 w-5" />
                    Save
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </AdminLayout>
  );
}