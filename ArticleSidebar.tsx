import React, { useState, useRef } from 'react';
import { SidebarArticlePopup } from './SidebarArticlePopup'; // Import the new popup component

// Updated MarkerArticle interface for ArticleSidebar
interface MarkerArticle {
  idx: string;
  title: string;
  date?: string;
  lien: string;
  cat: string;
  imp: number;
  color: string; // Map pin color, not used for sidebar dot directly but part of the incoming data
  // Add fields that are available from MapApp's MarkerArticle and needed by SidebarArticlePopup
  description?: string;
  imageUrl?: string;
}

interface CategoryUIDetails {
  label: string;
  color: string;
}

const getCategoryUIDetails = (categoryCode: string): CategoryUIDetails => {
  const upperCategoryCode = categoryCode.toUpperCase();
  switch (upperCategoryCode) {
    case 'TECH': return { label: 'Technologie', color: '#6366F1' };
    case 'FIN': return { label: 'Finance', color: '#22C55E' };
    case 'ECO': return { label: 'Économie', color: '#F97316' };
    case 'POL': return { label: 'Politique', color: '#EF4444' };
    case 'SCI': return { label: 'Science', color: '#0EA5E9' };
    case 'FLASH': return { label: 'Flash Info', color: '#FF5733' };
    case 'URGENT': return { label: 'Urgent', color: '#FF0000' };
    case 'INTERNATIONAL': return { label: 'International', color: '#AF7AC5' };
    case 'ECONOMIE': return { label: 'Économie', color: '#5DADE2' };
    case 'TECHNOLOGIE': return { label: 'Technologie', color: '#48C9B0' };
    case 'ENVIRONNEMENT': return { label: 'Environnement', color: '#58D68D' };
    case 'CULTURE': return { label: 'Culture', color: '#F4D03F' };
    case 'AUTRE': return { label: 'Autre', color: '#AAB7B8' };
    default:
      return { label: categoryCode || 'Autre', color: '#737373' };
  }
};

// Updated ArticleSidebarProps: onArticleHover is removed
interface ArticleSidebarProps {
  articles: MarkerArticle[];
  onArticleSelect: (article: MarkerArticle) => void;
}

export const ArticleSidebar: React.FC<ArticleSidebarProps> = ({ articles, onArticleSelect }) => {
  const noArticlesMessage = "Aucun article à afficher pour les filtres actuels.";

  const [hoveredArticle, setHoveredArticle] = useState<MarkerArticle | null>(null);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({ visibility: 'hidden', opacity: 0 });
  const sidebarRef = useRef<HTMLDivElement>(null);

  if (!articles || articles.length === 0) {
    return (
      <div 
        id="articleSidebar"
        ref={sidebarRef} // Added ref
        className="absolute z-[1500] right-[2%] bottom-[3%] w-[310px] max-w-[88vw] max-h-[36vh] 
                   bg-white/90 backdrop-blur-md rounded-[1.5rem] shadow-xl border-4 border-purple-600
                   p-4 text-neutral-500 text-sm custom-scrollbar flex flex-col items-center justify-center
                   font-inter transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/50"
        aria-live="polite"
      >
        {noArticlesMessage}
      </div>
    );
  }

  return (
    <div 
      id="articleSidebar"
      ref={sidebarRef} // Added ref
      className="absolute z-[1500] right-[2%] bottom-[3%] w-[310px] max-w-[88vw] max-h-[36vh] 
                 overflow-y-auto bg-white/90 backdrop-blur-md rounded-[1.5rem] 
                 shadow-xl border-4 border-purple-600
                 text-[0.86rem] py-2 px-1.5 flex flex-col gap-1
                 transition-all duration-300 scrollbar-thin custom-scrollbar font-inter
                 hover:shadow-2xl hover:shadow-purple-500/50"
      aria-label="Liste des articles filtrés"
    >
      {articles.map((article) => {
        const categoryCode = typeof article.cat === 'string' ? article.cat : 'AUTRE';
        const categoryDetails = getCategoryUIDetails(categoryCode);

        return (
          <div
            key={`${article.idx}-${article.title}`}
            data-article-idx={article.idx}
            className={`group rounded-xl transition-all duration-150 
                        px-2.5 py-1.5 mb-1 flex items-start gap-2.5
                        hover:bg-purple-700/90 hover:text-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500
                        cursor-pointer transform hover:scale-[1.01]`}
            title={`Catégorie: ${categoryDetails.label}\nDate: ${article.date || 'N/A'}\nImportance: ${article.imp.toFixed(2)}`}
            onClick={() => onArticleSelect(article)}
            onMouseEnter={(event) => {
              setHoveredArticle(article);
              setHoveredArticle(article);
              const listItemElement = event.currentTarget;
              const sidebarElement = sidebarRef.current;
              if (sidebarElement && listItemElement) {
                const sidebarRect = sidebarElement.getBoundingClientRect();
                const listItemRect = listItemElement.getBoundingClientRect();

                // Calculate position relative to the sidebar's top edge, accounting for scroll
                const popupTop = listItemRect.top - sidebarRect.top;

                setPopupStyle({
                  position: 'absolute',
                  top: `${popupTop}px`,
                  right: 'calc(100% + 10px)', // Position to the left of the sidebar
                  visibility: 'visible',
                  opacity: 1,
                  zIndex: 2000, // High z-index
                  // Ensure smooth transition for opacity, visibility handled by direct set
                  transition: 'opacity 0.2s ease-in-out',
                });
              }
            }}
            onMouseLeave={() => {
              setHoveredArticle(null);
              // Delay hiding to allow fade-out, then set visibility to hidden
              setPopupStyle(prev => ({ ...prev, opacity: 0, transition: 'opacity 0.2s ease-in-out, visibility 0s linear 0.2s' }));
              // Set visibility to hidden after transition.
              // setTimeout(() => {
              //  if (!hoveredArticle) setPopupStyle(prev => ({...prev, visibility: 'hidden'}));
              // }, 200);
              // The above setTimeout logic is tricky with React state.
              // A simpler approach for onMouseLeave is to just set opacity to 0 and rely on CSS for transition.
              // The visibility can be controlled by whether hoveredArticle is null or not for rendering the popup.
              // Let's refine onMouseLeave to:
              // setPopupStyle(prev => ({ ...prev, opacity: 0 }));
              // And then the visibility will be handled by the conditional rendering: {hoveredArticle && ...}
              // However, the current popupStyle state also controls visibility.
              // Let's stick to a simpler mouseLeave for now, then refine if transition is problematic.
              // The original onMouseLeave was:
              // setPopupStyle({ visibility: 'hidden', opacity: 0, transition: 'visibility 0s linear 300ms, opacity 300ms ease-in-out' });
              // This is fine, it hides after opacity transition. Let's ensure the opacity transition duration matches.
              setPopupStyle({ visibility: 'hidden', opacity: 0, transition: 'opacity 0.2s ease-in-out, visibility 0s linear 0.2s' });
            }}
          >
            <span 
              style={{ backgroundColor: categoryDetails.color }}
              className="mt-1 w-3.5 h-3.5 rounded-full border-[2.2px] border-white shadow-md shrink-0"
              aria-hidden="true"
            ></span>
            <div className="flex-grow overflow-hidden">
              <h3 className="font-semibold text-sm truncate text-neutral-800 group-hover:text-purple-50">
                {article.title}
              </h3>
              <p className="text-xs text-neutral-600 group-hover:text-purple-200">
                {article.date || 'Date N/A'}
              </p>
            </div>
          </div>
        );
      })}
      {hoveredArticle && (
        <div style={popupStyle} className="transition-opacity duration-200 ease-in-out"> {/* Apply opacity transition to wrapper */}
          <SidebarArticlePopup article={{
            title: hoveredArticle.title,
            description: hoveredArticle.description,
            imageUrl: hoveredArticle.imageUrl,
            date: hoveredArticle.date,
          }} />
        </div>
      )}
    </div>
  );
};
