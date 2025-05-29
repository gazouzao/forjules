
import React, { useState, useCallback } from 'react';
import MapAppComponent from './MapApp';
import AnalyzerAppComponent from './AnalyzerApp'; // Correct path to the Analyzer component
import { GeoJsonOutput as AnalyzerGeoJsonOutput } from './types'; // Correct path to Analyzer types
import { GeoJSONData as MapGeoJsonData, GeoJSONFeature as MapGeoJsonFeature } from './types';

type AppView = 'map' | 'analyzer';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>('analyzer');
  const [geoJsonForMap, setGeoJsonForMap] = useState<MapGeoJsonData | null>(null);

  const handleGeoJsonGenerated = useCallback((data: AnalyzerGeoJsonOutput | null) => {
    if (data && data.features) {
        const mapFeatures: MapGeoJsonFeature[] = data.features.map(feature => ({
            type: "Feature",
            geometry: {
                type: feature.geometry.type as "Point", 
                coordinates: feature.geometry.coordinates as [number, number], 
            },
            properties: { // Aliasing to ensure map component can find properties
                titre: feature.properties.titre,
                title: feature.properties.titre, // Alias for map component
                'catégorie': feature.properties.categorie, // Keep original French key
                categorie: feature.properties.categorie, // Alias
                category: feature.properties.categorie,  // Alias for map component
                importance_globale: feature.properties.importance, // Keep original
                importance: feature.properties.importance, // Alias
                date: feature.properties.date,
                lien: feature.properties.lien,
                url: feature.properties.lien, // Alias for map component
                localisation: feature.properties.localisation,
                description: feature.properties.description,
                imageUrl: feature.properties.imageUrl,
            }
        }));
        
        const mapData: MapGeoJsonData = {
            type: "FeatureCollection",
            features: mapFeatures
        };
        setGeoJsonForMap(mapData);
        console.log("GeoJSON data received from Analyzer and set for Map:", mapData);
    } else {
        setGeoJsonForMap(null);
        console.log("Received null GeoJSON data from Analyzer.");
    }
  }, []);

  const switchToMap = () => setCurrentView('map');
  const switchToAnalyzer = () => setCurrentView('analyzer');

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-100">
      <nav className="bg-slate-800 text-white p-3 flex justify-center items-center space-x-4 shadow-lg sticky top-0 z-[2000]">
        <button
          onClick={switchToAnalyzer}
          aria-current={currentView === 'analyzer' ? "page" : undefined}
          className={`px-5 py-2.5 rounded-lg font-semibold transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-75
                      ${currentView === 'analyzer' ? 'bg-purple-600 text-white ring-purple-400 shadow-md' : 'bg-slate-700 hover:bg-purple-500 text-slate-300 hover:text-white'}`}
        >
          RSS Analyzer
        </button>
        <button
          onClick={switchToMap}
          aria-current={currentView === 'map' ? "page" : undefined}
          className={`px-5 py-2.5 rounded-lg font-semibold transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-75
                      ${currentView === 'map' ? 'bg-sky-600 text-white ring-sky-400 shadow-md' : 'bg-slate-700 hover:bg-sky-500 text-slate-300 hover:text-white'}
                      ${(!geoJsonForMap && currentView !== 'map') ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={!geoJsonForMap && currentView !== 'map'}
        >
          News Map Explorer
        </button>
      </nav>

      <div className="flex-grow overflow-auto relative"> 
        {currentView === 'analyzer' && (
          <AnalyzerAppComponent onGeoJsonGenerated={handleGeoJsonGenerated} />
        )}
        {currentView === 'map' && (
           geoJsonForMap ? (
            <MapAppComponent initialGeoJsonData={geoJsonForMap} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-10 bg-gray-50">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-24 h-24 text-sky-300 mb-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75l-2.489-2.489m0 0a3.375 3.375 0 10-4.773-4.773 3.375 3.375 0 004.774 4.774zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 19.5L21 21m0 0L19.5 19.5M21 21V10.5M21 21H10.5" />
              </svg>
              <h2 className="text-2xl font-semibold text-slate-700 mb-3">No Map Data Yet</h2>
              <p className="text-slate-500 mb-6 max-w-md">
                Please go to the "RSS Analyzer" to fetch and analyze news articles. Once GeoJSON data is generated, it will appear here on the map.
              </p>
              <button
                onClick={switchToAnalyzer}
                className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75"
              >
                Go to RSS Analyzer
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default App;
