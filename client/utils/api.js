import axios from 'axios';

// Create an axios instance with default config
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    // You can add auth token here if needed
    // const token = localStorage.getItem('token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle errors globally
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('API Error:', error.response.status, error.response.data);
      
      // Handle specific status codes
      switch (error.response.status) {
        case 401:
          // Handle unauthorized
          console.error('Unauthorized access');
          break;
        case 404:
          // Handle not found
          console.error('Resource not found');
          break;
        case 500:
          // Handle server error
          console.error('Server error');
          break;
        default:
          // Handle other errors
          break;
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Request error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Cache for API responses
const cache = {
  data: new Map(),
  ttl: 5 * 60 * 1000, // 5 minutes in milliseconds
  
  set(key, value) {
    this.data.set(key, {
      value,
      timestamp: Date.now()
    });
  },
  
  get(key) {
    const item = this.data.get(key);
    if (!item) return null;
    
    // Check if the cache item has expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.data.delete(key);
      return null;
    }
    
    return item.value;
  },
  
  clear() {
    this.data.clear();
  },
  
  invalidate(keyPattern) {
    // Remove all cache entries that match the key pattern
    for (const key of this.data.keys()) {
      if (key.includes(keyPattern)) {
        this.data.delete(key);
      }
    }
  }
};

// Helper function to make cached API requests
const cachedRequest = async (requestFn, cacheKey, skipCache = false) => {
  if (!skipCache) {
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }
  }
  
  const response = await requestFn();
  cache.set(cacheKey, response);
  return response;
};

// API methods
export const apiService = {
  // Articles
  getLatestNews: (skipCache = true) =>
    cachedRequest(() => api.get('/latest'), 'latest-news', true), // Always skip cache for latest news
  
  getArticleById: (id, skipCache = false) =>
    cachedRequest(() => api.get(`/articles/${id}`), `article-${id}`, skipCache),
  
  searchArticles: (params) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get('/search', { params });
  },
  
  searchSuggestions: (query) =>
    api.get('/search/suggestions', { params: { q: query } }),
  
  // Sections
  getSectionContent: (sectionId, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return cachedRequest(
      () => api.get(`/sections/${sectionId}`, { params }),
      `section-${sectionId}-${queryString || 'default'}`
    );
  },
  
  getSectionPreview: (sectionId, skipCache = false) =>
    cachedRequest(
      () => api.get(`/sections/${sectionId}/preview`),
      `section-preview-${sectionId}`,
      skipCache
    ),
  
  // Archive
  getArchiveByDate: (date, skipCache = false) =>
    cachedRequest(
      () => api.get(`/archive/${date}`),
      `archive-${date}`,
      skipCache
    ),
  
  getAvailableDates: (skipCache = false) =>
    cachedRequest(
      () => api.get('/archive/dates'),
      'available-dates',
      skipCache
    ),
  
  // Content types
  getContentByType: (type, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return cachedRequest(
      () => api.get(`/content/${type}`, { params }),
      `content-${type}-${queryString || 'default'}`
    );
  },
  
  // Statistics
  getStatistics: () =>
    cachedRequest(
      () => api.get('/statistics'),
      'statistics'
    ),
  
  // Admin endpoints (would be protected)
  createArticle: (articleData) => {
    const response = api.post('/admin/articles', articleData);
    // Invalidate relevant caches
    cache.invalidate('latest-news');
    cache.invalidate(`section-${articleData.sectionId}`);
    cache.invalidate('section-preview');
    return response;
  },
  
  updateArticle: (id, articleData) => {
    const response = api.put(`/admin/articles/${id}`, articleData);
    // Invalidate relevant caches
    cache.invalidate(`article-${id}`);
    cache.invalidate('latest-news');
    cache.invalidate(`section-${articleData.sectionId}`);
    cache.invalidate('section-preview');
    return response;
  },
  
  deleteArticle: (id, sectionId) => {
    const response = api.delete(`/admin/articles/${id}`);
    // Invalidate relevant caches
    cache.invalidate(`article-${id}`);
    cache.invalidate('latest-news');
    cache.invalidate(`section-${sectionId}`);
    cache.invalidate('section-preview');
    return response;
  },
  
  uploadImage: (formData) => api.post('/admin/images/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),
  
  // Cache management
  clearCache: () => cache.clear(),
  invalidateCache: (keyPattern) => cache.invalidate(keyPattern),
  
  // Utility methods
  healthCheck: () => api.get('/health'),
  getServerTime: () => api.get('/server-time')
};

export default apiService;