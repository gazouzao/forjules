import React from 'react';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { FilterPanel } from './FilterPanel';
// Mock constants directly here for simplicity in this example
// In a real setup, you might use jest.mock('./constants', () => ({...}));

const mockCategoryOrder = ['tech', 'sport', 'world'];
const mockCategoryDetails = {
  'tech': { name: 'Technologie', color: '#48C9B0', emoji: '💡' },
  'sport': { name: 'Sport', color: '#F4D03F', emoji: '⚽️' },
  'world': { name: 'Monde', color: '#AF7AC5', emoji: '🌍' },
  'all': { name: 'Tous', color: '#4A90E2', emoji: '📰' } // For the 'all' button
};
const mockDefaultPinColor = '#4A90E2';

jest.mock('./constants', () => ({
  getCategoryDetails: (key: string) => mockCategoryDetails[key] || mockCategoryDetails['all'],
  CATEGORY_ORDER: mockCategoryOrder,
  DEFAULT_PIN_COLOR: mockDefaultPinColor,
}));

describe('FilterPanel Component', () => {
  const mockOnSelectCategory = jest.fn();
  let scrollWidthSpy: jest.SpyInstance;
  let clientWidthSpy: jest.SpyInstance;
  let scrollLeftSpy: jest.SpyInstance;
  let scrollBySpy: jest.SpyInstance;

  const setupDOMSpies = (element: HTMLElement, { scrollWidth, clientWidth, scrollLeft }: { scrollWidth: number, clientWidth: number, scrollLeft: number }) => {
    scrollWidthSpy = jest.spyOn(element, 'scrollWidth', 'get').mockImplementation(() => scrollWidth);
    clientWidthSpy = jest.spyOn(element, 'clientWidth', 'get').mockImplementation(() => clientWidth);
    scrollLeftSpy = jest.spyOn(element, 'scrollLeft', 'get').mockImplementation(() => scrollLeft);
    scrollBySpy = jest.spyOn(element, 'scrollBy').mockImplementation(() => {}); // Mock scrollBy
  };

  beforeEach(() => {
    mockOnSelectCategory.mockClear();
    // Clear spies if they were set
    scrollWidthSpy?.mockRestore();
    clientWidthSpy?.mockRestore();
    scrollLeftSpy?.mockRestore();
    scrollBySpy?.mockRestore();
  });
  
  const renderPanel = (activeCategory: string = 'all') => {
    return render(
      <FilterPanel
        categories={mockCategoryOrder}
        activeCategory={activeCategory}
        onSelectCategory={mockOnSelectCategory}
      />
    );
  };

  test('renders correctly with initial styling, "Tous" button, and category buttons', () => {
    renderPanel();
    
    const panelContainer = screen.getByRole('tablist').parentElement; // The div wrapping arrows and scrollable area
    const scrollableArea = screen.getByRole('tablist'); // This is the scrollContainerRef div
    expect(scrollableArea).toHaveClass('bg-white/60', 'backdrop-blur-md', 'rounded-full', 'shadow-lg');

    // Check "Tous" button
    const allButton = screen.getByRole('tab', { name: mockCategoryDetails.all.name });
    expect(within(allButton).getByText(mockCategoryDetails.all.emoji)).toBeInTheDocument();
    expect(within(allButton).getByText(mockCategoryDetails.all.name)).toBeInTheDocument();

    // Check dynamic category buttons
    mockCategoryOrder.forEach(key => {
      const catButton = screen.getByRole('tab', { name: mockCategoryDetails[key].name });
      expect(within(catButton).getByText(mockCategoryDetails[key].emoji)).toBeInTheDocument();
      expect(within(catButton).getByText(mockCategoryDetails[key].name)).toBeInTheDocument();
    });
  });

  test('"Tous" button is active by default (activeCategory="all")', () => {
    renderPanel('all');
    const allButton = screen.getByRole('tab', { name: mockCategoryDetails.all.name });
    expect(allButton).toHaveAttribute('aria-selected', 'true');
    // Active style check: has text-white, does not have text-neutral-700
    expect(allButton).toHaveClass('text-white');
    expect(allButton).not.toHaveClass('text-neutral-700');
  });

  test('correct category button is active when activeCategory prop is passed', () => {
    const activeCatKey = 'tech';
    renderPanel(activeCatKey);

    const activeButton = screen.getByRole('tab', { name: mockCategoryDetails[activeCatKey].name });
    expect(activeButton).toHaveAttribute('aria-selected', 'true');
    expect(activeButton).toHaveClass('text-white');
    expect(activeButton).not.toHaveClass('text-neutral-700');

    const allButton = screen.getByRole('tab', { name: mockCategoryDetails.all.name });
    expect(allButton).toHaveAttribute('aria-selected', 'false');
    expect(allButton).toHaveClass('text-neutral-700');
  });

  test('onSelectCategory is called with "all" when "Tous" button is clicked', async () => {
    const user = userEvent.setup();
    renderPanel('tech'); // Start with another category active
    const allButton = screen.getByRole('tab', { name: mockCategoryDetails.all.name });
    await user.click(allButton);
    expect(mockOnSelectCategory).toHaveBeenCalledWith('all');
  });

  test('onSelectCategory is called with category key when a category button is clicked', async () => {
    const user = userEvent.setup();
    const catToClick = 'sport';
    renderPanel('all');
    const sportButton = screen.getByRole('tab', { name: mockCategoryDetails[catToClick].name });
    await user.click(sportButton);
    expect(mockOnSelectCategory).toHaveBeenCalledWith(catToClick);
  });

  describe('Horizontal Scrolling and Arrows', () => {
    test('arrows are hidden if content does not overflow', () => {
      renderPanel();
      const scrollContainer = screen.getByRole('tablist');
      setupDOMSpies(scrollContainer, { scrollWidth: 300, clientWidth: 300, scrollLeft: 0 });
      
      // Trigger scroll handler manually after spies are set
      // In the component, handleScroll is called on mount & resize. Here we force an update.
      // A more robust way would be to simulate the event if possible or directly call a re-render.
      // Forcing a re-render to ensure state updates based on new DOM spies
      renderPanel(); // Re-render might not be ideal, but for JSDOM it can help.
      act(() => { // Ensure state updates from handleScroll are processed
        fireEvent.scroll(scrollContainer); // Trigger scroll event to run handleScroll
      });

      expect(screen.queryByLabelText(/faire défiler vers la gauche/i)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/faire défiler vers la droite/i)).not.toBeInTheDocument();
    });

    test('right arrow is visible if content overflows and not scrolled', () => {
      renderPanel();
      const scrollContainer = screen.getByRole('tablist');
      setupDOMSpies(scrollContainer, { scrollWidth: 500, clientWidth: 300, scrollLeft: 0 });
      act(() => { fireEvent.scroll(scrollContainer); });
      
      expect(screen.queryByLabelText(/faire défiler vers la gauche/i)).not.toBeInTheDocument();
      expect(screen.getByLabelText(/faire défiler vers la droite/i)).toBeInTheDocument();
    });

    test('left arrow is visible if content overflows and scrolled to end', () => {
      renderPanel();
      const scrollContainer = screen.getByRole('tablist');
      setupDOMSpies(scrollContainer, { scrollWidth: 500, clientWidth: 300, scrollLeft: 200 });
       act(() => { fireEvent.scroll(scrollContainer); });

      expect(screen.getByLabelText(/faire défiler vers la gauche/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/faire défiler vers la droite/i)).not.toBeInTheDocument();
    });

    test('both arrows are visible if content overflows and scrolled to a middle position', () => {
      renderPanel();
      const scrollContainer = screen.getByRole('tablist');
      setupDOMSpies(scrollContainer, { scrollWidth: 500, clientWidth: 300, scrollLeft: 100 });
      act(() => { fireEvent.scroll(scrollContainer); });

      expect(screen.getByLabelText(/faire défiler vers la gauche/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/faire défiler vers la droite/i)).toBeInTheDocument();
    });

    test('clicking right arrow calls scrollBy', async () => {
      const user = userEvent.setup();
      renderPanel();
      const scrollContainer = screen.getByRole('tablist');
      // Ensure scrollBy is spied on the specific instance
      scrollBySpy = jest.spyOn(scrollContainer, 'scrollBy'); 
      setupDOMSpies(scrollContainer, { scrollWidth: 500, clientWidth: 300, scrollLeft: 0 });
      act(() => { fireEvent.scroll(scrollContainer); }); // update arrow visibility

      const rightArrow = screen.getByLabelText(/faire défiler vers la droite/i);
      await user.click(rightArrow);
      expect(scrollBySpy).toHaveBeenCalledWith({ left: 300 * 0.8, behavior: 'smooth' });
    });

    test('clicking left arrow calls scrollBy', async () => {
      const user = userEvent.setup();
      renderPanel();
      const scrollContainer = screen.getByRole('tablist');
      scrollBySpy = jest.spyOn(scrollContainer, 'scrollBy');
      setupDOMSpies(scrollContainer, { scrollWidth: 500, clientWidth: 300, scrollLeft: 200 });
      act(() => { fireEvent.scroll(scrollContainer); }); // update arrow visibility

      const leftArrow = screen.getByLabelText(/faire défiler vers la gauche/i);
      await user.click(leftArrow);
      expect(scrollBySpy).toHaveBeenCalledWith({ left: -(300 * 0.8), behavior: 'smooth' });
    });
  });

  test('buttons have role="tab" and correct aria-selected state', () => {
    renderPanel('tech');
    const techButton = screen.getByRole('tab', { name: mockCategoryDetails.tech.name });
    expect(techButton).toHaveAttribute('aria-selected', 'true');

    const sportButton = screen.getByRole('tab', { name: mockCategoryDetails.sport.name });
    expect(sportButton).toHaveAttribute('aria-selected', 'false');
  });
  
  test('buttons have focus styling classes', () => {
    renderPanel();
    const allButton = screen.getByRole('tab', { name: mockCategoryDetails.all.name });
    // Check for one of the focus classes. Exact class might vary based on active state.
    // This checks for the presence of focus:ring-2 and focus:ring-offset-2
    // Tailwind classes are applied based on state, so this is a general check.
    expect(allButton.className).toMatch(/focus:ring-2/);
    expect(allButton.className).toMatch(/focus:ring-offset-2/);

    const techButton = screen.getByRole('tab', { name: mockCategoryDetails.tech.name });
    expect(techButton.className).toMatch(/focus:ring-2/);
    expect(techButton.className).toMatch(/focus:ring-offset-2/);
  });
});

describe('Animated Slider Functionality', () => {
  const SLIDER_PADDING = 6; // As defined in FilterPanel.tsx

  // Helper to mock button dimensions
  const mockButtonDimensions = (buttonElement: HTMLElement, { offsetLeft, offsetWidth }: { offsetLeft: number, offsetWidth: number }) => {
    Object.defineProperty(buttonElement, 'offsetLeft', { configurable: true, value: offsetLeft });
    Object.defineProperty(buttonElement, 'offsetWidth', { configurable: true, value: offsetWidth });
  };

  test('slider div is present', () => {
    renderPanel();
    // The slider is identified by aria-hidden and its distinct transition classes.
    // A more robust way would be a data-testid if many such elements exist.
    const slider = screen.getByRole('tablist').querySelector('div[aria-hidden="true"].transition-\\[left\\,width\\,background-color\\]');
    expect(slider).toBeInTheDocument();
  });

  test('slider is positioned correctly under the initially active "All" button', async () => {
    const { container } = renderPanel('all');
    
    const allButton = screen.getByRole('tab', { name: mockCategoryDetails.all.name });
    mockButtonDimensions(allButton, { offsetLeft: 10, offsetWidth: 100 });

    // Force useEffect to run by re-rendering or a more targeted update if possible
    // In this case, the component updates slider on activeCategory change or allCategories change.
    // Let's trigger a re-render to simulate the effect update cycle.
    // No, the initial render itself should trigger the useEffect.
    // We use `waitFor` to ensure styles are applied after effects.

    const slider = container.querySelector('div[aria-hidden="true"].transition-\\[left\\,width\\,background-color\\]') as HTMLElement;

    await waitFor(() => {
      expect(slider.style.left).toBe(`${10 + SLIDER_PADDING / 2}px`); // 13px
      expect(slider.style.width).toBe(`${100 - SLIDER_PADDING}px`); // 94px
      expect(slider.style.backgroundColor).toBe(mockCategoryDetails.all.color);
    });
  });

  test('slider updates position and color when activeCategory changes', async () => {
    const { rerender, container } = renderPanel('all');
    
    const allButton = screen.getByRole('tab', { name: mockCategoryDetails.all.name });
    mockButtonDimensions(allButton, { offsetLeft: 10, offsetWidth: 100 });
    
    const techButton = screen.getByRole('tab', { name: mockCategoryDetails.tech.name });
    mockButtonDimensions(techButton, { offsetLeft: 120, offsetWidth: 110 });

    // Initial position for "all"
    const slider = container.querySelector('div[aria-hidden="true"].transition-\\[left\\,width\\,background-color\\]') as HTMLElement;
    await waitFor(() => {
      expect(slider.style.left).toBe(`${10 + SLIDER_PADDING / 2}px`);
      expect(slider.style.width).toBe(`${100 - SLIDER_PADDING}px`);
      expect(slider.style.backgroundColor).toBe(mockCategoryDetails.all.color);
    });

    // Change active category to "tech"
    rerender(
      <FilterPanel
        categories={mockCategoryOrder}
        activeCategory="tech"
        onSelectCategory={mockOnSelectCategory}
      />
    );
    
    // Mock dimensions for the new active button ("tech") again after re-render if refs might have changed
    // or ensure the mock persists. Here, re-querying and re-mocking is safer.
    const updatedTechButton = screen.getByRole('tab', { name: mockCategoryDetails.tech.name });
    mockButtonDimensions(updatedTechButton, { offsetLeft: 120, offsetWidth: 110 });


    await waitFor(() => {
      expect(slider.style.left).toBe(`${120 + SLIDER_PADDING / 2}px`); // 123px
      expect(slider.style.width).toBe(`${110 - SLIDER_PADDING}px`); // 104px
      expect(slider.style.backgroundColor).toBe(mockCategoryDetails.tech.color);
    });
  });
});
