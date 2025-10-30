import { useState, useCallback, useEffect } from 'react';
import { filterPOIsByBounds } from '../utils/poiFilters';

/**
 * Hook for managing POI cache
 * Handles POI storage, filtering by bounds, and image loading
 */
export function usePOICache() {
  const [pois, setPois] = useState([]);
  const [poiCache, setPoiCache] = useState([]);
  const [selectedPoiId, setSelectedPoiId] = useState(null);
  const [mapBounds, setMapBounds] = useState(null);

  // Handler to update POI cache with resolved image URL
  const handleImageLoaded = useCallback((poiId, imageUrl) => {
    setPoiCache(prevCache => 
      prevCache.map(cachedPoi => {
        if (cachedPoi.id === poiId) {
          // Update POI instance with resolved image
          cachedPoi.setResolvedImageUrl(imageUrl);
        }
        return cachedPoi;
      })
    );
    
    // Also update the current pois display
    setPois(prevPois => 
      prevPois.map(poi => {
        if (poi.id === poiId) {
          poi.setResolvedImageUrl(imageUrl);
        }
        return poi;
      })
    );
  }, []);

  // UNIFIED POI DISPLAY: Always show POIs that are in the current map bounds
  // This is the single source of truth for what POIs to display
  useEffect(() => {
    if (!mapBounds) {
      console.log('No map bounds - clearing POIs');
      setPois([]);
      return;
    }
    
    if (poiCache.length === 0) {
      console.log('Cache is empty - clearing POIs');
      setPois([]);
      return;
    }
    
    // Show all cached POIs that are in the current visible area
    const poisInView = filterPOIsByBounds(poiCache, mapBounds);
    setPois(poisInView);
    console.log(`Map bounds updated - displaying ${poisInView.length} POIs in current view`);
    console.log('Current bounds:', mapBounds);
  }, [mapBounds, poiCache]); // Re-run whenever bounds or cache changes

  // Handler for bounds change
  const handleBoundsChange = useCallback((bounds) => {
    console.log('Map bounds changed:', bounds);
    setMapBounds(bounds);
  }, []);

  return {
    // State
    pois,
    poiCache,
    selectedPoiId,
    mapBounds,
    
    // Setters
    setPois,
    setPoiCache,
    setSelectedPoiId,
    setMapBounds,
    
    // Handlers
    handleImageLoaded,
    handleBoundsChange
  };
}

