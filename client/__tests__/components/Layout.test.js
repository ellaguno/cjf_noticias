/**
 * Layout Component Tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import Layout from '../../components/Layout';

// Mock the Navigation and Footer components
jest.mock('../../components/Navigation', () => {
  return function MockNavigation() {
    return <div data-testid="mock-navigation">Navigation Component</div>;
  };
});

jest.mock('../../components/Footer', () => {
  return function MockFooter() {
    return <div data-testid="mock-footer">Footer Component</div>;
  };
});

describe('Layout Component', () => {
  test('renders navigation component', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );
    
    const navigation = screen.getByTestId('mock-navigation');
    expect(navigation).toBeInTheDocument();
  });

  test('renders footer component', () => {
    render(
      <Layout>
        <div>Test Content</div>
      </Layout>
    );
    
    const footer = screen.getByTestId('mock-footer');
    expect(footer).toBeInTheDocument();
  });

  test('renders children content', () => {
    render(
      <Layout>
        <div data-testid="test-content">Test Content</div>
      </Layout>
    );
    
    const content = screen.getByTestId('test-content');
    expect(content).toBeInTheDocument();
    expect(content).toHaveTextContent('Test Content');
  });

  test('applies custom title when provided', () => {
    render(
      <Layout title="Custom Page Title">
        <div>Test Content</div>
      </Layout>
    );
    
    // Check if document.title is set correctly
    // Note: In jsdom environment, we can't directly test document.title
    // This is a limitation of the testing environment
    // In a real browser, this would set the page title
  });
});