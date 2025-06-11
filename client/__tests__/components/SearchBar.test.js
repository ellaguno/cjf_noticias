/**
 * SearchBar Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchBar from '../../components/SearchBar';

// Mock the router
const mockPush = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('SearchBar Component', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  test('renders search input', () => {
    render(<SearchBar />);
    
    const searchInput = screen.getByPlaceholderText(/buscar/i);
    expect(searchInput).toBeInTheDocument();
  });

  test('renders search button', () => {
    render(<SearchBar />);
    
    const searchButton = screen.getByRole('button');
    expect(searchButton).toBeInTheDocument();
  });

  test('updates input value when typing', () => {
    render(<SearchBar />);
    
    const searchInput = screen.getByPlaceholderText(/buscar/i);
    
    // Simulate typing in the search input
    fireEvent.change(searchInput, { target: { value: 'test query' } });
    
    // Check if the input value was updated
    expect(searchInput.value).toBe('test query');
  });

  test('navigates to search page when form is submitted', () => {
    render(<SearchBar />);
    
    const searchInput = screen.getByPlaceholderText(/buscar/i);
    const searchForm = screen.getByRole('form') || searchInput.closest('form');
    
    // Type a search query
    fireEvent.change(searchInput, { target: { value: 'test query' } });
    
    // Submit the form
    fireEvent.submit(searchForm);
    
    // Check if router.push was called with the correct URL
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/search',
      query: { q: 'test query' },
    });
  });

  test('does not navigate when search query is empty', () => {
    render(<SearchBar />);
    
    const searchInput = screen.getByPlaceholderText(/buscar/i);
    const searchForm = screen.getByRole('form') || searchInput.closest('form');
    
    // Submit the form without typing anything
    fireEvent.submit(searchForm);
    
    // Check if router.push was not called
    expect(mockPush).not.toHaveBeenCalled();
  });

  test('navigates when search button is clicked', () => {
    render(<SearchBar />);
    
    const searchInput = screen.getByPlaceholderText(/buscar/i);
    const searchButton = screen.getByRole('button');
    
    // Type a search query
    fireEvent.change(searchInput, { target: { value: 'test query' } });
    
    // Click the search button
    fireEvent.click(searchButton);
    
    // Check if router.push was called with the correct URL
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/search',
      query: { q: 'test query' },
    });
  });

  test('applies custom className when provided', () => {
    render(<SearchBar className="custom-class" />);
    
    const searchContainer = screen.getByTestId('search-container');
    expect(searchContainer).toHaveClass('custom-class');
  });
});