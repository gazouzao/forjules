// src/SidebarArticlePopup.tsx
import React from 'react';

// Assuming MarkerArticle is imported or defined if props are passed directly
// For now, let's define the props it needs directly for clarity
interface SidebarArticlePopupProps {
  article: {
    title: string;
    description?: string; // AI-generated short description
    imageUrl?: string;    // AI-selected or scraped image
    date?: string;        // Formatted date string
  };
  // Position will be applied via a wrapper or inline styles in ArticleSidebar
  // For now, the component itself doesn't take top/left/right directly in props
  // as it will be wrapped or styled by its parent.
}

export const SidebarArticlePopup: React.FC<SidebarArticlePopupProps> = ({ article }) => {
  if (!article) return null;

  // Prioritize imageUrl (from AI/scraped), then fall back if needed, or handle missing image
  const displayImageUrl = article.imageUrl; // Assuming this is the one to use

  return (
    <div
      className="w-64 bg-slate-700/80 backdrop-blur-lg text-white rounded-xl shadow-2xl p-4 border border-slate-600/80
                 flex flex-col gap-2 transition-opacity duration-200 ease-in-out font-inter"
      role="tooltip"
      aria-live="polite" // Or "assertive" if changes should interrupt
    >
      {displayImageUrl && (
        <img
          src={displayImageUrl}
          alt={`Image for ${article.title}`}
          className="w-full h-32 object-cover rounded-lg mb-1 shadow-md"
        />
      )}
      {!displayImageUrl && (
        <div className="w-full h-32 bg-slate-600/70 rounded-lg mb-1 flex items-center justify-center text-slate-400 text-sm">
          No Image
        </div>
      )}
      <h4 className="text-base font-semibold text-purple-300 leading-tight">
        {article.title}
      </h4>
      {article.date && (
        <p className="text-xs text-slate-300 leading-tight">
          {article.date}
        </p>
      )}
      {article.description && (
        <p className="text-xs text-slate-200 leading-snug max-h-24 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-500 scrollbar-track-slate-600/50 pr-1">
          {article.description}
        </p>
      )}
       {!article.description && (
         <p className="text-xs text-slate-400 italic">No description available.</p>
       )}
    </div>
  );
};

// Default export might be needed
// export default SidebarArticlePopup;
