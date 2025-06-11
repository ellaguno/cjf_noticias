/**
 * ArticleCard Component Tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ArticleCard from '../../components/ArticleCard';

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

describe('ArticleCard Component', () => {
  const mockArticle = {
    id: 1,
    title: 'Test Article Title',
    summary: 'This is a test article summary',
    source: 'Test Source',
    publication_date: '2023-05-01'
  };

  test('renders article title', () => {
    render(<ArticleCard article={mockArticle} />);
    
    const title = screen.getByText(mockArticle.title);
    expect(title).toBeInTheDocument();
  });

  test('renders article summary', () => {
    render(<ArticleCard article={mockArticle} />);
    
    const summary = screen.getByText(mockArticle.summary);
    expect(summary).toBeInTheDocument();
  });

  test('renders article source', () => {
    render(<ArticleCard article={mockArticle} />);
    
    const source = screen.getByText(mockArticle.source);
    expect(source).toBeInTheDocument();
  });

  test('renders article date in formatted form', () => {
    render(<ArticleCard article={mockArticle} />);
    
    // The date should be formatted, so we can't check for the exact string
    // Instead, we'll check that some date is rendered
    const dateElement = screen.getByTestId('article-date');
    expect(dateElement).toBeInTheDocument();
    
    // The formatted date should contain the year 2023
    expect(dateElement.textContent).toContain('2023');
  });

  test('links to the article detail page', () => {
    render(<ArticleCard article={mockArticle} />);
    
    // Find the link
    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', `/article/${mockArticle.id}`);
  });

  test('applies compact style when compact prop is true', () => {
    render(<ArticleCard article={mockArticle} compact={true} />);
    
    // Check if the card has a compact class or style
    const card = screen.getByTestId('article-card');
    expect(card).toHaveClass('compact');
  });

  test('applies regular style when compact prop is false', () => {
    render(<ArticleCard article={mockArticle} compact={false} />);
    
    // Check if the card doesn't have a compact class
    const card = screen.getByTestId('article-card');
    expect(card).not.toHaveClass('compact');
  });
});