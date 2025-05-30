import React, { useRef, useEffect, useState, useCallback } from 'react';
import { getCategoryDetails, DEFAULT_PIN_COLOR, CategoryDetail } from './constants';

interface FilterPanelProps {
  categories: string[];
  activeCategory: string;
  onSelectCategory: (categoryKey: string) => void;
}

const ChevronLeftIcon = () => <span className="text-lg">{'<'}</span>;
const ChevronRightIcon = () => <span className="text-lg">{'>'}</span>;

export const FilterPanel: React.FC<FilterPanelProps> = ({ categories: propCategories, activeCategory, onSelectCategory }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null); // Ref for the main scrollable area
  const sliderRef = useRef<HTMLDivElement>(null); // Ref for the sliding highlight
  const buttonRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map()); // Refs for all buttons

  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const allCategories = React.useMemo(() => ['all', ...propCategories], [propCategories]);

  // Scroll handler for arrow visibility
  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      const threshold = 5; // Small threshold to prevent flickering
      setShowLeftArrow(scrollLeft > threshold);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - threshold);
    }
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      handleScroll();
      container.addEventListener('scroll', handleScroll, { passive: true });
      window.addEventListener('resize', handleScroll);
      return () => {
        container.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, [handleScroll]);

  // Effect to scroll active button into view
  useEffect(() => {
    const activeButton = buttonRefs.current.get(activeCategory);
    if (activeButton) {
      activeButton.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [activeCategory]);

  // Effect to update slider position and appearance
  useEffect(() => {
    const activeButton = buttonRefs.current.get(activeCategory);
    if (activeButton && scrollContainerRef.current && sliderRef.current) {
      const panelRect = scrollContainerRef.current.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      
      const sliderPadding = 6; // Makes slider slightly smaller than button

      sliderRef.current.style.left = `${activeButton.offsetLeft + sliderPadding / 2}px`;
      sliderRef.current.style.width = `${activeButton.offsetWidth - sliderPadding}px`;
      
      const details = activeCategory === 'all' 
        ? { color: DEFAULT_PIN_COLOR } 
        : getCategoryDetails(activeCategory);
      sliderRef.current.style.backgroundColor = details.color;
    }
  }, [activeCategory, allCategories]); // Rerun when activeCategory or available buttons change

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = scrollContainerRef.current.clientWidth * 0.8;
      scrollContainerRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };
  
  const allButtonDetails: CategoryDetail & { key: string } = {
      key: 'all', name: 'Tous', color: DEFAULT_PIN_COLOR, emoji: '📰',
  };

  return (
    <div 
      className="fixed bottom-[calc(3%+60px)] sm:bottom-[calc(5%+60px)] md:bottom-[3%] left-1/2 -translate-x-1/2 w-auto max-w-[90vw] z-[1000] flex items-center"
      aria-label="Filtrer les catégories d'articles"
    >
      {showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className="absolute -left-1 md:-left-2 top-1/2 -translate-y-1/2 z-20 p-1 bg-white/70 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          aria-label="Faire défiler vers la gauche"
        >
          <ChevronLeftIcon />
        </button>
      )}

      <div
        ref={scrollContainerRef}
        className="relative flex items-center bg-white/60 backdrop-blur-md rounded-full shadow-lg p-1.5 sm:p-2 gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide"
        role="tablist" // role="tablist" should be on the element that contains the tabs
      >
        <div
          ref={sliderRef}
          className="absolute top-1/2 -translate-y-1/2 h-[calc(100%-8px)] rounded-full transition-[left,width,background-color] duration-300 ease-out pointer-events-none -z-[1]"
          aria-hidden="true"
        />
        
        {[allButtonDetails, ...propCategories.map(catKey => ({ ...getCategoryDetails(catKey), key: catKey }))].map((details) => {
          const categoryKey = details.key;
          const isActive = activeCategory === categoryKey;
          
          return (
            <button
              ref={(el) => buttonRefs.current.set(categoryKey, el)}
              key={categoryKey}
              onClick={() => onSelectCategory(categoryKey)}
              className={`
                relative z-10 flex items-center justify-center gap-x-1.5 sm:gap-x-2 min-w-max
                py-1.5 sm:py-2 px-3 sm:px-4 rounded-full 
                text-sm font-medium bg-transparent border-none
                transition-all ease-out duration-300 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                ${isActive ? 'text-white' : 'text-neutral-700 hover:bg-black/10'}
                ${isActive ? '' : 'hover:scale-105'} 
              `}
              // Removed direct background styling, relies on slider now
              // Removed direct box-shadow, could be added to slider or button if needed
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

      {showRightArrow && (
        <button
          onClick={() => scroll('right')}
          className="absolute -right-1 md:-right-2 top-1/2 -translate-y-1/2 z-20 p-1 bg-white/70 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          aria-label="Faire défiler vers la droite"
        >
          <ChevronRightIcon />
        </button>
      )}
    </div>
  );
};
