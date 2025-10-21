import React, { useState, useCallback, useEffect } from 'react';
import { OpenStreetAPI } from '../services/MapsAPI';
import { SummarizerAPI } from '../services/SummarizerAPI';
import { useStreamingText } from '../hooks/useStreamingText';
import { InteractiveMap } from '../components/InteractiveMap';
import { Autocomplete } from '../components/Autocomplete';
import { ResponseDisplay } from '../components/ResponseDisplay';
import { POIImageThumbnail, POITitle, POIType, POILinks } from '../components/POIComponents';
import { getAllCategoryValues } from '../utils/categoryMapping';

// Minimum zoom level required for POI search
const MIN_ZOOM_LEVEL = 11;

export function RoutePlanner() {
  const [pois, setPois] = useState([]);
  const [isLoadingPOIs, setIsLoadingPOIs] = useState(false);
  const [poiError, setPoiError] = useState(null);
  const [poiCache, setPoiCache] = useState([]); // Cache all fetched POIs
  const [mapBounds, setMapBounds] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(2);
  const [selectedCityBbox, setSelectedCityBbox] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState(getAllCategoryValues());
  const [selectedPoiId, setSelectedPoiId] = useState(null);
  const mapsAPI = new OpenStreetAPI();
  const citySelectionRef = React.useRef(null); // Track city selection for auto-search
  
  // Summarizer API state
  const [userPrompt, setUserPrompt] = useState('');
  const [summarizerReady, setSummarizerReady] = useState(false);
  const [summarizerError, setSummarizerError] = useState(null);
  const summarizerAPIRef = React.useRef(new SummarizerAPI());
  const { response: summaryResult, isLoading: isSummarizing, processStream, resetResponse } = useStreamingText();

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
    // Use POI instance method if available, otherwise fallback
    if (poi.isInBbox) {
      return poi.isInBbox(bbox);
    }
    // Fallback for plain objects
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
  const getPoiCategory = useCallback((poi) => {
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
  }, [selectedCategories]);

  // Filter POIs based on selected categories
  const filteredPois = pois.filter(poi => {
    const poiCategory = getPoiCategory(poi);
    return poiCategory && selectedCategories.includes(poiCategory);
  });

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
    const poisInView = poiCache.filter(poi => isPoiInBbox(poi, mapBounds));
    setPois(poisInView);
    console.log(`Map bounds updated - displaying ${poisInView.length} POIs in current view`);
    console.log('Current bounds:', mapBounds);
  }, [mapBounds, poiCache]); // Re-run whenever bounds or cache changes

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
    console.log('Map bounds changed:', bounds);
    setMapBounds(bounds);
  }, []);

  const handleZoomChange = useCallback((zoom) => {
    setCurrentZoom(zoom);
  }, []);

  const handleCitySelect = useCallback((city) => {
    console.log('City selected:', city);
    if (city.boundingbox) {
      setSelectedCityBbox(city.boundingbox);
      // Mark that we just selected a city, so we can auto-search after zoom updates
      citySelectionRef.current = Date.now();
    }
  }, []);

  const handleFindPOIs = useCallback(async () => {
    if (!mapBounds) {
      setPoiError('Map bounds not available');
      return;
    }

    if (currentZoom < MIN_ZOOM_LEVEL) {
      setPoiError(`Please zoom in to at least level ${MIN_ZOOM_LEVEL} to search for POIs`);
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
      // Fetch new POIs from API with selected categories
      console.log(`Fetching POIs from API with categories:`, selectedCategories);
      console.log('Search area:', bbox);
      
      const newPOIs = await mapsAPI.getPOI(bbox, fetchLimit, selectedCategories);
      
      // Merge with cache (avoiding duplicates by ID)
      const cachedIds = new Set(poiCache.map(p => p.id));
      const uniqueNewPOIs = newPOIs.filter(poi => !cachedIds.has(poi.id));
      
      // Update cache with new POIs - the display effect will automatically update the view
      if (uniqueNewPOIs.length > 0) {
        setPoiCache(prev => [...prev, ...uniqueNewPOIs]);
        console.log(`Added ${uniqueNewPOIs.length} new POIs to cache`);
      } else {
        console.log('No new POIs found - all were already in cache');
      }

    } catch (error) {
      console.error('Error fetching POIs:', error);
      setPoiError(error.message || 'Failed to fetch points of interest');
    } finally {
      setIsLoadingPOIs(false);
    }
  }, [mapBounds, currentZoom, selectedCategories, poiCache, mapsAPI]);

  // Initialize Summarizer API in the background
  useEffect(() => {
    const initializeSummarizer = async () => {
      try {
        const availability = await summarizerAPIRef.current.checkAvailability();
        
        if (availability === 'unavailable') {
          setSummarizerError('Summarizer API is not available in this browser');
          console.warn('Summarizer API not available');
          return;
        }
        
        if (availability === 'downloadable') {
          console.log('Downloading Summarizer model in background...');
          await summarizerAPIRef.current.downloadModel((progress) => {
            console.log(`Summarizer model download: ${progress.toFixed(1)}%`);
          });
        }
        
        // Create session with explicit default options
        await summarizerAPIRef.current.createSummarizer({
          type: 'key-points',
          format: 'markdown',
          length: 'medium',
          expectedInputLanguages: ['en'],
          outputLanguage: 'en',
          expectedContextLanguages: ['en'],
          sharedContext: `These are requests to summarize the traveler's needs and special requirements \
            in order to create a custom-tailored route. Pay special attention to accessibility requests: \
            our user could be a mother with a stroller, a disabled person in a wheelchair, \
            an elderly person, a colorblind person, a bicycle rider, etc.`
        });
        
        setSummarizerReady(true);
        console.log('Summarizer API initialized and ready');
      } catch (error) {
        console.error('Failed to initialize Summarizer API:', error);
        setSummarizerError('Failed to initialize Summarizer API: ' + error.message);
      }
    };
    
    initializeSummarizer();
  }, []);

  // Handle user prompt summarization
  const handleSummarizePrompt = async (e) => {
    e.preventDefault();
    if (!userPrompt.trim()) return;
    
    try {
      const stream = await summarizerAPIRef.current.summarizeText(userPrompt, {
        context: 'Clearly identify user\'s interests and needs for optimal recommendations regarding places to visit, activities, food, entertainment, etc.'
      });
      
      await processStream(stream, { 
        initialMessage: 'Analyzing...',
        onComplete: (result) => console.log('Summary complete:', result)
      });
    } catch (error) {
      console.error('Summarization error:', error);
    }
  };

  // Show prompt input when POIs are searched or city is selected
  const showPromptInput = pois.length > 0 || isLoadingPOIs;

  // Auto-search for POIs when city is selected with appropriate zoom level
  useEffect(() => {
    // Only trigger if we recently selected a city (within last 3 seconds)
    const timeSinceSelection = citySelectionRef.current ? Date.now() - citySelectionRef.current : Infinity;
    if (timeSinceSelection > 3000) {
      // Clear flag after timeout to prevent stale triggers
      if (citySelectionRef.current) {
        console.log('City selection timeout - clearing flag');
        citySelectionRef.current = null;
      }
      return;
    }
    
    if (!selectedCityBbox || !mapBounds) return;
    
    console.log(`Checking POI search conditions after city selection: zoom=${currentZoom}, categories=${selectedCategories.length}, bounds=${!!mapBounds}`);
    
    // Only trigger when zoom is appropriate
    if (currentZoom >= MIN_ZOOM_LEVEL && selectedCategories.length > 0) {
      console.log('Auto-triggering POI search after city selection');
      handleFindPOIs();
      citySelectionRef.current = null; // Clear the flag so we don't search again
    }
    // Don't clear the flag if zoom is too low - wait for it to increase
  }, [currentZoom, mapBounds, selectedCityBbox, selectedCategories, handleFindPOIs]); // Trigger when zoom or bounds update after city selection

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
        <h2 style={{ marginTop: 0, marginBottom: '12px', fontSize: '20px', color: '#333' }}>
          🗺️ Where would you like to go?
        </h2>
        
        <Autocomplete
          searchFunction={(query, limit) => mapsAPI.autocompleteCities(query, limit)}
          onSelect={handleCitySelect}
          renderSuggestion={(city) => (
            <>
              <div style={{ fontWeight: '500', color: '#333' }}>
                {city.name}
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                {city.displayName}
              </div>
            </>
          )}
          placeholder="Search for a city or location..."
          minChars={2}
          maxResults={5}
          debounceMs={300}
        />
        
        <p style={{ color: '#666', fontSize: '14px', marginTop: '15px', marginBottom: '20px' }}>
          Or use the map on the right to explore. Zoom in to level {MIN_ZOOM_LEVEL} or higher to search for points of interest in the visible area.
        </p>

        {/* User Prompt Input (shown after city selection or POI search) */}
        {showPromptInput && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', color: '#333', marginTop: 0, marginBottom: '10px' }}>
              ✨ Tell us what you would like to do
            </h3>
            
            {summarizerError && (
              <div style={{
                backgroundColor: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '4px',
                padding: '8px 12px',
                fontSize: '12px',
                color: '#856404',
                marginBottom: '10px'
              }}>
                ⚠️ {summarizerError}
              </div>
            )}
            
            <form onSubmit={handleSummarizePrompt}>
              <textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="I would like to visit the most outstanding museums and ride attractions"
                disabled={!summarizerReady || isSummarizing}
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '10px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  marginBottom: '8px',
                  opacity: (!summarizerReady || isSummarizing) ? 0.6 : 1
                }}
              />
              
              <button
                type="submit"
                disabled={!summarizerReady || isSummarizing || !userPrompt.trim()}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor: (!summarizerReady || isSummarizing || !userPrompt.trim()) ? '#ccc' : '#1976D2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: (!summarizerReady || isSummarizing || !userPrompt.trim()) ? 'not-allowed' : 'pointer'
                }}
              >
                {isSummarizing ? '🔄 Analyzing...' : '🔍 Analyze my interests'}
              </button>
            </form>
            
            {summaryResult && (
              <div style={{ marginTop: '15px' }}>
                <h4 style={{ fontSize: '14px', color: '#555', marginTop: 0, marginBottom: '8px' }}>
                  Your Interests Summary:
                </h4>
                <ResponseDisplay response={summaryResult} />
              </div>
            )}
          </div>
        )}

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
                    <POIImageThumbnail 
                      poi={poi} 
                      mapsAPI={mapsAPI} 
                      onImageLoaded={handleImageLoaded}
                      size={80}
                      showPreview={true}
                    />

                    {/* POI Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <POITitle poi={poi} color={color} variant="default" />
                      <POIType poi={poi} getPoiCategory={getPoiCategory} />
                      <POILinks poi={poi} fontSize="11px" gap="8px" />
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
          onFindPOIs={handleFindPOIs}
          isLoadingPOIs={isLoadingPOIs}
          currentZoom={currentZoom}
          minZoomLevel={MIN_ZOOM_LEVEL}
          poiError={poiError}
          hasPOIsInArea={filteredPois.length > 0}
          selectedCategories={selectedCategories}
          onCategoriesChange={setSelectedCategories}
          categoryColors={categoryColors}
          getPoiCategory={getPoiCategory}
          selectedPoiId={selectedPoiId}
          onPoiSelect={setSelectedPoiId}
          onImageLoaded={handleImageLoaded}
        />
      </div>
    </div>
  );
}
