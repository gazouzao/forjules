import React, { useRef, useEffect, useState, useCallback } from 'react';
import { getCategoryDetails, DEFAULT_PIN_COLOR, CATEGORY_ORDER, CategoryDetail } from './constants'; // Assuming CATEGORY_ORDER is exported

interface FilterPanelProps {
  categories: string[]; // Array of canonical category keys from CATEGORY_ORDER
  activeCategory: string;
  onSelectCategory: (categoryKey: string) => void;
}

// Placeholder for ChevronLeft and ChevronRight icons (SVG paths would be better)
const ChevronLeftIcon = () => <span className="text-lg">{'<'}</span>;
const ChevronRightIcon = () => <span className="text-lg">{'>'}</span>;

export const FilterPanel: React.FC<FilterPanelProps> = ({ categories: propCategories, activeCategory, onSelectCategory }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeButtonRef, setActiveButtonRef] = useState<HTMLButtonElement | null>(null);

  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  // Memoize categories to include 'all'
  const allCategories = React.useMemo(() => ['all', ...propCategories], [propCategories]);

  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setShowLeftArrow(scrollLeft > 5); // Show if scrolled more than 5px
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 5); // Show if there's more to scroll than 5px
    }
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      handleScroll(); // Initial check
      container.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleScroll); // Re-check on resize
      return () => {
        container.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, [handleScroll]);

  useEffect(() => {
    if (activeButtonRef) {
      activeButtonRef.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeButtonRef, activeCategory]); // Scroll when activeCategory changes and ref is set

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth * 0.8; // Scroll 80% of visible width
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };
  
  const allButtonDetails: CategoryDetail & { key: string } = {
      key: 'all',
      name: 'Tous',
      // Using DEFAULT_PIN_COLOR for 'all' category active state, and a generic emoji
      color: DEFAULT_PIN_COLOR, 
      emoji: '📰',
  };

  return (
    <div 
      className="fixed bottom-[calc(3%+60px)] sm:bottom-[calc(5%+60px)] md:bottom-[3%] left-1/2 -translate-x-1/2 w-auto max-w-[90vw] z-[1000] flex items-center"
      role="tablist"
      aria-label="Filtrer les catégories d'articles"
    >
      {/* Left Arrow */}
      {showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className="absolute -left-1 md:-left-2 top-1/2 -translate-y-1/2 z-10 p-1 bg-white/70 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Faire défiler vers la gauche"
        >
          <ChevronLeftIcon />
        </button>
      )}

      {/* Main Scrollable Panel */}
      <div
        ref={scrollContainerRef}
        className="flex items-center bg-white/60 backdrop-blur-md rounded-full shadow-lg p-1.5 sm:p-2 gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide" // scrollbar-hide needs a plugin or custom CSS
      >
        {[allButtonDetails, ...propCategories.map(catKey => ({ ...getCategoryDetails(catKey), key: catKey }))].map((details, index) => {
          const categoryKey = details.key;
          const isActive = activeCategory === categoryKey;
          const buttonColor = details.color || DEFAULT_PIN_COLOR;

          return (
            <button
              ref={isActive ? setActiveButtonRef : null} // Set ref for the active button
              key={categoryKey}
              onClick={() => onSelectCategory(categoryKey)}
              className={`
                flex items-center justify-center gap-x-1.5 sm:gap-x-2 min-w-max
                py-1.5 sm:py-2 px-3 sm:px-4 rounded-full
                text-sm font-medium
                transition-all ease-out duration-300
                focus:outline-none focus:ring-2 focus:ring-offset-2 
                ${isActive
                  ? 'text-white shadow-md' // Active button text and shadow
                  : `text-neutral-700 hover:bg-gray-300/40 focus:bg-gray-300/40` // Inactive button text and hover/focus
                }
                ${isActive ? '' : 'bg-white/50 hover:scale-105'}
              `}
              style={{
                backgroundColor: isActive ? buttonColor : undefined, // Apply color directly for active
                // For inactive, Tailwind bg-white/50 is used. If specific inactive color needed, it can be added here.
                borderColor: isActive ? buttonColor : 'transparent', // Optional: border for active
                boxShadow: isActive ? `0 4px 14px -2px ${buttonColor}66` : undefined, // Softer shadow based on color
                focusRingColor: buttonColor // Custom property for focus ring, Tailwind doesn't allow dynamic ring colors easily
              }}
              role="tab"
              aria-selected={isActive}
              title={details.name}
            >
              <span className="text-sm sm:text-base" aria-hidden="true">{details.emoji}</span>
              <span className="truncate whitespace-nowrap text-xs sm:text-sm">{details.name}</span>
            </button>
          );
        })}
      </div>

      {/* Right Arrow */}
      {showRightArrow && (
        <button
          onClick={() => scroll('right')}
          className="absolute -right-1 md:-right-2 top-1/2 -translate-y-1/2 z-10 p-1 bg-white/70 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Faire défiler vers la droite"
        >
          <ChevronRightIcon />
        </button>
      )}
    </div>
  );
};

// Helper for custom scrollbar hiding (if not using a plugin)
// Add to your global CSS if needed:
/*
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
*/
