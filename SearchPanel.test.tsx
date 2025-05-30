import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { SearchPanel } from './SearchPanel';
import { START_DATE } from './constants'; // Assuming this path is correct relative to SearchPanel.tsx

// Mock the constants dependency if it's complex or to ensure test stability
jest.mock('./constants', () => ({
  START_DATE: new Date('2024-05-01T00:00:00.000Z'), // Provide a fixed date for testing
}));

describe('SearchPanel Component', () => {
  const mockOnSearch = jest.fn();
  const mockOnDateChange = jest.fn();
  const initialDateValue = 15; // Example initial date value

  const defaultProps = {
    onSearch: mockOnSearch,
    onDateChange: mockOnDateChange,
    initialDateValue: initialDateValue,
  };

  beforeEach(() => {
    // Reset mocks before each test
    mockOnSearch.mockClear();
    mockOnDateChange.mockClear();
  });

  test('renders correctly and is initially closed', () => {
    render(<SearchPanel {...defaultProps} />);

    const toggleButton = screen.getByRole('button', { name: /ouvrir la recherche et filtres de date/i });
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

    // Content should not be visible when closed
    expect(screen.queryByPlaceholderText(/rechercher un titre.../i)).not.toBeVisible();
    expect(screen.queryByLabelText(/sélecteur de plage de dates/i)).not.toBeVisible();
  });

  test('opens when the toggle button is clicked and shows content', async () => {
    const user = userEvent.setup();
    render(<SearchPanel {...defaultProps} />);

    const toggleButton = screen.getByRole('button', { name: /ouvrir la recherche et filtres de date/i });
    await user.click(toggleButton);

    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    expect(toggleButton).toHaveAccessibleName(/fermer la recherche/i); // Title changes

    // Use findBy or waitFor for elements that appear asynchronously or after animation
    expect(await screen.findByPlaceholderText(/rechercher un titre.../i)).toBeVisible();
    expect(screen.getByLabelText(/sélecteur de plage de dates/i)).toBeVisible();
  });

  test('closes when the toggle button is clicked again', async () => {
    const user = userEvent.setup();
    render(<SearchPanel {...defaultProps} />);

    const toggleButton = screen.getByRole('button', { name: /ouvrir la recherche et filtres de date/i });

    // Open panel
    await user.click(toggleButton);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByPlaceholderText(/rechercher un titre.../i)).toBeVisible(); // Ensure it's open

    // Close panel
    await user.click(toggleButton);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
    expect(toggleButton).toHaveAccessibleName(/ouvrir la recherche et filtres de date/i);


    // Content should not be visible after closing
    // Need to use queryBy for elements that might not be in the DOM or not visible
    // and waitForElementToBeRemoved or check for .not.toBeVisible()
    // Using .not.toBeVisible() is safer if elements are hidden via CSS rather than removed from DOM
    await waitFor(() => {
        expect(screen.queryByPlaceholderText(/rechercher un titre.../i)).not.toBeVisible();
    });
    await waitFor(() => {
        expect(screen.queryByLabelText(/sélecteur de plage de dates/i)).not.toBeVisible();
    });
  });

  test('onSearch callback is called with correct arguments on form submission', async () => {
    const user = userEvent.setup();
    render(<SearchPanel {...defaultProps} />);
    const searchTerm = 'Test Query';

    const toggleButton = screen.getByRole('button', { name: /ouvrir la recherche et filtres de date/i });
    await user.click(toggleButton); // Open panel

    const searchInput = await screen.findByPlaceholderText(/rechercher un titre.../i);
    await user.type(searchInput, searchTerm);

    const submitButton = screen.getByRole('button', { name: /go/i });
    await user.click(submitButton);

    expect(mockOnSearch).toHaveBeenCalledTimes(1);
    expect(mockOnSearch).toHaveBeenCalledWith(searchTerm, initialDateValue);
  });

  test('onDateChange callback is called when date slider value changes', async () => {
    const user = userEvent.setup();
    render(<SearchPanel {...defaultProps} />);

    const toggleButton = screen.getByRole('button', { name: /ouvrir la recherche et filtres de date/i });
    await user.click(toggleButton); // Open panel

    const dateSlider = await screen.findByLabelText(/sélecteur de plage de dates/i);
    const newDateValue = "10"; // Slider values are strings

    // fireEvent.change is often more straightforward for range inputs
    fireEvent.change(dateSlider, { target: { value: newDateValue } });

    expect(mockOnDateChange).toHaveBeenCalledTimes(1);
    expect(mockOnDateChange).toHaveBeenCalledWith(parseInt(newDateValue, 10));
  });

  test('input field receives focus when panel opens', async () => {
    const user = userEvent.setup();
    render(<SearchPanel {...defaultProps} />);
    const toggleButton = screen.getByRole('button', { name: /ouvrir la recherche et filtres de date/i });
    await user.click(toggleButton); // Open panel

    const searchInput = await screen.findByPlaceholderText(/rechercher un titre.../i);

    // The component has a setTimeout of 180ms before focusing
    await waitFor(() => expect(searchInput).toHaveFocus(), { timeout: 300 });
  });

});
