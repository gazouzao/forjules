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
  // Removed the `if (!article) return null;` check as the parent ArticleSidebar now only renders this when hoveredArticle is set.
  const { title, description, imageUrl, date } = article; // Destructure for convenience
  const hasImage = imageUrl && !imageUrl.includes("via.placeholder.com");
  // Use description directly, or fallback to a truncated title if description is empty.
  // This matches the logic in MapDisplay's createPopupContent more closely.
  const summary = description || (title && title.length > 100 ? title.substring(0, 97) + '...' : title) || 'No description available.';

  return (
    // Apply base classes similar to Leaflet's default popups and the custom ones for map pins
    // The specific width/maxWidth will be controlled by these classes or the inline style from ArticleSidebar.
    // `custom-leaflet-popup` and `locked-popup` are key for visual parity with map popups.
    <div
        className="custom-leaflet-popup locked-popup"
        role="tooltip"
        // style={{minWidth: '240px', maxWidth: '320px'}} // These are typically set by leaflet-popup-content-wrapper or the classes themselves
    >
      {/* This inner div structure mimics the one from MapDisplay's createPopupContent */}
      <div className="p-3 max-w-xs">
        {hasImage && (
          <img
            src={imageUrl}
            alt={title ? title.substring(0,30) : 'Article image'}
            className="w-full h-32 object-cover rounded-md mb-2.5 border border-gray-200 shadow-sm"
          />
        )}
        {/* Fallback for when there is no image, to maintain structure if desired, though map popup doesn't have this explicit empty box */}
        {/* {!hasImage && (
          <div className="w-full h-32 bg-gray-100 rounded-md mb-2.5 flex items-center justify-center text-gray-400 text-sm">
            No Image Available
          </div>
        )} */}
        <h3 className="text-base font-semibold mb-1.5 text-gray-800 leading-tight">
          {title || 'Sans titre'}
        </h3>
        {/* Ensure description paragraph is only rendered if summary is not the "No description" fallback, or always render it */}
        <p className="text-xs text-gray-600 mb-3 max-h-20 overflow-y-auto custom-scrollbar pr-1">
          {summary}
        </p>
        {/* Optional: Display date, styled similarly if desired. Map popups don't typically show date prominently in this format. */}
        {date && (
          <p className="text-xxs text-gray-400 mt-1 italic">
            Date: {date}
          </p>
        )}
        {/* The "Lire l'article" button is now part of the main list item in ArticleSidebar, not in the popup itself. */}
      </div>
    </div>
  );
};
