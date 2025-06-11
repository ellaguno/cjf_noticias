/**
 * Navigation Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Navigation from '../../components/Navigation';

// Mock the SearchBar component
jest.mock('../../components/SearchBar', () => {
  return function MockSearchBar() {
    return <div data-testid="mock-search-bar">Search Bar Component</div>;
  };
});

// Mock next/link
jest.mock('next/link', () => {
  return ({ children, href }) => {
    return (
      <a href={href} onClick={(e) => e.preventDefault()}>
        {children}
      </a>
    );
  };
});

describe('Navigation Component', () => {
  test('renders the logo', () => {
    render(<Navigation />);
    
    const logo = screen.getByAltText(/CJF Noticias/i);
    expect(logo).toBeInTheDocument();
  });

  test('renders navigation links', () => {
    render(<Navigation />);
    
    // Check for home link
    const homeLink = screen.getByText(/Inicio/i);
    expect(homeLink).toBeInTheDocument();
    
    // Check for sections link if it exists
    const sectionsLink = screen.queryByText(/Secciones/i);
    if (sectionsLink) {
      expect(sectionsLink).toBeInTheDocument();
    }
    
    // Check for archive link
    const archiveLink = screen.getByText(/Archivo/i);
    expect(archiveLink).toBeInTheDocument();
  });

  test('renders search bar component', () => {
    render(<Navigation />);
    
    const searchBar = screen.getByTestId('mock-search-bar');
    expect(searchBar).toBeInTheDocument();
  });

  test('toggles mobile menu when hamburger button is clicked', () => {
    render(<Navigation />);
    
    // Find the hamburger button
    const hamburgerButton = screen.getByLabelText(/toggle menu/i) || 
                           screen.getByRole('button', { name: /toggle menu/i }) ||
                           screen.getByTestId('hamburger-button');
    
    // Mobile menu should be hidden initially
    const mobileMenu = screen.getByTestId('mobile-menu');
    expect(mobileMenu).toHaveClass('hidden');
    
    // Click the hamburger button
    fireEvent.click(hamburgerButton);
    
    // Mobile menu should be visible
    expect(mobileMenu).not.toHaveClass('hidden');
    
    // Click again to hide
    fireEvent.click(hamburgerButton);
    
    // Mobile menu should be hidden again
    expect(mobileMenu).toHaveClass('hidden');
  });
});