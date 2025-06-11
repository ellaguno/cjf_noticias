/**
 * API Utility Tests
 */

import axios from 'axios';
import { fetchLatestNews, fetchArticle, fetchSection, searchArticles } from '../../utils/api';

// Mock axios
jest.mock('axios');

describe('API Utilities', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('fetchLatestNews', () => {
    test('fetches latest news successfully', async () => {
      // Mock data
      const mockData = {
        date: '2023-05-01',
        sections: [
          { id: 'ocho-columnas', name: 'Ocho Columnas', items: [] },
          { id: 'primeras-planas', name: 'Primeras Planas', items: [] }
        ]
      };
      
      // Mock axios.get to return the mock data
      axios.get.mockResolvedValueOnce({ data: mockData });
      
      // Call the function
      const result = await fetchLatestNews();
      
      // Check if axios.get was called with the correct URL
      expect(axios.get).toHaveBeenCalledWith('/api/latest');
      
      // Check if the function returns the correct data
      expect(result).toEqual(mockData);
    });

    test('handles errors when fetching latest news', async () => {
      // Mock axios.get to throw an error
      const error = new Error('Network error');
      axios.get.mockRejectedValueOnce(error);
      
      // Call the function and expect it to throw an error
      await expect(fetchLatestNews()).rejects.toThrow('Network error');
      
      // Check if axios.get was called with the correct URL
      expect(axios.get).toHaveBeenCalledWith('/api/latest');
    });
  });

  describe('fetchArticle', () => {
    test('fetches article by ID successfully', async () => {
      // Mock data
      const mockArticle = {
        id: 1,
        title: 'Test Article',
        content: 'Test content',
        source: 'Test Source',
        publication_date: '2023-05-01'
      };
      
      // Mock axios.get to return the mock data
      axios.get.mockResolvedValueOnce({ data: mockArticle });
      
      // Call the function
      const result = await fetchArticle(1);
      
      // Check if axios.get was called with the correct URL
      expect(axios.get).toHaveBeenCalledWith('/api/articles/1');
      
      // Check if the function returns the correct data
      expect(result).toEqual(mockArticle);
    });

    test('handles errors when fetching article', async () => {
      // Mock axios.get to throw an error
      const error = new Error('Article not found');
      axios.get.mockRejectedValueOnce(error);
      
      // Call the function and expect it to throw an error
      await expect(fetchArticle(999)).rejects.toThrow('Article not found');
      
      // Check if axios.get was called with the correct URL
      expect(axios.get).toHaveBeenCalledWith('/api/articles/999');
    });
  });

  describe('fetchSection', () => {
    test('fetches section content successfully', async () => {
      // Mock data
      const mockSection = {
        section: 'ocho-columnas',
        date: '2023-05-01',
        articles: [
          { id: 1, title: 'Article 1' },
          { id: 2, title: 'Article 2' }
        ]
      };
      
      // Mock axios.get to return the mock data
      axios.get.mockResolvedValueOnce({ data: mockSection });
      
      // Call the function
      const result = await fetchSection('ocho-columnas');
      
      // Check if axios.get was called with the correct URL
      expect(axios.get).toHaveBeenCalledWith('/api/sections/ocho-columnas');
      
      // Check if the function returns the correct data
      expect(result).toEqual(mockSection);
    });

    test('handles errors when fetching section', async () => {
      // Mock axios.get to throw an error
      const error = new Error('Section not found');
      axios.get.mockRejectedValueOnce(error);
      
      // Call the function and expect it to throw an error
      await expect(fetchSection('invalid-section')).rejects.toThrow('Section not found');
      
      // Check if axios.get was called with the correct URL
      expect(axios.get).toHaveBeenCalledWith('/api/sections/invalid-section');
    });
  });

  describe('searchArticles', () => {
    test('searches articles successfully', async () => {
      // Mock data
      const mockResults = {
        query: 'test',
        results: [
          { id: 1, title: 'Test Article 1' },
          { id: 2, title: 'Test Article 2' }
        ]
      };
      
      // Mock axios.get to return the mock data
      axios.get.mockResolvedValueOnce({ data: mockResults });
      
      // Call the function
      const result = await searchArticles('test');
      
      // Check if axios.get was called with the correct URL
      expect(axios.get).toHaveBeenCalledWith('/api/search', {
        params: { q: 'test' }
      });
      
      // Check if the function returns the correct data
      expect(result).toEqual(mockResults);
    });

    test('handles errors when searching articles', async () => {
      // Mock axios.get to throw an error
      const error = new Error('Search failed');
      axios.get.mockRejectedValueOnce(error);
      
      // Call the function and expect it to throw an error
      await expect(searchArticles('test')).rejects.toThrow('Search failed');
      
      // Check if axios.get was called with the correct URL
      expect(axios.get).toHaveBeenCalledWith('/api/search', {
        params: { q: 'test' }
      });
    });

    test('handles empty search query', async () => {
      // Call the function with an empty query
      await expect(searchArticles('')).rejects.toThrow('Search query cannot be empty');
      
      // Check if axios.get was not called
      expect(axios.get).not.toHaveBeenCalled();
    });
  });
});