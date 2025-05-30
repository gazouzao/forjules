import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MapAppComponent from './MapApp'; // Assuming default export
import L from 'leaflet'; // For map instance and marker types

// Mock child components
jest.mock('./MapDisplay', () => ({ MapDisplay: jest.fn(({ setMapInstance, registerMarker }) => {
    // Simulate map instance creation and marker registration
    const mockMap = {
        flyTo: jest.fn(),
        getZoom: jest.fn(() => 10), // Default zoom
        // Add other methods if MapApp directly calls them and they need mocking
    } as unknown as L.Map;
    if (setMapInstance) setMapInstance(mockMap);

    // Allow tests to simulate marker registration
    (window as any).mockRegisterMarker = registerMarker;
    return <div data-testid="map-display-mock">MapDisplay</div>;
})}));
jest.mock('./ArticleSidebar', () => ({ ArticleSidebar: jest.fn(({ onArticleSelect }) => {
    // Allow tests to simulate article selection
    (window as any).mockOnArticleSelect = onArticleSelect;
    return <div data-testid="article-sidebar-mock">ArticleSidebar</div>;
})}));
jest.mock('./FilterPanel', () => ({ FilterPanel: jest.fn(() => <div data-testid="filter-panel-mock">FilterPanel</div>) }));
jest.mock('./SearchPanel', () => ({ SearchPanel: jest.fn(() => <div data-testid="search-panel-mock">SearchPanel</div>) }));

// Mock constants if they are complex or have side effects not relevant to these tests
jest.mock('./constants', () => ({
  ...jest.requireActual('./constants'), // Import and retain default behavior for unmocked parts
  CATEGORY_ORDER: ['all', 'tech', 'urgent'], // Simplified for tests if needed
  START_DATE: new Date('2024-01-01T00:00:00.000Z'), // Fixed date for testing
}));

describe('MapAppComponent', () => {
  const mockInitialGeoJsonData = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [10, 50] },
        properties: { idx: 0, titre: 'Article 1', categorie: 'tech', importance: 0.8, lat: 50, lon: 10, minZoom: 5, lien: '#', date: '2024-01-01' },
      },
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [20, 55] },
        properties: { idx: 1, titre: 'Article 2', categorie: 'urgent', importance: 0.9, lat: 55, lon: 20, minZoom: 6, lien: '#', date: '2024-01-02' },
      },
    ],
  } as any; // Using 'any' to simplify mock data structure for properties

  let mockMapInstance: L.Map;
  let registeredMarkers: Map<string, L.Marker>;

  beforeEach(() => {
    // Reset mocks and shared state
    registeredMarkers = new Map<string, L.Marker>();
    (MapDisplay as jest.Mock).mockImplementation(({ setMapInstance, registerMarker }) => {
        mockMapInstance = {
            flyTo: jest.fn(),
            getZoom: jest.fn(() => 10),
            // Add any other L.Map methods MapApp might call
        } as unknown as L.Map;
        if (setMapInstance) setMapInstance(mockMapInstance);
        if (registerMarker) {
            (window as any).mockRegisterMarker = (id: string, marker: L.Marker) => {
                registeredMarkers.set(id, marker); // Capture registered markers
                registerMarker(id, marker);
            };
        }
        return <div data-testid="map-display-mock">MapDisplay</div>;
    });
    (ArticleSidebar as jest.Mock).mockImplementation(({ onArticleSelect }) => {
        (window as any).mockOnArticleSelect = onArticleSelect;
        return <div data-testid="article-sidebar-mock">ArticleSidebar</div>;
    });
  });

  test('renders main components', () => {
    render(<MapAppComponent initialGeoJsonData={mockInitialGeoJsonData} />);
    expect(screen.getByTestId('map-display-mock')).toBeInTheDocument();
    expect(screen.getByTestId('article-sidebar-mock')).toBeInTheDocument();
    expect(screen.getByTestId('filter-panel-mock')).toBeInTheDocument();
    expect(screen.getByTestId('search-panel-mock')).toBeInTheDocument();
  });

  describe('handleArticleSelect', () => {
    test('calls mapInstance.flyTo and marker.openPopup on article select', () => {
      render(<MapAppComponent initialGeoJsonData={mockInitialGeoJsonData} />);

      const articleToSelect = { // This is the type ArticleSidebar sends
        idx: '0', // String idx, as processed for sidebar
        title: 'Article 1',
        cat: 'tech',
        imp: 0.8,
        lat: 50,
        lon: 10,
        minZoom: 5,
        lien: '#',
        date: '2024-01-01'
      };

      // Simulate marker registration (MapDisplay would do this)
      const mockMarker = {
        openPopup: jest.fn(),
        // Add other L.Marker properties if needed
      } as unknown as L.Marker;

      // Manually register the marker as MapDisplay would via the mocked registerMarker
      // The key '0' corresponds to articleToSelect.idx
      if ((window as any).mockRegisterMarker) {
           act(() => {
            (window as any).mockRegisterMarker(articleToSelect.idx, mockMarker);
           });
      } else {
        // Fallback if mockRegisterMarker setup is tricky, directly populate:
        // This assumes MapApp's markerRefs.current is accessible or can be spied on.
        // For this test, direct registration via the mock prop is cleaner.
        console.warn("mockRegisterMarker not found on window for test setup");
        // As a more direct approach if MapApp exposes markerRefs or we spy:
        // mapAppComponentRef.current.markerRefs.current.set(articleToSelect.idx, mockMarker);
        // But this requires exposing internals. Let's rely on the prop.
        // If window.mockRegisterMarker doesn't work, we might need to rethink how MapDisplay mock interacts.
        // For now, we assume the mock setup for MapDisplay correctly calls registerMarker.
        // To ensure it for this test, we can directly set it if the ref was exposed,
        // but `markerRefs` is internal to MapApp.
        // The current mock structure for MapDisplay should call the registerMarker prop.
        // So, if we get the `registerMarker` from `MapDisplay`'s mock props, we can call it.
        // This is becoming complex. Let's assume the mock setup for MapDisplay will
        // correctly use the passed `registerMarker` prop, which populates `MapApp`'s internal `markerRefs`.
        // The challenge is `markerRefs` is not directly accessible from the test.
        // The solution: MapDisplay's mock should call the passed registerMarker.
        // MapApp's registerMarker then populates the *actual* markerRefs.current.
        // We need to ensure this chain works.
        // The current MapDisplay mock does: (window as any).mockRegisterMarker = registerMarker;
        // This means the test needs to call (window as any).mockRegisterMarker to simulate MapDisplay.
         act(() => {
            const mapDisplayMockProps = (MapDisplay as jest.Mock).mock.calls[0][0];
            if (mapDisplayMockProps.registerMarker) {
                mapDisplayMockProps.registerMarker(articleToSelect.idx, mockMarker);
            }
         });
      }


      // Simulate ArticleSidebar calling onArticleSelect
      expect((window as any).mockOnArticleSelect).toBeDefined();
      act(() => {
        (window as any).mockOnArticleSelect(articleToSelect);
      });

      expect(mockMapInstance.flyTo).toHaveBeenCalledWith(
        [articleToSelect.lat, articleToSelect.lon],
        articleToSelect.minZoom
      );

      // Verify the marker from our manual registration was used
      const markerFromRef = registeredMarkers.get(articleToSelect.idx);
      expect(markerFromRef).toBe(mockMarker); // Ensure the correct marker was registered
      expect(mockMarker.openPopup).toHaveBeenCalledTimes(1);
    });

    test('handleArticleSelect logs warning if mapInstance or coordinates are missing', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      render(<MapAppComponent initialGeoJsonData={null} />); // No map instance initially

      const articleToSelect = { idx: '0', lat: 50, lon: 10, minZoom: 5 };

      // Simulate ArticleSidebar calling onArticleSelect
      act(() => {
        (window as any).mockOnArticleSelect(articleToSelect);
      });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Map instance not available or article coordinates missing for handleArticleSelect.'
      );

      // With map instance but no lat/lon
      render(<MapAppComponent initialGeoJsonData={mockInitialGeoJsonData} />); // mapInstance will be set
      const articleWithoutCoords = { idx: '1' };
       act(() => {
        (window as any).mockOnArticleSelect(articleWithoutCoords);
      });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Map instance not available or article coordinates missing for handleArticleSelect.'
      );

      consoleWarnSpy.mockRestore();
    });
  });

  // No tests for handleArticleHover or hoveredArticleId state, as they were removed.
});
