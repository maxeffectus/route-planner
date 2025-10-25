import React, { useState, useCallback, useEffect, useRef } from 'react';
import { OpenStreetAPI } from '../services/MapsAPI';
import { UserProfile } from '../models/UserProfile';
import { InteractiveMap } from '../components/InteractiveMap';
import { Autocomplete } from '../components/Autocomplete';
import { POIImageThumbnail, POITitle, POIType, POILinks } from '../components/POIComponents';
import SimpleProfileSetupChat from '../components/SimpleProfileSetupChat';
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
  
  // Prompt API is no longer used for profile setup
  
  // Profile setup modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [hasVisitedBefore, setHasVisitedBefore] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const profileChatRef = useRef(null);
  // Simple chat is now the only option

  // Load user profile from localStorage on component mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) {
      try {
        const profileData = JSON.parse(savedProfile);
        const profile = UserProfile.fromJSON(profileData);
        setUserProfile(profile);
      } catch (error) {
        console.error('Failed to load profile from localStorage:', error);
        localStorage.removeItem('userProfile'); // Remove corrupted data
      }
    }
  }, []);

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

  // Initialize APIs in the background
  // Prompt API initialization removed - using simple chat only

  // Show profile setup modal for new users or incomplete profiles
  useEffect(() => {
    const visited = localStorage.getItem('routePlannerVisited');
    if (!visited) {
      // First time visitor - show profile setup
      localStorage.setItem('routePlannerVisited', 'true');
      setHasVisitedBefore(false);
      
      // Create new empty profile and show modal
      const newProfile = new UserProfile();
      setUserProfile(newProfile);
      setShowProfileModal(true);
    } else {
      // Returning user - check if profile is incomplete
      setHasVisitedBefore(true);
      
      // If profile exists but is incomplete, show modal
      if (userProfile && !userProfile.isComplete()) {
        setShowProfileModal(true);
      }
    }
  }, [userProfile]);

  // Manage body scroll when modal is open
  useEffect(() => {
    if (showProfileModal) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }
    
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [showProfileModal]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && showProfileModal) {
        setShowProfileModal(false);
      }
    };

    if (showProfileModal) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showProfileModal, userProfile]);

  // Show prompt input when POIs are searched or city is selected
  const showPromptInput = (pois.length > 0 || isLoadingPOIs);

  // Debug logging
  console.log('RoutePlanner Debug:', {
    hasVisitedBefore,
    showProfileModal,
    userProfile: userProfile ? {
      isComplete: userProfile.isComplete(),
      completionPercentage: userProfile.getCompletionPercentage()
    } : null,
    localStorage: localStorage.getItem('routePlannerVisited')
  });

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
        {/* Profile Setup Button - show different states based on profile completion */}
        {hasVisitedBefore && (
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={() => setShowProfileModal(true)}
              style={{
                padding: '10px 20px',
                backgroundColor: userProfile && userProfile.isComplete() ? '#28a745' : '#ffc107',
                color: userProfile && userProfile.isComplete() ? 'white' : '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                width: '100%'
              }}
            >
              {userProfile && userProfile.isComplete() 
                ? '✅ Profile Complete - Edit Profile' 
                : userProfile 
                  ? `📝 Continue Profile Setup (${userProfile.getCompletionPercentage()}% complete)`
                  : '📝 Setup Travel Profile'
              }
            </button>
            <p style={{ 
              fontSize: '12px', 
              color: '#666', 
              marginTop: '5px',
              textAlign: 'center'
            }}>
              {userProfile && userProfile.isComplete() ? 'Profile completed successfully' : 'Complete your profile for better recommendations'}
            </p>
          </div>
        )}

        {/* Debug button for testing - remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={() => {
                localStorage.removeItem('routePlannerVisited');
                localStorage.removeItem('userProfile');
                setHasVisitedBefore(false);
                setUserProfile(null);
                setShowProfileModal(true);
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ffc107',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                width: '100%'
              }}
            >
              🧪 Reset First Visit (Dev Only)
            </button>
          </div>
        )}

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

        {/* Simple Profile Setup Modal */}
        {showProfileModal && (
          <div 
            className="modal-overlay" 
            onClick={(e) => {
              // Close modal when clicking on overlay
              if (e.target === e.currentTarget) {
                setShowProfileModal(false);
              }
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              pointerEvents: 'auto'
            }}>
            <div className="modal-content" style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '20px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative'
            }}>
              {/* Save and Close button */}
              <button
                onClick={() => {
                  // Save current answer first
                  if (profileChatRef.current) {
                    profileChatRef.current.saveCurrentAnswer();
                  }
                  
                  // Save current profile and close modal
                  if (userProfile) {
                    localStorage.setItem('userProfile', JSON.stringify(userProfile));
                  }
                  setShowProfileModal(false);
                }}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: '#28a745',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  color: 'white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#218838';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#28a745';
                }}
              >
                💾 Save and Close
              </button>

              {/* Simple Profile Setup Chat */}
              <SimpleProfileSetupChat
                ref={profileChatRef}
                userProfile={userProfile}
                onProfileUpdate={setUserProfile}
                onComplete={(profile) => {
                  setUserProfile(profile);
                  setShowProfileModal(false);
                  // Save to localStorage
                  localStorage.setItem('userProfile', JSON.stringify(profile.toJSON()));
                }}
              />
            </div>
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
