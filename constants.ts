import { RssSource } from './types';

export const INITIAL_RSS_SOURCES: RssSource[] = [
  { name: "Le Monde (FR)", url: "https://www.lemonde.fr/rss/une.xml" },
  { name: "NYT Asia (EN)",url : "https://rss.nytimes.com/services/xml/rss/nyt/AsiaPacific.xml" },
  { name: "Reuters World (EN)", url: "https://www.reutersagency.com/feed/?best-regions=world&post_type=best" },
  { name: "BBC World (EN)", url: "http://feeds.bbci.co.uk/news/world/rss.xml" },
  { name: "El País (ES)", url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada" },
  { name: "Spiegel (DE)", url: "https://www.spiegel.de/schlagzeilen/index.rss" },
];

export const CORS_PROXY_URL = "https://api.allorigins.win/raw?url=";

// OPENAI_MODEL_TEXT will be used by the repurposed geminiService (now OpenAI service)
export const OPENAI_MODEL_TEXT = "gpt-3.5-turbo-0125"; // Or your preferred OpenAI model like gpt-4o-mini

export const MAX_ARTICLES_TO_ANALYZE = 10; // Default limit for manual analysis

// --- Definitions for MapApp ---

export const DEFAULT_PIN_COLOR: string = '#4A90E2'; // A neutral blue for map pins

export const CATEGORY_ORDER: string[] = ['flash', 'urgent', 'international', 'economie', 'tech', 'environnement', 'culture', 'autre'];

export const START_DATE: Date = new Date(); // Represents the current date for filtering

export interface CategoryDetail {
  name: string;
  color: string;
}

// Details for each category (name for display, color for map pins)
const CATEGORY_DETAILS: Record<string, CategoryDetail> = {
  'flash': { name: 'Flash Info', color: '#FF5733' },      // Orange
  'urgent': { name: 'Urgent', color: '#FF0000' },         // Red
  'international': { name: 'International', color: '#AF7AC5' }, // Purple
  'economie': { name: 'Économie', color: '#5DADE2' },     // Blue
  'tech': { name: 'Technologie', color: '#48C9B0' },    // Teal
  'environnement': { name: 'Environnement', color: '#58D68D' },// Green
  'culture': { name: 'Culture', color: '#F4D03F' },       // Yellow
  'autre': { name: 'Autre', color: '#AAB7B8' }          // Grey
};

/**
 * Returns a canonical category string.
 * @param category The input category string.
 * @returns A standardized category name, defaulting to 'autre'.
 */
export const getCanonicalCategory = (category: string | undefined | null): string => {
  if (!category) return 'autre';
  const lowerCategory = category.toLowerCase().trim();

  if ((CATEGORY_ORDER as readonly string[]).includes(lowerCategory)) {
    return lowerCategory;
  }
  // Add more sophisticated mapping here if necessary in the future
  // e.g. if (lowerCategory === "technologie") return "tech";
  // e.g. if (lowerCategory === "eco") return "economie";
  return 'autre'; // Default to 'autre' if no specific mapping or not in CATEGORY_ORDER
};

/**
 * Retrieves details (like color and display name) for a given category.
 * @param category The canonical category string.
 * @returns An object containing category details. Falls back to 'autre' if category not found.
 */
export const getCategoryDetails = (category: string): CategoryDetail => {
  return CATEGORY_DETAILS[category.toLowerCase()] || CATEGORY_DETAILS['autre'];
};

// --- End of Definitions for MapApp ---
