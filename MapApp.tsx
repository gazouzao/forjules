
import React, { useState, useEffect, useCallback, useRef } from 'react';
import L from 'leaflet';
import { FilterPanel } from './FilterPanel';
import { SearchPanel } from './SearchPanel';
import { ArticleSidebar } from './ArticleSidebar';
import { MapDisplay } from './MapDisplay';
import { CATEGORY_ORDER, START_DATE, getCanonicalCategory, getCategoryDetails, DEFAULT_PIN_COLOR } from './constants';
import type { GeoJSONData, GeoJSONFeature, MarkerArticle, FilterState } from './types';

interface MapAppProps {
  initialGeoJsonData: GeoJSONData | null;
}

const MapAppComponent: React.FC<MapAppProps> = ({ initialGeoJsonData }) => {
  const [allArticles, setAllArticles] = useState<MarkerArticle[]>([]);
  const [activeArticlesForMap, setActiveArticlesForMap] = useState<MarkerArticle[]>([]);
  const [filteredArticlesForSidebar, setFilteredArticlesForSidebar] = useState<MarkerArticle[]>([]);
  const [activeFilters, setActiveFilters] = useState<FilterState>({ cat: 'all', search: '', dateIdx: 29 });
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [uniqueCategoryKeys, setUniqueCategoryKeys] = useState<string[]>([]);
  const debounceTimeoutRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (initialGeoJsonData && initialGeoJsonData.features) {
      const processedArticles: MarkerArticle[] = initialGeoJsonData.features.map((feature: GeoJSONFeature, idx: number) => {
        const props = feature.properties;
        const canonicalCat = getCanonicalCategory(props['catégorie'] || props.categorie || props.category);
        const details = getCategoryDetails(canonicalCat);
        const imp = Number(props.importance_globale ?? props.importance ?? 0);
        
        let parsedDate: Date | null = null;
        if (props.date) {
          const dateAttempt = new Date(props.date);
          if (!isNaN(dateAttempt.getTime())) {
            parsedDate = dateAttempt;
          }
        }

        return {
          idx, // This idx might need re-evaluation if data comes from different sources or isn't sequential
          title: props.titre || props.title || 'Sans titre',
          cat: canonicalCat,
          date: props.date || '',
          parsedDate,
          imp,
          lien: props.lien || props.url || '#',
          color: details.color || DEFAULT_PIN_COLOR,
          lat: feature.geometry.coordinates[1],
          lon: feature.geometry.coordinates[0],
          minZoom: imp >= 0.6 ? 1 : (imp >=0.3 ? 3 : 5),
          // Pass through additional properties if needed by map display components
          localisation: props.localisation,
          description: props.description,
          imageUrl: props.imageUrl,
        };
      });
      setAllArticles(processedArticles);

      const presentCats = new Set<string>();
      processedArticles.forEach(article => presentCats.add(article.cat));
      
      const orderedUniqueCats = CATEGORY_ORDER.filter(catKey => presentCats.has(catKey));
      presentCats.forEach(catKey => {
        if (!orderedUniqueCats.includes(catKey)) {
          orderedUniqueCats.push(catKey);
        }
      });
      setUniqueCategoryKeys(orderedUniqueCats);
    } else {
      setAllArticles([]);
      setUniqueCategoryKeys([]);
      setActiveArticlesForMap([]);
      setFilteredArticlesForSidebar([]);
    }
  }, [initialGeoJsonData]);

  const updateActiveArticlesForMapAndSidebar = useCallback(() => {
    if (!mapInstance && allArticles.length > 0) { 
         setActiveArticlesForMap([]);
         setFilteredArticlesForSidebar([]);
         return;
    }
    if (allArticles.length === 0) { // Simplified condition
        setActiveArticlesForMap([]);
        setFilteredArticlesForSidebar([]);
        return;
    }

    const currentZoom = mapInstance ? mapInstance.getZoom() : 0; 

    const articlesPassingFilters = allArticles.filter(article => {
      const catOK = activeFilters.cat === 'all' || article.cat === activeFilters.cat;
      const searchOK = activeFilters.search === '' || article.title.toLowerCase().includes(activeFilters.search.toLowerCase());
      
      let dateOK = true;
      if (article.parsedDate && activeFilters.dateIdx < 29) { 
        const cutoffDate = new Date(START_DATE);
        cutoffDate.setDate(START_DATE.getDate() - (29 - activeFilters.dateIdx)); 
        dateOK = article.parsedDate >= cutoffDate && article.parsedDate <= START_DATE;
      } else if (article.parsedDate && activeFilters.dateIdx === 29) {
         dateOK = article.parsedDate <= START_DATE;
      } else if (!article.parsedDate && activeFilters.dateIdx < 29) { 
          dateOK = false;
      }

      const zoomOK = mapInstance ? currentZoom >= article.minZoom : true; 

      return catOK && searchOK && dateOK && zoomOK;
    });
    
    setActiveArticlesForMap(articlesPassingFilters);

    const sidebarArticles = [...articlesPassingFilters].sort((a, b) => {
      if (b.imp !== a.imp) {
        return b.imp - a.imp;
      }
      if (a.parsedDate && b.parsedDate) {
        if (b.parsedDate.getTime() !== a.parsedDate.getTime()) {
            return b.parsedDate.getTime() - a.parsedDate.getTime();
        }
      } else if (b.parsedDate) {
        return 1; 
      } else if (a.parsedDate) {
        return -1;
      }
      return a.title.localeCompare(b.title);
    });
    setFilteredArticlesForSidebar(sidebarArticles);

  }, [allArticles, activeFilters, mapInstance]); 

  useEffect(() => {
    updateActiveArticlesForMapAndSidebar();
  }, [activeFilters, allArticles, mapInstance, updateActiveArticlesForMapAndSidebar]); 
  
  const debouncedUpdateArticles = useCallback(() => {
    if (debounceTimeoutRef.current !== null) {
      clearTimeout(debounceTimeoutRef.current);
    }
    debounceTimeoutRef.current = window.setTimeout(() => {
      updateActiveArticlesForMapAndSidebar();
    }, 150);
  }, [updateActiveArticlesForMapAndSidebar]);

  useEffect(() => {
    if (mapInstance) {
      mapInstance.on('zoomend', debouncedUpdateArticles);
      mapInstance.on('moveend', debouncedUpdateArticles);
      return () => {
        mapInstance.off('zoomend', debouncedUpdateArticles);
        mapInstance.off('moveend', debouncedUpdateArticles);
        if (debounceTimeoutRef.current !== null) {
          clearTimeout(debounceTimeoutRef.current);
        }
      };
    }
  }, [mapInstance, debouncedUpdateArticles]); 

  const handleCategorySelect = useCallback((categoryKey: string) => {
    setActiveFilters(prev => ({ ...prev, cat: categoryKey }));
  }, []);

  const handleSearch = useCallback((searchTerm: string, dateValue: number) => {
    setActiveFilters(prev => ({ ...prev, search: searchTerm, dateIdx: dateValue }));
  }, []);
  
  const handleDateChange = useCallback((dateValue: number) => {
    setActiveFilters(prev => ({ ...prev, dateIdx: dateValue }));
  }, []);

  const handleMapClick = useCallback(() => {
    // Handled within MapDisplay for popup closure.
  }, []);

  return (
    <div className="h-full w-full flex flex-col antialiased bg-gray-100 relative">
      <MapDisplay
        articlesForMap={activeArticlesForMap}
        setMapInstance={setMapInstance}
        mapInstance={mapInstance}
        onMapClick={handleMapClick} 
      />
      <FilterPanel
        categories={uniqueCategoryKeys}
        activeCategory={activeFilters.cat}
        onSelectCategory={handleCategorySelect}
      />
      <SearchPanel
        onSearch={handleSearch}
        onDateChange={handleDateChange}
        initialDateValue={activeFilters.dateIdx}
      />
      <ArticleSidebar
        articles={filteredArticlesForSidebar}
      />
    </div>
  );
};

export default MapAppComponent;
