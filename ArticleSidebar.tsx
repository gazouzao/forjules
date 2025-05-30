import React, { useRef } from 'react'; // Removed useState
// import { SidebarArticlePopup } from './SidebarArticlePopup'; // REMOVED IMPORT

// Updated MarkerArticle interface for ArticleSidebar
// (description and imageUrl are no longer strictly needed by this component directly if popup is removed)
// However, keeping them for now as they are part of the incoming articles prop structure.
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

  // const [hoveredArticle, setHoveredArticle] = useState<MarkerArticle | null>(null); // REMOVED
  // const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({ visibility: 'hidden', opacity: 0 }); // REMOVED
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
            // style={{ pointerEvents: 'auto' }} // REMOVED - let's see if clicks still work without it. If not, can be re-added.
            onClick={() => onArticleSelect(article)}
            // onMouseEnter prop REMOVED
            // onMouseLeave prop REMOVED
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
              <p className="text-xs text-neutral-600 group-hover:text-purple-200 mb-1"> {/* Added mb-1 for spacing */}
                {article.date || 'Date N/A'}
              </p>
              <a
                href={article.lien}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()} // Prevent sidebar item click if button is on top
                className="mt-1 inline-block px-2 py-0.5 text-xs font-medium text-sky-600 bg-sky-100 hover:bg-sky-200 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-sky-500 group-hover:text-sky-700 group-hover:bg-sky-200"
              >
                Lire l'article
              </a>
            </div>
          </div>
        );
      })}
      {/* Conditionally rendered SidebarArticlePopup block REMOVED */}
    </div>
  );
};
