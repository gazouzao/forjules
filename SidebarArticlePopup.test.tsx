import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SidebarArticlePopup } from './SidebarArticlePopup'; // Adjust path if needed

describe('SidebarArticlePopup Component', () => {
  const baseArticle = {
    title: 'Test Article Title',
    description: 'This is a test description for the article.',
    imageUrl: 'https://example.com/test-image.jpg',
    date: '01 Jan 2024',
  };

  test('renders correctly with all props', () => {
    render(<SidebarArticlePopup article={baseArticle} />);

    expect(screen.getByText(baseArticle.title)).toBeInTheDocument();
    expect(screen.getByText(baseArticle.date)).toBeInTheDocument();
    expect(screen.getByText(baseArticle.description)).toBeInTheDocument();

    const image = screen.getByRole('img') as HTMLImageElement;
    expect(image).toBeInTheDocument();
    expect(image.src).toBe(baseArticle.imageUrl);
    expect(image.alt).toBe(`Image for ${baseArticle.title}`);
  });

  test('renders correctly when imageUrl is missing', () => {
    const articleWithoutImage = { ...baseArticle, imageUrl: undefined };
    render(<SidebarArticlePopup article={articleWithoutImage} />);

    expect(screen.getByText('No Image')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  test('renders correctly when description is missing', () => {
    const articleWithoutDescription = { ...baseArticle, description: undefined };
    render(<SidebarArticlePopup article={articleWithoutDescription} />);

    expect(screen.getByText('No description available.')).toBeInTheDocument();
  });

  test('renders correctly when date is missing', () => {
    const articleWithoutDate = { ...baseArticle, date: undefined };
    render(<SidebarArticlePopup article={articleWithoutDate} />);

    // Check that the baseArticle.date is NOT in the document
    // This requires knowing that other text elements won't accidentally contain the date string.
    // A more robust way would be to ensure the <p> for date is not rendered,
    // but queryByText is fine for this distinct string.
    expect(screen.queryByText(baseArticle.date)).not.toBeInTheDocument();

    // Ensure other elements are still there
    expect(screen.getByText(baseArticle.title)).toBeInTheDocument();
  });

  test('renders correctly when all optional props are missing', () => {
    const minimalArticle = { title: 'Minimal Article' };
    render(<SidebarArticlePopup article={minimalArticle} />);

    expect(screen.getByText(minimalArticle.title)).toBeInTheDocument();
    expect(screen.getByText('No Image')).toBeInTheDocument();
    expect(screen.getByText('No description available.')).toBeInTheDocument();
    // No date to check for absence specifically, as it's just not there.
  });

  test('returns null if article prop is not provided (or null/undefined)', () => {
    // @ts-expect-error Testing invalid prop for robustness, though TS would prevent this
    const { container } = render(<SidebarArticlePopup article={null} />);
    expect(container.firstChild).toBeNull();
  });
});
