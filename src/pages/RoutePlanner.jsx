import React, { useState, useCallback, useEffect } from 'react';
import { OpenStreetAPI } from '../services/MapsAPI';
import { InteractiveMap } from '../components/InteractiveMap';
import noImagePlaceholder from '../static_resources/no_image_placeholder.png';

// Component to handle async image loading for a POI
function POIImage({ poi, mapsAPI, alt, onImageLoaded }) {
  const [imageUrl, setImageUrl] = useState(poi.resolvedImageUrl || noImagePlaceholder);
  const [isLoading, setIsLoading] = useState(!poi.resolvedImageUrl);

  useEffect(() => {
    // If we already have a resolved image URL, don't fetch again
    if (poi.resolvedImageUrl) {
      setImageUrl(poi.resolvedImageUrl);
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    
    const loadImage = async () => {
      setIsLoading(true);
      try {
        const url = await mapsAPI.getPOIImage(poi);
        if (isMounted) {
          setImageUrl(url);
          setIsLoading(false);
          // Notify parent that image was loaded so it can update the cache
          if (onImageLoaded) {
            onImageLoaded(poi.id, url);
          }
        }
      } catch (error) {
        console.warn('Error loading POI image:', error);
        if (isMounted) {
          setImageUrl(noImagePlaceholder);
          setIsLoading(false);
          // Cache the placeholder too to avoid re-fetching
          if (onImageLoaded) {
            onImageLoaded(poi.id, noImagePlaceholder);
          }
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [poi, mapsAPI, onImageLoaded]);

  return (
    <div style={{
      width: '80px',
      height: '80px',
      flexShrink: 0,
      borderRadius: '6px',
      overflow: 'hidden',
      backgroundColor: '#f0f0f0',
      border: '1px solid #ddd',
      position: 'relative'
    }}>
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '20px',
          color: '#999'
        }}>
          ⏳
        </div>
      )}
      <img 
        src={imageUrl}
        alt={alt}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          opacity: isLoading ? 0.3 : 1,
          transition: 'opacity 0.3s'
        }}
        onError={(e) => {
          // If image fails to load, use local placeholder
          e.target.src = noImagePlaceholder;
          setIsLoading(false);
        }}
        onLoad={() => {
          setIsLoading(false);
        }}
      />
    </div>
  );
}

export function RoutePlanner() {
  const [pois, setPois] = useState([]);
  const [isLoadingPOIs, setIsLoadingPOIs] = useState(false);
  const [poiError, setPoiError] = useState(null);
  const [poiCache, setPoiCache] = useState([]); // Cache all fetched POIs
  const [mapBounds, setMapBounds] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(2);
  const [selectedCityBbox, setSelectedCityBbox] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([
    'museum', 'attraction', 'historic', 'place_of_worship', 'park', 'viewpoint'
  ]);
  const [selectedPoiId, setSelectedPoiId] = useState(null);
  const mapsAPI = new OpenStreetAPI();

  // Handler to update POI cache with resolved image URL
  const handleImageLoaded = useCallback((poiId, imageUrl) => {
    setPoiCache(prevCache => 
      prevCache.map(cachedPoi => 
        cachedPoi.id === poiId 
          ? { ...cachedPoi, resolvedImageUrl: imageUrl }
          : cachedPoi
      )
    );
    
    // Also update the current pois display
    setPois(prevPois => 
      prevPois.map(poi => 
        poi.id === poiId 
          ? { ...poi, resolvedImageUrl: imageUrl }
          : poi
      )
    );
  }, []);

  // Colorblind-friendly color mapping for POI categories
  const categoryColors = {
    'museum': '#1976D2',        // Blue
    'attraction': '#FF6F00',    // Orange
    'historic': '#795548',      // Brown
    'place_of_worship': '#7B1FA2', // Purple
    'park': '#388E3C',          // Green
    'viewpoint': '#00897B'      // Teal
  };

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

  // Helper: Determine POI category from its type/category field
  const getPoiCategory = (poi) => {
    const type = poi.type || poi.category || '';
    const lowerType = type.toLowerCase();
    
    // Map POI types to our category system
    if (lowerType.includes('museum')) return 'museum';
    if (lowerType.includes('attraction')) return 'attraction';
    if (lowerType.includes('historic') || lowerType.includes('castle') || 
        lowerType.includes('monument') || lowerType.includes('ruins')) return 'historic';
    if (lowerType.includes('place_of_worship') || lowerType.includes('worship')) return 'place_of_worship';
    if (lowerType.includes('park') || lowerType.includes('garden')) return 'park';
    if (lowerType.includes('viewpoint')) return 'viewpoint';
    
    // Default: return the original category if it matches one of ours
    if (selectedCategories.includes(lowerType)) return lowerType;
    
    return null;
  };

  // Filter POIs based on selected categories
  const filteredPois = pois.filter(poi => {
    const poiCategory = getPoiCategory(poi);
    return poiCategory && selectedCategories.includes(poiCategory);
  });

  // Auto-scroll selected POI into view
  React.useEffect(() => {
    if (selectedPoiId) {
      const element = document.getElementById(`poi-item-${selectedPoiId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedPoiId]);

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

    if (selectedCategories.length === 0) {
      setPoiError('Please select at least one POI category');
      return;
    }

    const bbox = mapBounds;
    const fetchLimit = 100; // Fetch more POIs from API

    setIsLoadingPOIs(true);
    setPoiError(null);

    try {
      // Step 1: Find cached POIs within the bbox
      const cachedPOIsInBbox = poiCache.filter(poi => isPoiInBbox(poi, bbox));
      console.log(`Found ${cachedPOIsInBbox.length} cached POIs in visible area`);

      // Step 2: Show cached POIs immediately (for better UX)
      setPois(cachedPOIsInBbox);

      // Step 3: Fetch new POIs from API with selected categories
      console.log(`Fetching POIs from API with categories:`, selectedCategories);
      console.log('Search area:', bbox);
      
      const newPOIs = await mapsAPI.getPOI(bbox, fetchLimit, selectedCategories);
      
      // Step 4: Merge cached and new POIs (avoiding duplicates by ID)
      const cachedIds = new Set(poiCache.map(p => p.id));
      const uniqueNewPOIs = newPOIs.filter(poi => !cachedIds.has(poi.id));
      
      // Step 5: Update cache with new POIs
      if (uniqueNewPOIs.length > 0) {
        setPoiCache(prev => [...prev, ...uniqueNewPOIs]);
        console.log(`Added ${uniqueNewPOIs.length} new POIs to cache`);
      }

      // Step 6: Show ALL POIs within bbox (no limit)
      const allPOIsInBbox = [...cachedPOIsInBbox];
      
      // Add new POIs that are in bbox
      newPOIs.forEach(poi => {
        if (isPoiInBbox(poi, bbox) && !cachedIds.has(poi.id)) {
          allPOIsInBbox.push(poi);
        }
      });
      
      setPois(allPOIsInBbox);
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
        {filteredPois.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ 
              marginTop: 0, 
              marginBottom: '12px',
              fontSize: '18px',
              color: '#333'
            }}>
              Points of Interest ({filteredPois.length})
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
              {filteredPois.map((poi, index) => {
                const poiCategory = getPoiCategory(poi);
                const color = categoryColors[poiCategory] || '#999';
                const isSelected = selectedPoiId === poi.id;
                
                return (
                  <div
                    key={poi.id || index}
                    id={`poi-item-${poi.id}`}
                    onClick={() => {
                      // Toggle selection: if already selected, deselect; otherwise select
                      setSelectedPoiId(prevId => prevId === poi.id ? null : poi.id);
                    }}
                    style={{
                      padding: '12px 16px',
                      borderBottom: index < filteredPois.length - 1 ? '1px solid #eee' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      borderLeft: `4px solid ${color}`,
                      position: 'relative',
                      backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
                      transform: isSelected ? 'translateX(4px)' : 'translateX(0)',
                      boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'center'
                    }}
                    onMouseOver={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = '#f5f5f5';
                    }}
                    onMouseOut={(e) => {
                      if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    {/* POI Image */}
                    <POIImage 
                      poi={poi} 
                      mapsAPI={mapsAPI} 
                      alt={poi.name}
                      onImageLoaded={handleImageLoaded}
                    />

                    {/* POI Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: '600', 
                        color: '#1a73e8',
                        marginBottom: '4px',
                        fontSize: '15px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
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
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {filteredPois.length === 0 && !isLoadingPOIs && (
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
          pois={filteredPois}
          mapsAPI={mapsAPI}
          onBoundsChange={handleBoundsChange}
          onZoomChange={handleZoomChange}
          onCitySelect={handleCitySelect}
          onFindPOIs={handleFindPOIs}
          isLoadingPOIs={isLoadingPOIs}
          currentZoom={currentZoom}
          poiError={poiError}
          hasPOIsInArea={filteredPois.length > 0}
          selectedCategories={selectedCategories}
          onCategoriesChange={setSelectedCategories}
          categoryColors={categoryColors}
          getPoiCategory={getPoiCategory}
          selectedPoiId={selectedPoiId}
          onPoiSelect={setSelectedPoiId}
        />
      </div>
    </div>
  );
}
