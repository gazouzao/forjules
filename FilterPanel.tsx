
import React, { useRef, useEffect, useState }  from 'react';
import { getCategoryDetails, DEFAULT_PIN_COLOR } from '../constants';

interface FilterPanelProps {
  categories: string[]; // Array of canonical category keys
  activeCategory: string;
  onSelectCategory: (categoryKey: string) => void;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ categories, activeCategory, onSelectCategory }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [buttonRefs, setButtonRefs] = useState<React.RefObject<HTMLButtonElement>[]>([]);

  useEffect(() => {
    setButtonRefs(elRefs => (
      Array(categories.length + 1).fill(null).map((_, i) => elRefs[i] || React.createRef())
    ));
  }, [categories]);

  useEffect(() => {
    const activeButtonRef = activeCategory === 'all' 
      ? buttonRefs[0] 
      : buttonRefs[categories.indexOf(activeCategory) + 1];

    if (activeButtonRef?.current && panelRef.current && sliderRef.current) {
      const panelRect = panelRef.current.getBoundingClientRect();
      const buttonRect = activeButtonRef.current.getBoundingClientRect();
      
      const sliderPadding = 6; 

      sliderRef.current.style.left = `${buttonRect.left - panelRect.left + sliderPadding / 2}px`;
      sliderRef.current.style.width = `${buttonRect.width - sliderPadding}px`;
      
      const details = activeCategory === 'all' ? null : getCategoryDetails(activeCategory);
      sliderRef.current.style.backgroundColor = details ? details.color : DEFAULT_PIN_COLOR;

      // Smooth scroll into view if not fully visible
      const panelScrollLeft = panelRef.current.scrollLeft;
      const panelWidth = panelRect.width;
      const buttonLeftRelativeToPanel = buttonRect.left - panelRect.left + panelScrollLeft;
      
      if (buttonLeftRelativeToPanel < panelScrollLeft || (buttonLeftRelativeToPanel + buttonRect.width) > (panelScrollLeft + panelWidth)) {
        activeButtonRef.current.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, categories, buttonRefs]); // panelRef and sliderRef are stable

  const baseButtonClasses = "relative z-[1] bg-transparent border-none flex items-center font-medium text-[0.91em] md:text-[0.84em] py-1 px-3 md:py-[0.19rem] md:px-[0.69rem] rounded-full cursor-pointer transition-all duration-300 ease-in-out min-w-[68px] gap-1 whitespace-nowrap text-ellipsis overflow-visible focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400";
  const inactiveButtonClasses = "text-neutral-700 hover:bg-neutral-500/10 hover:text-neutral-900";
  const activeButtonClasses = "text-white font-semibold";

  return (
    <div 
      ref={panelRef}
      className="absolute bottom-[calc(3%+60px)] sm:bottom-[calc(5%+60px)] md:bottom-[3%] left-1/2 -translate-x-1/2 flex items-center bg-white/80 backdrop-blur-sm rounded-full shadow-lg p-1 sm:p-[0.15rem_1.2rem] gap-0.5 sm:gap-1 min-h-[38px] md:min-h-[30px] max-w-[95vw] overflow-x-auto whitespace-nowrap scrollbar-thin custom-scrollbar"
      style={{ zIndex: 1000 }}
      role="tablist"
      aria-label="Filtrer les catégories d'articles"
    >
      <div 
        ref={sliderRef}
        className="absolute top-1/2 -translate-y-1/2 h-[calc(100%-0.5rem)] rounded-full transition-[left,width,background-color] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-none -z-[1]"
        aria-hidden="true"
      />
      
      <button
        ref={buttonRefs[0]}
        key="all-btn"
        onClick={() => onSelectCategory('all')}
        className={`${baseButtonClasses} ${activeCategory === 'all' ? activeButtonClasses : inactiveButtonClasses}`}
        title="Afficher toutes les catégories"
        role="tab"
        aria-selected={activeCategory === 'all'}
      >
        <span className="text-[1.06em] mr-1 align-middle shrink-0" style={{ color: activeCategory === 'all' ? 'white' : DEFAULT_PIN_COLOR }} aria-hidden="true">📰</span>
        Tous
      </button>

      {categories.map((catKey, index) => {
        const details = getCategoryDetails(catKey);
        const isActive = activeCategory === catKey;
        return (
          <button
            ref={buttonRefs[index + 1]}
            key={catKey}
            onClick={() => onSelectCategory(catKey)}
            className={`${baseButtonClasses} ${isActive ? activeButtonClasses : inactiveButtonClasses}`}
            title={details.label}
            role="tab"
            aria-selected={isActive}
          >
            <span 
              className="text-[1.06em] mr-1 align-middle shrink-0" 
              style={{ filter: isActive ? 'saturate(1.5) brightness(1.1)' : 'none' }}
              aria-hidden="true"
            >
              {details.emoji}
            </span>
            {details.label}
          </button>
        );
      })}
    </div>
  );
};
