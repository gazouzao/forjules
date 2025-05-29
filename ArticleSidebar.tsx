
import React from 'react';
import type { MarkerArticle } from '../types';
import { getCategoryDetails } from '../constants';

interface ArticleSidebarProps {
  articles: MarkerArticle[];
}

export const ArticleSidebar: React.FC<ArticleSidebarProps> = ({ 
  articles
}) => {
  
  const noArticlesMessage = "Aucun article à afficher pour les filtres actuels.";

  if (articles.length === 0) {
    return (
      <div 
        id="articleSidebar"
        className="absolute z-[1500] right-[2%] bottom-[3%] w-[310px] max-w-[88vw] max-h-[36vh] 
                   bg-white/90 backdrop-blur-md rounded-[1.5rem] shadow-xl
                   p-4 text-center text-neutral-500 text-sm custom-scrollbar flex flex-col"
        aria-live="polite"
      >
        {noArticlesMessage}
      </div>
    );
  }

  return (
    <div 
      id="articleSidebar"
      className="absolute z-[1500] right-[2%] bottom-[3%] w-[310px] max-w-[88vw] max-h-[36vh] 
                 overflow-y-auto bg-white/90 backdrop-blur-md rounded-[1.5rem] 
                 shadow-xl
                 text-[0.86rem] p-2 flex flex-col gap-0.5 
                 transition-shadow duration-300 scrollbar-thin custom-scrollbar"
      aria-label="Liste des articles filtrés"
    >
      {articles.map((article) => {
        const categoryDetails = getCategoryDetails(article.cat);
        return (
          <div
            key={`${article.idx}-${article.title}`} // Ensure key is unique, idx might not be stable if source data changes
            data-article-idx={article.idx}
            className={`group rounded-xl transition-all duration-150 
                       p-[0.4rem_0.7rem] mb-0.5 flex items-start gap-2.5 
                       hover:bg-neutral-700/95 hover:text-white focus:outline-none focus:ring-2 focus:ring-neutral-500
                       cursor-default`}
            title={`Catégorie: ${categoryDetails.label}\nScore d'importance: ${article.imp.toFixed(2)}`}
          >
            <span 
              className="mt-1 w-3.5 h-3.5 rounded-full border-[2.2px] border-neutral-900 
                         shadow-[0_0.5px_2px_0_rgba(0,0,0,0.09)] bg-clip-padding inline-block shrink-0"
              style={{ backgroundColor: article.color }}
              aria-hidden="true"
            />
            <div className="flex flex-col flex-1 min-w-0">
              <span className={`font-medium text-sm text-neutral-800 truncate group-hover:text-white`} title={article.title}>
                {article.title}
              </span>
              {article.date && (
                <span className={`text-xs text-neutral-500 italic truncate group-hover:text-neutral-300`} title={article.date}>
                  {new Date(article.date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
            <a href={article.lien} target="_blank" rel="noopener noreferrer" 
                className={`text-xs font-semibold ml-1 whitespace-nowrap text-sky-600 group-hover:text-sky-300 focus:outline-none focus:ring-1 focus:ring-sky-400 rounded p-0.5`}
                aria-label={`Lire l'article ${article.title} (Importance ${article.imp.toFixed(2)})`}>
                ★ {article.imp.toFixed(2)}
            </a>
          </div>
        );
      })}
    </div>
  );
};
