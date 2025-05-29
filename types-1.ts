
export interface RawArticle {
  id: string;
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
  source: string;
  imageUrl?: string; // Added for article image
}

export interface AnalysisData {
  importance: number; // Decimal score from 0.0 to 1.0
  categorie: string;  // e.g., 'flash', 'economie', 'international'
  localisation: string; // Textual location
  latitude: number | null; // Latitude, null if not determinable
  longitude: number | null; // Longitude, null if not determinable
}

export interface AnalyzedArticle extends RawArticle, AnalysisData {}

export interface GeoJsonFeatureProperties {
  titre: string;
  categorie: string;
  importance: number;
  lien: string;
  localisation: string;
  date?: string;
  description?: string;
  imageUrl?: string; // Added for map popups
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
