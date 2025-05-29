
import { RssSource } from './types-1';

export const INITIAL_RSS_SOURCES: RssSource[] = [
  { name: "Le Monde", url: "https://www.lemonde.fr/rss/une.xml" },
  { name: "Ouest France", url: "https://www.ouest-france.fr/rss.xml" },
  { name: "Libération", url: "https://www.liberation.fr/arc/outboundfeeds/rss-all/collection/accueil-une/?outputType=xml" },
  { name: "Le Figaro", url: "https://www.lefigaro.fr/rss/figaro_actualites.xml" },
  { name: "L'Équipe", url: "https://www.lequipe.fr/rss/actu_rss.xml" },
  { name: "La Croix", url: "https://www.la-croix.com/fils-info-site-LaCroix.com.xml" },
  { name: "New york",url : "https://rss.nytimes.com/services/xml/rss/nyt/AsiaPacific.xml" }
];

export const CORS_PROXY_URL = "https://api.allorigins.win/raw?url=";

export const GEMINI_MODEL_TEXT = "gemini-2.5-flash-preview-04-17";

export const MAX_ARTICLES_TO_ANALYZE = 10; // Limit to prevent too many API calls / long waits
