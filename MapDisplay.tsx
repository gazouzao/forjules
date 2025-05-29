
import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster'; 
import type { MarkerArticle, ExtendedMarker } from '../types';
import { createUberStylePinHTML, DEFAULT_PIN_COLOR } from '../constants';

// Augment Leaflet's Map interface to include unspiderfy
declare module 'leaflet' {
    interface Map {
        unspiderfy(): this;
    }
}

interface MapDisplayProps {
  articlesForMap: MarkerArticle[];
  setMapInstance: (map: L.Map | null) => void;
  mapInstance: L.Map | null; // Prop for external components to use the map
  onMapClick: () => void; 
}

const UBER_PIN_HEAD_HEIGHT = 26;
const UBER_PIN_STEM_HEIGHT = 10;
const UBER_PIN_BASE_HEIGHT = 8;
const UBER_PIN_TOTAL_VISUAL_HEIGHT = UBER_PIN_HEAD_HEIGHT + UBER_PIN_STEM_HEIGHT + UBER_PIN_BASE_HEIGHT - 3;

const UBER_PIN_ICON_WIDTH = 28;
const UBER_PIN_ICON_HEIGHT = UBER_PIN_TOTAL_VISUAL_HEIGHT + 10; 

const LIGHT_ZOOM_INCREMENT = 1; 
const POPUP_ANCHOR_OFFSET_Y = -(UBER_PIN_TOTAL_VISUAL_HEIGHT - (UBER_PIN_BASE_HEIGHT / 2) + 15);

const lockedPopupOptions: L.PopupOptions = {
  autoClose: false,
  closeOnClick: false, 
  closeButton: true, 
  minWidth: 240,
  maxWidth: 320,
  className: 'custom-leaflet-popup locked-popup',
  offset: [0, POPUP_ANCHOR_OFFSET_Y] 
};

const hoverPopupOptions: L.PopupOptions = {
  autoClose: true,
  closeButton: false,
  closeOnClick: false, 
  minWidth: 240,
  maxWidth: 300,
  className: 'custom-leaflet-popup hover-popup',
  offset: [0, POPUP_ANCHOR_OFFSET_Y]
};


export const MapDisplay: React.FC<MapDisplayProps> = ({
  articlesForMap,
  setMapInstance,
  mapInstance, // Received from parent, used by other effects
  onMapClick: onMapClickProp,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null); // Local ref for the map instance
  const markerClusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const individualMarkersRef = useRef<Map<number, ExtendedMarker>>(new Map());
  
  const lockedPopupInstanceRef = useRef<L.Popup | null>(null);
  const hoverPopupInstanceRef = useRef<L.Popup | null>(null);
  const currentLockedArticleIdxRef = useRef<number | null>(null);
  
  const spiderfiedMarkerListenersRef = useRef(new Map<L.Marker, () => void>());
  const spiderfiedClusterRef = useRef<L.MarkerCluster | null>(null);

  const createPopupContent = useCallback((article: MarkerArticle): string => {
    const summary = article.description || (article.title.length > 100 ? article.title.substring(0, 97) + '...' : article.title);
    const hasImage = article.imageUrl && !article.imageUrl.includes("via.placeholder.com");
    return `
      <div class="p-3 max-w-xs">
        ${hasImage ? `<img src="${article.imageUrl}" alt="${article.title.substring(0,30)}" class="w-full h-32 object-cover rounded-md mb-2.5 border border-gray-200 shadow-sm" />` : ''}
        <h3 class="text-base font-semibold mb-1.5 text-gray-800 leading-tight">${article.title}</h3>
        <p class="text-xs text-gray-600 mb-3 max-h-20 overflow-y-auto custom-scrollbar pr-1">${summary}</p>
        <div class="flex justify-between items-center">
          <a href="${article.lien}" target="_blank" rel="noopener noreferrer" 
             class="inline-block px-3 py-1.5 text-xs font-medium text-sky-700 bg-sky-100 hover:bg-sky-200 rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-sky-500">
            Lire l'article
          </a>
          ${article.localisation ? `<span class="text-xs text-gray-500 italic" title="Localisation">${article.localisation.substring(0,30)}${article.localisation.length > 30 ? '...' : ''}</span>` : ''}
        </div>
      </div>
    `;
  }, []);
  
  const openLockedPopup = useCallback((article: MarkerArticle, targetLatLng: L.LatLng) => {
    if (!leafletMapRef.current || !lockedPopupInstanceRef.current) return;

    if (hoverPopupInstanceRef.current && leafletMapRef.current.hasLayer(hoverPopupInstanceRef.current)) {
      leafletMapRef.current.closePopup(hoverPopupInstanceRef.current);
    }
    currentLockedArticleIdxRef.current = article.idx;
    lockedPopupInstanceRef.current
      .setLatLng(targetLatLng)
      .setContent(createPopupContent(article));

    if (!leafletMapRef.current.hasLayer(lockedPopupInstanceRef.current)) {
      leafletMapRef.current.openPopup(lockedPopupInstanceRef.current);
    } else {
      lockedPopupInstanceRef.current.update();
    }
  }, [createPopupContent]); // Removed leafletMapRef.current from deps as it's a ref

  const closeActiveLockedPopup = useCallback(() => {
    if (leafletMapRef.current && lockedPopupInstanceRef.current && leafletMapRef.current.hasLayer(lockedPopupInstanceRef.current)) {
      leafletMapRef.current.closePopup(lockedPopupInstanceRef.current); 
    } else if (currentLockedArticleIdxRef.current) {
      currentLockedArticleIdxRef.current = null;
    }
  }, []); // Removed leafletMapRef.current from deps


  useEffect(() => {
    let timerId: NodeJS.Timeout | undefined;
    if (mapContainerRef.current && !leafletMapRef.current) { // Initialize only if container exists AND map not yet created
        console.log("[MapDisplay] Initializing Leaflet map...");
        if (mapContainerRef.current.offsetHeight === 0) {
            console.warn("[MapDisplay] Map container has zero height BEFORE Leaflet initialization. This is likely the cause of display issues.");
        } else {
            console.log(`[MapDisplay] Map container initial dimensions: W ${mapContainerRef.current.offsetWidth}, H ${mapContainerRef.current.offsetHeight}`);
        }

        const newMap = L.map(mapContainerRef.current, {
            zoomControl: true,
            attributionControl: false,
        }).setView([20, 0], 3);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>',
            maxZoom: 19,
            subdomains: 'abcd',
        }).addTo(newMap);

        L.control.attribution({position: 'bottomright', prefix: ''}).addTo(newMap);
        
        leafletMapRef.current = newMap; // Store in local ref
        setMapInstance(newMap); // Inform parent

        lockedPopupInstanceRef.current = L.popup(lockedPopupOptions);
        lockedPopupInstanceRef.current.on('remove', () => {
            currentLockedArticleIdxRef.current = null;
        });
        hoverPopupInstanceRef.current = L.popup(hoverPopupOptions);
        
        const mcgOptions: L.MarkerClusterGroupOptions = {
            chunkedLoading: true, maxClusterRadius: 55, disableClusteringAtZoom: 16, 
            zoomToBoundsOnClick: false, spiderfyOnMaxZoom: false, 
            iconCreateFunction: (cluster: L.MarkerCluster): L.DivIcon => { 
                const count = cluster.getChildCount();
                const clusterIconHTML = `
                <div class="uber-pin-shape">
                    <div class="uber-pin-head" style="background-color: ${DEFAULT_PIN_COLOR};"></div>
                    <div class="uber-pin-stem"></div>
                    <div class="uber-pin-base"></div>
                    <span class="cluster-notification-badge">${count}</span>
                </div>`;
                return L.divIcon({
                    html: clusterIconHTML, className: 'uber-pin-marker marker-cluster-custom',
                    iconSize: [UBER_PIN_ICON_WIDTH, UBER_PIN_ICON_HEIGHT],
                    iconAnchor: [UBER_PIN_ICON_WIDTH / 2, UBER_PIN_ICON_HEIGHT - UBER_PIN_BASE_HEIGHT / 2],
                });
            }
        };
        const mcg = L.markerClusterGroup(mcgOptions);
        markerClusterGroupRef.current = mcg;
        newMap.addLayer(mcg);

        // Setup cluster and spiderfy event listeners on newMap and mcg
        mcg.on('clusterclick', (e: L.LeafletEvent & { layer: L.MarkerCluster, originalEvent: MouseEvent }) => {
            L.DomEvent.stopPropagation(e.originalEvent);
            closeActiveLockedPopup(); 
            if (hoverPopupInstanceRef.current && newMap.hasLayer(hoverPopupInstanceRef.current)) {
                newMap.closePopup(hoverPopupInstanceRef.current);
            }
            if (newMap.getZoom() < (mcgOptions.disableClusteringAtZoom || 16) -1) {
                e.layer.zoomToBounds({padding: [40, 40]});
            } else {
                e.layer.spiderfy();
            }
        });

        mcg.on('spiderfied', (e: L.LeafletEvent & { cluster: L.MarkerCluster, markers: ExtendedMarker[] }) => {
            spiderfiedClusterRef.current = e.cluster;
            spiderfiedMarkerListenersRef.current.clear();
            e.markers.forEach(fannedMarker => {
                const customClickListener = () => {
                    if (!leafletMapRef.current || !markerClusterGroupRef.current) return;
                    const articleForPopup = fannedMarker.article; 
                    leafletMapRef.current.unspiderfy(); 
                    setTimeout(() => { 
                        if (!leafletMapRef.current) return;
                        leafletMapRef.current.flyTo(fannedMarker.getLatLng(), leafletMapRef.current.getZoom() + LIGHT_ZOOM_INCREMENT, { animate: true, duration: 0.7 }).once('moveend', () => {
                          if(!leafletMapRef.current) return;
                          openLockedPopup(articleForPopup, fannedMarker.getLatLng());
                        });
                    }, 50); 
                };
                const markerElement = fannedMarker.getElement();
                if (markerElement) {
                    L.DomEvent.on(markerElement, 'click', customClickListener);
                    spiderfiedMarkerListenersRef.current.set(fannedMarker, customClickListener);
                }
            });
        });

        mcg.on('unspiderfied', (e: L.LeafletEvent & { cluster: L.MarkerCluster, markers: ExtendedMarker[] }) => {
            e.markers.forEach(marker => {
                const listener = spiderfiedMarkerListenersRef.current.get(marker);
                const markerElement = marker.getElement();
                if (listener && markerElement) L.DomEvent.off(markerElement, 'click', listener);
            });
            spiderfiedMarkerListenersRef.current.clear();
            if (spiderfiedClusterRef.current === e.cluster) spiderfiedClusterRef.current = null;
        });
        
        timerId = setTimeout(() => {
            if (newMap) {
                console.log("[MapDisplay] Forcing invalidateSize() on map instance after 300ms delay.");
                newMap.invalidateSize();
                if (mapContainerRef.current) {
                    console.log(`[MapDisplay] Map container dimensions AFTER invalidateSize: W ${mapContainerRef.current.offsetWidth}, H ${mapContainerRef.current.offsetHeight}`);
                    if (mapContainerRef.current.offsetHeight === 0) {
                        console.error("[MapDisplay] CRITICAL: Map container height is STILL ZERO after invalidateSize. Check CSS and layout propagation.");
                    }
                }
            }
        }, 300); 

        return () => {
            console.log("[MapDisplay] Cleaning up map instance: removing map.");
            if(timerId) clearTimeout(timerId);
            if (leafletMapRef.current) {
                // Clean up listeners on mcg specific to this instance before removing map
                if(markerClusterGroupRef.current){
                    markerClusterGroupRef.current.off('clusterclick');
                    markerClusterGroupRef.current.off('spiderfied');
                    markerClusterGroupRef.current.off('unspiderfied');
                }
                leafletMapRef.current.remove();
                leafletMapRef.current = null;
            }
            setMapInstance(null); // Inform parent that map is gone
        };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setMapInstance, openLockedPopup, closeActiveLockedPopup]); // Dependencies are stable functions or refs


  const handleMapClickInternal = useCallback(() => {
    closeActiveLockedPopup();
    if (hoverPopupInstanceRef.current && leafletMapRef.current && leafletMapRef.current.hasLayer(hoverPopupInstanceRef.current)) {
        leafletMapRef.current.closePopup(hoverPopupInstanceRef.current);
    }
    if (spiderfiedClusterRef.current && leafletMapRef.current) { 
        leafletMapRef.current.unspiderfy();
    }
    onMapClickProp(); 
  }, [onMapClickProp, closeActiveLockedPopup]); // Removed leafletMapRef from deps

  useEffect(() => {
    // Use the mapInstance prop for effects that need the map _after_ it's initialized
    if (mapInstance) { 
      mapInstance.on('click', handleMapClickInternal);
      return () => {
        mapInstance.off('click', handleMapClickInternal);
      };
    }
  }, [mapInstance, handleMapClickInternal]);


  useEffect(() => {
    // This effect uses mapInstance prop
    if (!markerClusterGroupRef.current || !mapInstance || !lockedPopupInstanceRef.current || !hoverPopupInstanceRef.current) return;
    const mcg = markerClusterGroupRef.current;

    if (mapInstance.hasLayer(hoverPopupInstanceRef.current)) {
        mapInstance.closePopup(hoverPopupInstanceRef.current);
    }

    const previouslyLockedArticleIdx = currentLockedArticleIdxRef.current;
    let latLngToRestore: L.LatLng | null = null;
    let articleToReopen: MarkerArticle | undefined = undefined;


    if (previouslyLockedArticleIdx !== null && mapInstance.hasLayer(lockedPopupInstanceRef.current)) {
        articleToReopen = articlesForMap.find(a => a.idx === previouslyLockedArticleIdx);
        if (articleToReopen) {
            latLngToRestore = lockedPopupInstanceRef.current.getLatLng(); 
        }
        mapInstance.closePopup(lockedPopupInstanceRef.current); 
    }
    
    mcg.clearLayers(); 
    const newIndividualMarkers = new Map<number, ExtendedMarker>();

    articlesForMap.forEach(article => {
        const pinColor = article.color || DEFAULT_PIN_COLOR;
        const iconHTML = createUberStylePinHTML(pinColor);
        const customIcon = L.divIcon({
            className: 'uber-pin-marker', html: iconHTML,
            iconSize: [UBER_PIN_ICON_WIDTH, UBER_PIN_ICON_HEIGHT],
            iconAnchor: [UBER_PIN_ICON_WIDTH / 2, UBER_PIN_ICON_HEIGHT - UBER_PIN_BASE_HEIGHT / 2],
            popupAnchor: [0, POPUP_ANCHOR_OFFSET_Y]
        });

        const marker = L.marker([article.lat, article.lon], { icon: customIcon }) as ExtendedMarker;
        marker.article = article;
        marker.minZoomShowLevel = article.minZoom;

        marker.on('click', (e) => {
            L.DomEvent.stopPropagation(e.originalEvent);
            if (!mapInstance) return;
            const targetZoom = Math.min(mapInstance.getMaxZoom(), mapInstance.getZoom() + LIGHT_ZOOM_INCREMENT);
            mapInstance.flyTo(marker.getLatLng(), targetZoom, { animate: true, duration: 0.7 }).once('moveend', () => {
                if (!mapInstance) return;
                openLockedPopup(marker.article, marker.getLatLng());
            });
        });

        marker.on('mouseover', (eL) => {
            if (!mapInstance || !hoverPopupInstanceRef.current || currentLockedArticleIdxRef.current === article.idx) return; 
            hoverPopupInstanceRef.current.setLatLng(marker.getLatLng()).setContent(createPopupContent(article));
            if (!mapInstance.hasLayer(hoverPopupInstanceRef.current)) mapInstance.openPopup(hoverPopupInstanceRef.current);
        });
        
        marker.on('mouseout', (eL) => {
            if (!mapInstance || !hoverPopupInstanceRef.current) return;
            const popupElement = hoverPopupInstanceRef.current.getElement();
            if (popupElement && eL.originalEvent.relatedTarget && popupElement.contains(eL.originalEvent.relatedTarget as Node)) return; 
            if (mapInstance.hasLayer(hoverPopupInstanceRef.current)) mapInstance.closePopup(hoverPopupInstanceRef.current);
        });
        
        newIndividualMarkers.set(article.idx, marker);
        mcg.addLayer(marker);
    });
    individualMarkersRef.current = newIndividualMarkers;

    if (articleToReopen && latLngToRestore) {
      const stillExistsAndVisible = articlesForMap.find(a => a.idx === articleToReopen!.idx);
      if (stillExistsAndVisible) {
        openLockedPopup(stillExistsAndVisible, latLngToRestore);
      }
    }
 
  }, [mapInstance, articlesForMap, openLockedPopup, createPopupContent]);

  return <div ref={mapContainerRef} id="map" className="h-full w-full z-0" aria-label="Carte interactive des actualités" />;
};
