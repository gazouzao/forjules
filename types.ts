
export interface RawArticle {
  id: string;
  title: string;
  link: string;
  pubDate?: string; 
  description?: string; 
  source: string; 
  imageUrl?: string; 
}

// This interface reflects the properties directly asked from the AI (OpenAI) via the French prompt.
export interface GeminiAnalysisResult { // Name kept for structural compatibility if other parts of app expect it
  titre: string; 
  categorie: string;
  importance: number;
  lien: string; 
  localisation: string;
  date: string; 
  description: string; 
  imageUrl?: string; 
  latitude: number | null;
  longitude: number | null;
}

// AnalyzedArticle now explicitly includes fields that will be overridden or populated by AI analysis.
export interface AnalyzedArticle extends RawArticle {
  // Fields from RawArticle that might be superseded by AI
  titre: string; // AI's version of the title
  lien: string; // AI's version of the link (though usually same as raw)
  date: string; // AI's version of the date (standardized format)
  description: string; // AI's version of the description
  imageUrl?: string; // AI's version of imageUrl

  // Fields primarily from AI analysis
  categorie: string; 
  importance: number; 
  localisation: string; 
  latitude: number | null; 
  longitude: number | null; 
}


export interface GeoJsonFeatureProperties {
  titre: string;
  categorie: string;
  importance: number;
  lien: string;
  localisation: string;
  date: string; 
  description: string;
  imageUrl?: string;
}

export interface GeoJsonFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [longitude, latitude]
  };
  properties: GeoJsonFeatureProperties;
}

export interface GeoJsonOutput {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

export enum View {
  RAW_ARTICLES,
  ANALYZED_ARTICLES,
  GEOJSON_OUTPUT
}

export interface RssSource {
  name: string;
  url: string;
}
