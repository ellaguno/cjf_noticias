import axios from 'axios';

// Create axios instance with base URL
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  timeout: 60000, // Increased timeout to 60 seconds
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    // Add token to headers if it exists
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add CSRF token if it exists
    const csrfToken = typeof window !== 'undefined' ? localStorage.getItem('csrfToken') : null;
    if (csrfToken && config.method !== 'get') {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      // Clear tokens and redirect to login page
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('csrfToken');
        window.location.replace('/admin/login');
      }
    }
    
    return Promise.reject(error);
  }
);

// Authentication API
export const authApi = {
  login: async (username, password) => {
    console.log('Attempting login with username:', username);
    try {
      const response = await api.post('/admin/login', { username, password });
      console.log('Login response received:', response.status);
      
      // Store tokens in localStorage
      if (response.data.token) {
        console.log('Token received, storing in localStorage');
        localStorage.setItem('token', response.data.token);
      } else {
        console.error('No token received in login response');
      }
      
      if (response.data.csrfToken) {
        console.log('CSRF token received, storing in localStorage');
        localStorage.setItem('csrfToken', response.data.csrfToken);
      }
      
      return response.data;
    } catch (error) {
      console.error('Login request failed:', error);
      if (error.response) {
        console.error('Error response:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }
      throw error;
    }
  },
  
  logout: async () => {
    try {
      await api.post('/admin/logout');
    } finally {
      // Clear tokens regardless of API response
      localStorage.removeItem('token');
      localStorage.removeItem('csrfToken');
    }
  },
  
  getProfile: async () => {
    const response = await api.get('/admin/profile');
    return response.data;
  }
};

// User management API
export const userApi = {
  getUsers: async () => {
    const response = await api.get('/admin/users');
    return response.data;
  },
  
  getUser: async (id) => {
    const response = await api.get(`/admin/users/${id}`);
    return response.data;
  },
  
  createUser: async (userData) => {
    const response = await api.post('/admin/users', userData);
    return response.data;
  },
  
  updateUser: async (id, userData) => {
    const response = await api.put(`/admin/users/${id}`, userData);
    return response.data;
  },
  
  deleteUser: async (id) => {
    const response = await api.delete(`/admin/users/${id}`);
    return response.data;
  }
};

// Article management API
export const articleApi = {
  getArticles: async (params = {}) => {
    const response = await api.get('/admin/articles', { params });
    return response.data;
  },
  
  getArticle: async (id) => {
    const response = await api.get(`/articles/${id}`);
    return response.data;
  },
  
  createArticle: async (articleData) => {
    const response = await api.post('/admin/articles', articleData);
    return response.data;
  },
  
  updateArticle: async (id, articleData) => {
    const response = await api.put(`/admin/articles/${id}`, articleData);
    return response.data;
  },
  
  deleteArticle: async (id) => {
    const response = await api.delete(`/admin/articles/${id}`);
    return response.data;
  }
};

// Section management API
export const sectionApi = {
  getSections: async () => {
    const response = await api.get('/sections');
    return response.data;
  }
};

// Image management API
export const imageApi = {
  uploadImage: async (formData) => {
    const response = await api.post('/admin/images/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },
  
  deleteImage: async (id) => {
    const response = await api.delete(`/admin/images/${id}`);
    return response.data;
  }
};

// Settings API
export const settingsApi = {
  getSettings: async () => {
    const response = await api.get('/admin/settings');
    return response.data;
  },
  
  updateSetting: async (key, value, description) => {
    const response = await api.put(`/admin/settings/${key}`, { value, description });
    return response.data;
  }
};

// Extraction API
export const extractionApi = {
  getStatus: async () => {
    const response = await api.get('/admin/extraction/status');
    return response.data;
  },
  
  getLogs: async () => {
    const response = await api.get('/admin/logs');
    return response.data.logs || response.data;
  },
  
  triggerExtraction: async (date = null) => {
    const response = await api.post('/admin/extraction/run', date ? { date } : {});
    return response.data;
  },
  
  deleteContentByDate: async (date) => {
    const response = await api.delete(`/admin/extraction/content/${date}`);
    return response.data;
  },
  
  getAvailableDates: async () => {
    const response = await api.get('/api/extraction/dates');
    return response.data;
  },
  
  getAvailablePDFs: async () => {
    const response = await api.get('/extraction/available-pdfs');
    return response.data;
  }
};

// Logs API
export const logsApi = {
  fetchLogs: async (params = {}) => {
    const response = await api.get('/admin/logs', { params });
    return response.data;
  },
  
  clearLogs: async (params = {}) => {
    const response = await api.delete('/admin/logs', { params });
    return response.data;
  }
};

// Export the fetchLogs function directly for convenience
export const fetchLogs = logsApi.fetchLogs;

export default api;