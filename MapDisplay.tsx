
import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster'; 
import type { MarkerArticle, ExtendedMarker } from './types';
import { createUberStylePinHTML, DEFAULT_PIN_COLOR, getCategoryDetails } from './constants';

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
  registerMarker?: (articleId: string, marker: L.Marker) => void;
  selectedArticleId?: string | null; // ADDED
  onMarkerSelected?: (articleId: string) => void; // ADDED
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
  maxWidth: 360, // Changed to 360
  className: 'leaflet-custom-popup-wrapper',
  offset: [0, POPUP_ANCHOR_OFFSET_Y],
  autoPan: true, // Ensure autoPan is true
  keepInView: true // Ensure keepInView is true
};

const hoverPopupOptions: L.PopupOptions = {
  autoClose: true,
  closeButton: false,
  closeOnClick: false,
  autoPan: false, // Keep autoPan false for hover
  minWidth: 240,
  maxWidth: 360, // Changed to 360
  className: 'leaflet-custom-popup-wrapper',
  offset: [0, POPUP_ANCHOR_OFFSET_Y - 10]
};


export const MapDisplay: React.FC<MapDisplayProps> = ({
  articlesForMap,
  setMapInstance,
  mapInstance, // Received from parent, used by other effects
  onMapClick: onMapClickProp,
  registerMarker,
  selectedArticleId, // ADDED
  onMarkerSelected, // ADDED
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

  // Moved createPopupContent higher to be before createHoverPopupContent for clarity
  const createPopupContent = useCallback((article: MarkerArticle): string => {
    const hasImage = article.imageUrl && !article.imageUrl.includes("via.placeholder.com");
    // Ensure summary is always a string, even if description and title are null/undefined.
    const articleTitle = article.title || 'Sans titre';
    const articleDescription = article.description || '';
    // Adjusted summary length to match smaller font style if needed, from previous iteration:
    const summary = articleDescription || (articleTitle.length > 80 ? articleTitle.substring(0, 77) + '...' : articleTitle) || articleTitle;

    // HTML structure with p-4 padding and adjusted font sizes
    let html = `<div class="p-4 font-inter text-gray-700">`;

    if (hasImage) {
      // Image height h-28, rounded-lg, mb-3 (from previous smaller font adjustments)
      html += `<img src="${article.imageUrl}" alt="${articleTitle.substring(0,30)}" class="w-full h-28 object-cover rounded-lg mb-3 shadow-sm" onerror="this.src='https://placehold.co/400x200/CCCCCC/333333?text=Image+Error';" />`;
    }

    // Title: text-md, font-semibold, mb-1
    html += `<h3 class="text-md font-semibold mb-1 leading-tight text-gray-800">${articleTitle}</h3>`;
    // Summary: text-xs, max-h-20 (as per current request), mb-3
    html += `<p class="text-xs text-gray-600 mb-3 max-h-20 overflow-y-auto custom-scrollbar pr-1">${summary}</p>`;

    html += `<div class="flex justify-between items-center">`;
    // Button: text-xs, px-4 py-2
    html += `<a href="${article.lien}" target="_blank" rel="noopener noreferrer" class="inline-block px-4 py-2 text-xs font-medium text-white bg-purple-500 hover:bg-purple-600 rounded-full transition-all duration-200 shadow-xs focus:outline-none focus:ring-2 focus:ring-purple-400">Lire l'article</a>`;

    if (article.localisation) {
      // Localisation: text-xs, substring(0,25)
      const locText = article.localisation.length > 25 ? article.localisation.substring(0,25) + '...' : article.localisation;
      html += `<span class="text-xs text-gray-500 italic" title="Localisation">${locText}</span>`;
    }

    html += `</div>`; // Close flex container
    html += `</div>`; // Close main p-4 content div

    return html;
  }, []);
  
  const openLockedPopup = useCallback((article: MarkerArticle, targetLatLng: L.LatLng) => {
    if (!leafletMapRef.current || !lockedPopupInstanceRef.current) {
      console.warn("openLockedPopup: map or lockedPopupInstanceRef not available");
      return;
    }

    // If a different popup is locked, close it. This will trigger its 'remove' event.
    if (currentLockedArticleIdxRef.current !== null &&
        currentLockedArticleIdxRef.current !== article.idx &&
        leafletMapRef.current.hasLayer(lockedPopupInstanceRef.current)) {
      leafletMapRef.current.closePopup(lockedPopupInstanceRef.current);
    }

    // Close any active hover popup
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
      // If it's already open (e.g. for the same article), update content / position
      lockedPopupInstanceRef.current.update();
    }

    // Notify parent about the selection, if callback provided
    if (onMarkerSelected) {
      onMarkerSelected(article.idx.toString());
    }
  }, [createPopupContent, onMarkerSelected]);

  // createHoverPopupContent is no longer needed as createPopupContent will be used for hover popups.
  // const createHoverPopupContent = useCallback((article: MarkerArticle): string => {
  //   const hasImage = article.imageUrl && !article.imageUrl.includes("via.placeholder.com");
  //   const categoryDetails = getCategoryDetails(article.cat);
  //   const categoryLabel = categoryDetails ? categoryDetails.label : article.cat;
  //   return `
  //     <div class="p-1.5 max-w-xs">
  //       ${hasImage ? `<img src="${article.imageUrl}" alt="${article.title.substring(0,25)}" class="w-full h-20 object-cover rounded mb-1 shadow-sm" />` : ''}
  //       <h4 class="text-xs font-semibold mb-0.5 text-gray-700 leading-tight">${article.title}</h4>
  //       <p class="text-xxs text-gray-500">Cat.: ${categoryLabel}</p>
  //     </div>
  //   `;
  // }, []);

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
            spiderfiedMarkerListenersRef.current.clear(); // Clear any old listeners
            e.markers.forEach(fannedMarker => {
                // The 'article' property is attached to fannedMarker directly if it's an ExtendedMarker
                const articleForPopup = fannedMarker.article;
                if (!articleForPopup) {
                    console.warn("Spiderfied marker missing article data", fannedMarker);
                    return;
                }

                const customClickListener = (domEvent: MouseEvent) => {
                    L.DomEvent.stop(domEvent); // Stop propagation to map click, etc.
                    if (!leafletMapRef.current) return;

                    // Close hover popup if open
                    if (hoverPopupInstanceRef.current && leafletMapRef.current.hasLayer(hoverPopupInstanceRef.current)) {
                        leafletMapRef.current.closePopup(hoverPopupInstanceRef.current);
                    }

                    leafletMapRef.current.unspiderfy();

                    // Use a timeout to allow unspiderfy animation to start/complete
                    setTimeout(() => {
                        if (!leafletMapRef.current) return;
                        const map = leafletMapRef.current;
                        const targetZoom = Math.min(map.getZoom() + LIGHT_ZOOM_INCREMENT, map.getMaxZoom ? map.getMaxZoom() : 19);

                        map.flyTo(fannedMarker.getLatLng(), targetZoom, { animate: true, duration: 0.7 })
                           .once('moveend', () => {
                               if (leafletMapRef.current) { // Check again in case map was unmounted
                                   openLockedPopup(articleForPopup, fannedMarker.getLatLng());
                               }
                           });
                    }, 50); // 50ms delay can be adjusted
                };

                const markerElement = fannedMarker.getElement();
                if (markerElement) {
                    // Remove any existing listener before adding a new one (important for re-spiderfication)
                    L.DomEvent.off(markerElement, 'click', customClickListener); // Ensure old listeners are off
                    L.DomEvent.on(markerElement, 'click', customClickListener);
                    spiderfiedMarkerListenersRef.current.set(fannedMarker, customClickListener as any); // Store with type assertion if needed
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
  }, [setMapInstance, closeActiveLockedPopup, openLockedPopup]); // Added openLockedPopup as it's used in spiderfy


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

        // DO NOT bind a permanent popup here for locked popups. We manage it with openLockedPopup.
        // const popupContent = createPopupContent(article); // Not needed here anymore
        // marker.bindPopup(popupContent, lockedPopupOptions); // REMOVED

        // Register the marker with MapApp (if function provided)
        if (registerMarker && article.idx != null) {
          registerMarker(article.idx.toString(), marker);
        }
        
        // Custom click handler for non-spiderfied markers
        marker.off('click'); // Remove any existing click listeners first
        marker.on('click', (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e.originalEvent);
            if (!leafletMapRef.current) return;

            if (hoverPopupInstanceRef.current && leafletMapRef.current.hasLayer(hoverPopupInstanceRef.current)) {
                leafletMapRef.current.closePopup(hoverPopupInstanceRef.current);
            }

            const map = leafletMapRef.current;
            const targetZoom = Math.min(map.getZoom() + LIGHT_ZOOM_INCREMENT, map.getMaxZoom ? map.getMaxZoom() : 19);

            // If this pin's popup is already locked and it's in view, just re-call openLockedPopup (e.g. to bring to front or update)
            // Otherwise, fly to it.
            if (currentLockedArticleIdxRef.current === article.idx && map.getBounds().contains(e.latlng)) {
                openLockedPopup(article, e.latlng);
            } else {
                map.flyTo(e.latlng, targetZoom, { animate: true, duration: 0.7 })
                   .once('moveend', () => {
                       if (leafletMapRef.current) { // Check map still exists
                           openLockedPopup(article, e.latlng);
                       }
                   });
            }
        });

    // Add hover listeners
    marker.on('mouseover', (e) => {
      if (article.idx === currentLockedArticleIdxRef.current) {
        return;
      }
      if (leafletMapRef.current && hoverPopupInstanceRef.current) {
        hoverPopupInstanceRef.current
          .setLatLng(e.latlng)
          .setContent(createPopupContent(article)); // CHANGED to use createPopupContent
        leafletMapRef.current.openPopup(hoverPopupInstanceRef.current);
      }
    });

    marker.on('mouseout', () => {
      if (leafletMapRef.current && hoverPopupInstanceRef.current && leafletMapRef.current.hasLayer(hoverPopupInstanceRef.current)) {
        // Optional: Add a small delay or check if the mouse is moving towards the popup itself
        // For now, direct close.
        leafletMapRef.current.closePopup(hoverPopupInstanceRef.current);
      }
    });

        newIndividualMarkers.set(article.idx, marker);
        mcg.addLayer(marker);
    });
    individualMarkersRef.current = newIndividualMarkers;

    // Re-opening a previously "locked" popup if it's still in the filtered set.
    // This logic might need review if MapApp now fully controls selection state.
    // If MapApp's handleArticleSelect sets a selectedArticleId state, that could drive this.
    // Re-opening a previously "locked" popup if it's still in the filtered set.
    // This logic is now managed primarily by openLockedPopup being called if an article was selected.
    // However, if an article was selected, MapApp would typically pass that selected article,
    // and a separate effect in MapDisplay (or logic in MapApp) would call openLockedPopup.
    // For now, this explicit re-open logic for a *previously locked* one during marker refresh is okay,
    // but it might be redundant if selection is driven from MapApp state.
    if (articleToReopen && latLngToRestore) {
      const stillExistsAndVisible = articlesForMap.find(a => a.idx === articleToReopen!.idx);
      if (stillExistsAndVisible) {
        // We don't call markerToReopen.openPopup() anymore.
        // Instead, we call our own openLockedPopup to ensure consistent behavior.
        openLockedPopup(stillExistsAndVisible, latLngToRestore);
      } else {
        // If the previously locked article is no longer visible/available, clear the ref
        currentLockedArticleIdxRef.current = null;
      }
    } else if (previouslyLockedArticleIdx !== null && !articleToReopen) {
        // If there was a locked article, but it's no longer in articlesForMap (e.g. filtered out)
        currentLockedArticleIdxRef.current = null;
    }
 
  }, [mapInstance, articlesForMap, openLockedPopup, createPopupContent, registerMarker]); // REMOVED createHoverPopupContent from deps


  // Effect to react to selectedArticleId changes from parent (e.g. sidebar click)
  useEffect(() => {
    if (!leafletMapRef.current || !articlesForMap || !openLockedPopup || !closeActiveLockedPopup || !lockedPopupInstanceRef.current) {
      // If selectedArticleId is null and nothing was locked, that's fine, just means no action needed.
      if (!selectedArticleId && currentLockedArticleIdxRef.current === null) return;
      // If critical refs/callbacks aren't ready, defer.
      if(!leafletMapRef.current || !lockedPopupInstanceRef.current || !openLockedPopup || !closeActiveLockedPopup) return;
    }

    const map = leafletMapRef.current!; // Assert non-null based on checks or typical lifecycle

    if (selectedArticleId) {
      const articleToSelect = articlesForMap.find(a => a.idx.toString() === selectedArticleId);

      if (articleToSelect && typeof articleToSelect.lat === 'number' && typeof articleToSelect.lon === 'number') {
        const targetLatLng = new L.LatLng(articleToSelect.lat, articleToSelect.lon);

        // Avoid re-flying if already selected and popup is at the correct location for this article
        if (currentLockedArticleIdxRef.current === articleToSelect.idx &&
            map.hasLayer(lockedPopupInstanceRef.current!) &&
            lockedPopupInstanceRef.current!.getLatLng().equals(targetLatLng)) {
          // Potentially call openLockedPopup just to ensure content is fresh or it's on top,
          // but without the flyTo animation if it's already there.
          // openLockedPopup(articleToSelect, targetLatLng); // This might be redundant if content doesn't change
          return;
        }

        const currentZoom = map.getZoom();
        // Ensure targetZoom doesn't exceed map's maxZoom. Use a sensible default if getMaxZoom isn't defined.
        const maxZoom = map.getMaxZoom ? map.getMaxZoom() : 19; // Default maxZoom if not available
        const targetZoom = Math.min(currentZoom + LIGHT_ZOOM_INCREMENT, maxZoom);

        map.flyTo(targetLatLng, targetZoom, { animate: true, duration: 0.7 })
          .once('moveend', () => {
            if (leafletMapRef.current) { // Check map still exists
              openLockedPopup(articleToSelect, targetLatLng);
            }
          });
      } else if (!articleToSelect && currentLockedArticleIdxRef.current !== null) {
        // Selected article ID from prop is not found in current articlesForMap,
        // so if a popup is open for an article that's no longer relevant, close it.
        closeActiveLockedPopup();
      }
    } else {
      // selectedArticleId is null, so close any active locked popup
      if (currentLockedArticleIdxRef.current !== null) {
           closeActiveLockedPopup();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedArticleId, articlesForMap, openLockedPopup, closeActiveLockedPopup]);
  // Note: leafletMapRef, lockedPopupInstanceRef are refs and don't need to be in deps.
  // articlesForMap is important: if it changes and selectedArticleId points to an article no longer in it, popup should close.

  return <div ref={mapContainerRef} id="map" className="h-full w-full z-0" aria-label="Carte interactive des actualités" />;
};
