import React, { useState, useCallback } from 'react';
import { OpenStreetAPI } from '../services/MapsAPI';
import { InteractiveMap } from '../components/InteractiveMap';

export function RoutePlanner() {
  const [pois, setPois] = useState([]);
  const [isLoadingPOIs, setIsLoadingPOIs] = useState(false);
  const [poiError, setPoiError] = useState(null);
  const [poiCache, setPoiCache] = useState([]); // Cache all fetched POIs
  const [mapBounds, setMapBounds] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(2);
  const [selectedCityBbox, setSelectedCityBbox] = useState(null);
  const mapsAPI = new OpenStreetAPI();

  // Helper: Check if a POI is within a bounding box
  const isPoiInBbox = (poi, bbox) => {
    if (!poi.location?.lat || !poi.location?.lng) return false;
    const { lat, lng } = poi.location;
    return (
      lat >= bbox.minLat &&
      lat <= bbox.maxLat &&
      lng >= bbox.minLng &&
      lng <= bbox.maxLng
    );
  };

  const handleBoundsChange = useCallback((bounds) => {
    setMapBounds(bounds);
  }, []);

  const handleZoomChange = useCallback((zoom) => {
    setCurrentZoom(zoom);
  }, []);

  const handleCitySelect = useCallback((city) => {
    console.log('City selected:', city);
    if (city.boundingbox) {
      setSelectedCityBbox(city.boundingbox);
    }
  }, []);

  const handleFindPOIs = async () => {
    if (!mapBounds) {
      setPoiError('Map bounds not available');
      return;
    }

    if (currentZoom < 11) {
      setPoiError('Please zoom in to at least level 11 to search for POIs');
      return;
    }

    const bbox = mapBounds;
    const limit = 50;

    setIsLoadingPOIs(true);
    setPoiError(null);

    try {
      // Step 1: Find cached POIs within the bbox
      const cachedPOIsInBbox = poiCache.filter(poi => isPoiInBbox(poi, bbox));
      console.log(`Found ${cachedPOIsInBbox.length} cached POIs in visible area`);

      // Step 2: Check if we have enough cached POIs
      if (cachedPOIsInBbox.length >= limit) {
        // We have enough cached POIs, just use them
        setPois(cachedPOIsInBbox.slice(0, limit));
        console.log('Using cached POIs only');
        setIsLoadingPOIs(false);
        return;
      }

      // Step 3: Show cached POIs immediately (for better UX)
      setPois(cachedPOIsInBbox);

      // Step 4: Fetch remaining POIs
      const remainingLimit = limit - cachedPOIsInBbox.length;
      console.log(`Fetching ${remainingLimit} more POIs from API`);
      console.log('Search area:', bbox);
      
      const newPOIs = await mapsAPI.getPOI(bbox, limit);
      
      // Step 5: Merge cached and new POIs (avoiding duplicates by ID)
      const cachedIds = new Set(poiCache.map(p => p.id));
      const uniqueNewPOIs = newPOIs.filter(poi => !cachedIds.has(poi.id));
      
      // Step 6: Update cache with new POIs
      if (uniqueNewPOIs.length > 0) {
        setPoiCache(prev => [...prev, ...uniqueNewPOIs]);
        console.log(`Added ${uniqueNewPOIs.length} new POIs to cache`);
      }

      // Step 7: Show combined results (cached + new POIs within bbox)
      const allPOIsInBbox = newPOIs.filter(poi => isPoiInBbox(poi, bbox));
      setPois(allPOIsInBbox.slice(0, limit));
      console.log(`Total POIs displayed: ${allPOIsInBbox.length}`);

    } catch (error) {
      console.error('Error fetching POIs:', error);
      setPoiError(error.message || 'Failed to fetch points of interest');
    } finally {
      setIsLoadingPOIs(false);
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      height: 'calc(100vh - 100px)', // Account for header
      gap: '0'
    }}>
      {/* Left Half - POI List */}
      <div style={{ 
        flex: '0 0 50%',
        padding: '20px',
        backgroundColor: '#f9f9f9',
        overflowY: 'auto',
        borderRight: '2px solid #e0e0e0'
      }}>
        <h2 style={{ marginTop: 0 }}>🗺️ Route Planner</h2>
        
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
          Use the map on the right to explore. Zoom in to level 11 or higher to search for points of interest in the visible area.
        </p>

        {/* POI List */}
        {pois.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ 
              marginTop: 0, 
              marginBottom: '12px',
              fontSize: '18px',
              color: '#333'
            }}>
              Points of Interest ({pois.length})
              {poiCache.length > 0 && (
                <span style={{ 
                  fontSize: '12px', 
                  color: '#666',
                  marginLeft: '8px',
                  fontWeight: 'normal'
                }}>
                  ({poiCache.length} total in cache)
                </span>
              )}
            </h3>
            <div style={{
              maxHeight: '600px',
              overflowY: 'auto',
              backgroundColor: '#fff',
              borderRadius: '8px',
              border: '1px solid #ddd'
            }}>
              {pois.map((poi, index) => (
                <div
                  key={poi.id || index}
                  style={{
                    padding: '12px 16px',
                    borderBottom: index < pois.length - 1 ? '1px solid #eee' : 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ 
                    fontWeight: '600', 
                    color: '#1a73e8',
                    marginBottom: '4px',
                    fontSize: '15px'
                  }}>
                    {poi.name}
                  </div>
                  <div style={{ 
                    fontSize: '13px', 
                    color: '#666',
                    marginBottom: '2px'
                  }}>
                    📍 {poi.type || poi.category}
                  </div>
                  {poi.wikipedia && (
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      📖 Wikipedia
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {pois.length === 0 && !isLoadingPOIs && (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: '#999',
            backgroundColor: '#fff',
            borderRadius: '8px',
            border: '1px dashed #ddd'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
            <p style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '500' }}>
              No POIs loaded yet
            </p>
            <p style={{ margin: 0, fontSize: '14px' }}>
              Zoom in on the map and click "Find points of interest"
            </p>
          </div>
        )}
      </div>

      {/* Right Half - Interactive Map */}
      <div style={{ 
        flex: '0 0 50%',
        position: 'relative'
      }}>
        <InteractiveMap 
          bbox={selectedCityBbox}
          pois={pois}
          mapsAPI={mapsAPI}
          onBoundsChange={handleBoundsChange}
          onZoomChange={handleZoomChange}
          onCitySelect={handleCitySelect}
          onFindPOIs={handleFindPOIs}
          isLoadingPOIs={isLoadingPOIs}
          currentZoom={currentZoom}
          poiError={poiError}
        />
      </div>
    </div>
  );
}
