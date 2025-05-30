import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ArticleSidebar } from './ArticleSidebar'; // Adjust path if necessary
import { SidebarArticlePopup } from './SidebarArticlePopup'; // Import the actual component

// Mock SidebarArticlePopup
// The first argument to jest.fn() is the mock implementation.
const mockPopupFn = jest.fn(() => <div data-testid="mock-sidebar-popup">Mock Popup</div>);
jest.mock('./SidebarArticlePopup', () => ({
  SidebarArticlePopup: mockPopupFn,
}));


// Interface for test articles, aligning with ArticleSidebar's updated MarkerArticle
interface MarkerArticleForTest {
  idx: string;
  title: string;
  date?: string;
  lien: string;
  cat: string;
  imp: number;
  color: string;
  description?: string; // Added for popup
  imageUrl?: string;    // Added for popup
}

const getExpectedDotColor = (categoryCode: string): string => {
  const upperCategoryCode = categoryCode.toUpperCase();
  switch (upperCategoryCode) {
    case 'TECH': return '#6366F1';
    case 'FIN': return '#22C55E';
    case 'ECONOMIE': return '#5DADE2';
    case 'URGENT': return '#FF0000';
    default: return '#737373';
  }
};

describe('ArticleSidebar Component', () => {
  const mockOnArticleSelect = jest.fn();

  const mockArticles: MarkerArticleForTest[] = [
    { idx: '1', title: 'Tech Article 1', date: '01/01/2024', lien: '#', cat: 'TECH', imp: 0.8, color: '#FF0000', description: 'Desc for Tech 1', imageUrl: 'tech1.jpg' },
    { idx: '2', title: 'Finance Article', date: '02/01/2024', lien: '#', cat: 'FIN', imp: 0.6, color: '#00FF00', description: 'Desc for Fin 2', imageUrl: 'fin2.jpg' },
    { idx: '3', title: 'Urgent News', date: '03/01/2024', lien: '#', cat: 'URGENT', imp: 0.9, color: '#0000FF', description: 'Desc for Urgent 3', imageUrl: 'urgent3.jpg' },
  ];

  beforeEach(() => {
    mockOnArticleSelect.mockClear();
    mockPopupFn.mockClear(); // Clear mock calls for SidebarArticlePopup
    // Mock getBoundingClientRect and offsetTop for popup positioning
    // Note: This is a basic mock. More complex scenarios might need more detailed element hierarchy.
    // We are mocking these on the prototype of HTMLElement.
    // Individual tests can override these if specific values are needed per element.
    Object.defineProperty(HTMLElement.prototype, 'offsetTop', { configurable: true, value: 10 });
    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({
            top: 100, left: 50, width: 200, height: 30, bottom: 130, right: 250, x: 50, y: 100, toJSON: () => {}
        })
    });
  });

  describe('Rendering', () => {
    test('displays "no articles" message when articles array is empty', () => {
      render(<ArticleSidebar articles={[]} onArticleSelect={mockOnArticleSelect} />);
      expect(screen.getByText("Aucun article à afficher pour les filtres actuels.")).toBeInTheDocument();
      expect(document.querySelector('[data-article-idx]')).toBeNull();
      expect(screen.queryByTestId('mock-sidebar-popup')).not.toBeInTheDocument();
    });

    test('renders list of articles correctly', () => {
      render(<ArticleSidebar articles={mockArticles} onArticleSelect={mockOnArticleSelect} />);
      const itemsWithDataAttr = document.querySelectorAll('[data-article-idx]');
      expect(itemsWithDataAttr.length).toBe(mockArticles.length);

      mockArticles.forEach((article, index) => {
        const item = itemsWithDataAttr[index] as HTMLElement;
        expect(item).toBeInTheDocument();
        expect(item.dataset.articleIdx).toBe(article.idx);
        expect(within(item).getByText(article.title)).toBeInTheDocument();
        if (article.date) expect(within(item).getByText(article.date)).toBeInTheDocument();
        const dotElement = item.children[0] as HTMLElement;
        expect(dotElement).toHaveStyle(`background-color: ${getExpectedDotColor(article.cat)}`);
        const titleAttr = item.getAttribute('title');
        expect(titleAttr).toContain(`Date: ${article.date || 'N/A'}`);
        expect(titleAttr).toContain(`Importance: ${article.imp.toFixed(2)}`);
      });
    });
  });

  describe('Callbacks and Internal Hover Popup', () => {
    test('onArticleSelect is called with the article object on click', () => {
      render(<ArticleSidebar articles={mockArticles} onArticleSelect={mockOnArticleSelect} />);
      const firstArticleItem = document.querySelector(`[data-article-idx="${mockArticles[0].idx}"]`);
      fireEvent.click(firstArticleItem!);
      expect(mockOnArticleSelect).toHaveBeenCalledTimes(1);
      expect(mockOnArticleSelect).toHaveBeenCalledWith(mockArticles[0]);
    });

    test('SidebarArticlePopup (mock) is rendered on mouseEnter and passed correct article data', () => {
      render(<ArticleSidebar articles={mockArticles} onArticleSelect={mockOnArticleSelect} />);
      const secondArticleItem = document.querySelector(`[data-article-idx="${mockArticles[1].idx}"]`);

      expect(screen.queryByTestId('mock-sidebar-popup')).not.toBeInTheDocument(); // Initially not visible

      fireEvent.mouseEnter(secondArticleItem!);

      expect(screen.getByTestId('mock-sidebar-popup')).toBeInTheDocument();
      expect(mockPopupFn).toHaveBeenCalledTimes(1);
      // Check the props passed to the *last call* of the mock
      const expectedPopupArticle = {
        title: mockArticles[1].title,
        description: mockArticles[1].description,
        imageUrl: mockArticles[1].imageUrl,
        date: mockArticles[1].date,
      };
      expect(mockPopupFn.mock.calls[0][0].article).toEqual(expectedPopupArticle);
    });

    test('SidebarArticlePopup (mock) is hidden on mouseLeave', () => {
      render(<ArticleSidebar articles={mockArticles} onArticleSelect={mockOnArticleSelect} />);
      const thirdArticleItem = document.querySelector(`[data-article-idx="${mockArticles[2].idx}"]`);

      // Enter to show
      fireEvent.mouseEnter(thirdArticleItem!);
      expect(screen.getByTestId('mock-sidebar-popup')).toBeInTheDocument();
      expect(mockPopupFn).toHaveBeenCalledTimes(1);

      // Leave to hide
      fireEvent.mouseLeave(thirdArticleItem!);
      expect(screen.queryByTestId('mock-sidebar-popup')).not.toBeInTheDocument();
      // mockPopupFn is not called again on leave, it's just not rendered.
      // So, still called once from the mouseEnter.
      expect(mockPopupFn).toHaveBeenCalledTimes(1);
    });

    test('popupStyle is applied (basic check for visibility)', () => {
        render(<ArticleSidebar articles={mockArticles} onArticleSelect={mockOnArticleSelect} />);
        const firstArticleItem = document.querySelector(`[data-article-idx="${mockArticles[0].idx}"]`);

        // Initially, no popup, so no specific style for its wrapper yet (or wrapper not there)
        let popupWrapper = screen.queryByTestId('mock-sidebar-popup')?.parentElement;
        if (popupWrapper) { // If it somehow exists due to fast updates, check initial hidden state
             expect(popupWrapper).toHaveStyle('visibility: hidden');
        }

        fireEvent.mouseEnter(firstArticleItem!);
        popupWrapper = screen.getByTestId('mock-sidebar-popup').parentElement;
        expect(popupWrapper).toBeInTheDocument();
        // Check for visibility and opacity from the style prop
        // The actual style values are complex due to positioning, so check parts
        expect(popupWrapper).toHaveStyle('visibility: visible');
        expect(popupWrapper).toHaveStyle('opacity: 1');
        expect(popupWrapper).toHaveStyle('position: absolute'); // from popupStyle
        expect(popupWrapper).toHaveStyle('right: calc(100% + 10px)');
        // top is based on offsetTop, which is mocked to 10
        expect(popupWrapper).toHaveStyle('top: 10px');


        fireEvent.mouseLeave(firstArticleItem!);
        // After mouse leave, the wrapper might still be in the DOM for a short period due to transitions
        // or it might be removed if hoveredArticle becomes null.
        // The component logic sets hoveredArticle to null, so the popup and its wrapper should not be rendered.
        expect(screen.queryByTestId('mock-sidebar-popup')).not.toBeInTheDocument();
    });
  });
});

// Helper to use `within` queries more easily
const within = (element: HTMLElement) => ({
    getByText: (text: string | RegExp) => screen.getByText(element, text),
});

// Polyfill for Element.children
if (!('children' in Element.prototype)) {
    Object.defineProperty(Element.prototype, 'children', {
        get: function () {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return Array.prototype.filter.call((this as any).childNodes, function (node: Node) {
                return node.nodeType === 1;
            });
        }
    });
}
