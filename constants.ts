
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
