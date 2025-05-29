
import React from 'react';
import { GeoJsonOutput } from '../types';

interface GeoJsonDisplayProps {
  geoJsonData: GeoJsonOutput | null;
}

const GeoJsonDisplay: React.FC<GeoJsonDisplayProps> = ({ geoJsonData }) => {
  if (!geoJsonData || geoJsonData.features.length === 0) {
    return <p className="text-gray-400 p-4 text-center">No GeoJSON data to display. Analyze articles first to generate GeoJSON.</p>;
  }

  const handleCopy = () => {
    if (geoJsonData) {
      navigator.clipboard.writeText(JSON.stringify(geoJsonData, null, 2))
        .then(() => alert('GeoJSON copied to clipboard!')) 
        .catch(err => console.error('Failed to copy GeoJSON: ', err));
    }
  };

  const downloadGeoJson = () => {
    if (geoJsonData) {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(geoJsonData, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "analyzed_articles.geojson");
      document.body.appendChild(downloadAnchorNode); 
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    }
  };

  return (
    <div className="bg-slate-800 shadow-xl rounded-lg p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
        <h3 className="text-lg font-semibold text-purple-300">GeoJSON Output</h3>
        <div className="flex gap-3">
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-colors"
          >
            Copy GeoJSON
          </button>
          <button
            onClick={downloadGeoJson}
            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 transition-colors"
          >
            Download GeoJSON
          </button>
        </div>
      </div>
      <pre className="bg-slate-900 p-4 rounded-md overflow-auto text-sm text-gray-300 max-h-[60vh] custom-scrollbar scrollbar-thin border border-slate-700">
        <code>{JSON.stringify(geoJsonData, null, 2)}</code>
      </pre>
    </div>
  );
};

export default GeoJsonDisplay;
