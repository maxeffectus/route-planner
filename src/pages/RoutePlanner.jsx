import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { OpenStreetAPI } from '../services/MapsAPI';
import { UserProfile, InterestCategory, MobilityType, TransportMode, UNFILLED_MARKERS } from '../models/UserProfile';
import { SavedRoute } from '../models/SavedRoute';
import { InteractiveMap } from '../components/InteractiveMap';
import { Autocomplete } from '../components/Autocomplete';
import { POIImageThumbnail, POITitle, POIType, POILinks, getPOIAccessibility } from '../components/POIComponents';
import SimpleProfileSetupChat from '../components/SimpleProfileSetupChat';
import { getAllCategoryValues } from '../utils/categoryMapping';
import { GraphHopperRouteProvider } from '../services/GraphHopperRouteProvider';
import { Modal } from '../components/Modal';
import { sortWaypointsByNearestNeighbor } from '../utils/routeOptimization';

// Minimum zoom level required for POI search
const MIN_ZOOM_LEVEL = 11;

// Color for want-to-visit POI highlight (used for both card background and marker halos)
export const WANT_TO_VISIT_POI_HIGHLIGHT_COLOR = '#BBDEFB'; // Medium blue - more visible than light blue

// Maximum number of intermediate points allowed in a route (start + up to 15 waypoints + finish = 17 total points, which fits in 4 GraphHopper API requests)
const MAX_INTERMEDIATE_ROUTE_POINTS = 15;

export function RoutePlanner() {
  const [pois, setPois] = useState([]);
  const [isLoadingPOIs, setIsLoadingPOIs] = useState(false);
  const [poiError, setPoiError] = useState(null);
  const [poiCache, setPoiCache] = useState([]); // Cache all fetched POIs
  const [mapBounds, setMapBounds] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(2);
  const [selectedCityBbox, setSelectedCityBbox] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedPoiId, setSelectedPoiId] = useState(null);
  const [routeStartPOI, setRouteStartPOI] = useState(null);
  const [routeFinishPOI, setRouteFinishPOI] = useState(null);
  const [sameStartFinish, setSameStartFinish] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const [routeBounds, setRouteBounds] = useState(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const mapsAPI = useMemo(() => new OpenStreetAPI(), []); // Create once and reuse
  const citySelectionRef = React.useRef(null); // Track city selection for auto-search
  const isLoadingSavedRouteRef = useRef(false); // Track if we're loading a saved route to prevent clearing routeData
  
  // Prompt API is no longer used for profile setup
  
  // Profile setup modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showProfileOrRoutesModal, setShowProfileOrRoutesModal] = useState(false);
  const [showSavedRoutesModal, setShowSavedRoutesModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
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

  // Load GraphHopper API key from localStorage
  useEffect(() => {
    const savedApiKey = localStorage.getItem('graphhopperApiKey');
    if (savedApiKey) {
      mapsAPI.setRouteProvider(new GraphHopperRouteProvider(savedApiKey));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount - mapsAPI is stable

  // Initialize selected categories based on user profile interests
  useEffect(() => {
    if (userProfile && userProfile.interests !== UNFILLED_MARKERS.OBJECT) {
      const interests = userProfile.getInterests();
      const categoriesFromProfile = Object.keys(interests).filter(cat => interests[cat] > 0);
      if (categoriesFromProfile.length > 0) {
        setSelectedCategories(categoriesFromProfile);
      } else {
        // If profile has no interests, select all
        setSelectedCategories(getAllCategoryValues());
      }
    } else {
      // No profile or profile not filled - select all by default
      setSelectedCategories(getAllCategoryValues());
    }
  }, [userProfile]);

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
    [InterestCategory.HISTORY_CULTURE]: '#795548',    // Brown - исторические места
    [InterestCategory.ART_MUSEUMS]: '#1976D2',         // Blue - музеи и искусство
    [InterestCategory.ARCHITECTURE]: '#7B1FA2',        // Purple - архитектура
    [InterestCategory.NATURE_PARKS]: '#388E3C',        // Green - природа и парки
    [InterestCategory.ENTERTAINMENT]: '#FF6F00',       // Orange - развлечения
    [InterestCategory.GASTRONOMY]: '#D32F2F',          // Red - гастрономия
    [InterestCategory.NIGHTLIFE]: '#1A237E'            // Very Dark Blue - ночная жизнь
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

  // Filter POIs based on selected categories
  // A POI is shown if it has at least one category in common with selectedCategories
  const filteredPois = useMemo(() => {
    return pois.filter(poi => {
    const poiCategories = poi.interest_categories || [];
    return poiCategories.some(cat => selectedCategories.includes(cat));
  });
  }, [pois, selectedCategories]);

  // Sort POIs: selected ones first, then alphabetically within groups
  const sortedFilteredPois = useMemo(() => {
    return [...filteredPois].sort((a, b) => {
      // Selected POIs first
      if (a.wantToVisit && !b.wantToVisit) return -1;
      if (!a.wantToVisit && b.wantToVisit) return 1;
      
      // Alphabetically within groups
      return a.name.localeCompare(b.name);
    });
  }, [filteredPois]);

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

  const handleStartSelect = useCallback((poi) => {
    console.log('Start point selected:', poi);
    setRouteStartPOI(poi);
  }, []);

  const handleFinishSelect = useCallback((poi) => {
    console.log('Finish point selected:', poi);
    setRouteFinishPOI(poi);
  }, []);

  // Handler for selecting route point from context menu on map
  const handleRoutePointSelect = useCallback((type, poi) => {
    if (type === 'start') {
      setRouteStartPOI(poi);
      console.log('Route start point selected from map:', poi);
    } else if (type === 'finish') {
      setRouteFinishPOI(poi);
      console.log('Route finish point selected from map:', poi);
    }
  }, []);

  const clearRoutePoints = () => {
    setRouteStartPOI(null);
    setRouteFinishPOI(null);
    setSameStartFinish(false);
    setRouteData(null);
  };

  // API key save handler
  const handleSaveApiKey = useCallback(() => {
    if (!apiKeyInput.trim()) {
      alert('Please enter an API key');
      return;
    }
    
    // Save to localStorage
    localStorage.setItem('graphhopperApiKey', apiKeyInput.trim());
    
    // Set route provider with new API key
    const provider = new GraphHopperRouteProvider(apiKeyInput.trim());
    mapsAPI.setRouteProvider(provider);
    
    // Close modal
    setShowApiKeyModal(false);
    setApiKeyInput('');
    
    // Trigger route building if points are selected (after saving API key)
    // This is intentional - when user saves API key, we should calculate the route
    if (routeStartPOI && routeFinishPOI) {
      buildRoute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKeyInput, routeStartPOI, routeFinishPOI]); // mapsAPI is stable

  // Build route function
  const buildRoute = useCallback(async () => {
    if (!routeStartPOI || !routeFinishPOI) return;
    
    const routeProvider = mapsAPI.getRouteProvider();
    if (!routeProvider) {
      // Show API key modal
      setShowApiKeyModal(true);
      return;
    }
    
    setIsLoadingRoute(true);
    setRouteError(null);
    
    try {
      // Determine profile from user preferences
      const mobilityType = userProfile?.mobility || MobilityType.STANDARD;
      const transportMode = userProfile?.preferredTransport || TransportMode.WALK;
      
      const profile = routeProvider.getProfileForMobility(mobilityType, transportMode);
      
      // Get all "Want to Visit" POIs as waypoints
      const intermediateWaypoints = [];
      if (userProfile && userProfile.wantToVisitPOIs !== UNFILLED_MARKERS.OBJECT) {
        const wantToVisitIds = Object.keys(userProfile.wantToVisitPOIs);
        
        // Find corresponding POI objects from poiCache
        // Convert both to strings for comparison (poi.id might be string or number)
        const visibleWantToVisitPOIs = filteredPois.filter(poi => wantToVisitIds.includes(String(poi.id)));
        
        // Diagnostic logging
        console.log('🔍 Want to Visit Debug:', {
          wantToVisitIdsCount: wantToVisitIds.length,
          wantToVisitIds: wantToVisitIds,
          filteredPoisSize: filteredPois.length,
          poiCacheSize: poiCache.length,
          poiCacheIdsSample: poiCache.slice(0, 5).map(p => p.id),
          visibleWantToVisitPOIsFound: visibleWantToVisitPOIs.length,
          visibleWantToVisitPOIs: visibleWantToVisitPOIs.map(p => ({ id: p.id, name: p.name }))
        });
        
        // Check maximum points limit
        if (visibleWantToVisitPOIs.length > MAX_INTERMEDIATE_ROUTE_POINTS) {
          alert(
            `The maximum number of points to visit is ${MAX_INTERMEDIATE_ROUTE_POINTS}. Currently selected ${visibleWantToVisitPOIs.length}. Please decrease the number of selected points`
          );
          setIsLoadingRoute(false);
          return;
        }
        
        if (visibleWantToVisitPOIs.length > 0) {
          // Sort waypoints using Nearest Neighbor for optimal order
          const sortedWaypoints = sortWaypointsByNearestNeighbor(
            routeStartPOI, 
            routeFinishPOI, 
            visibleWantToVisitPOIs
          );
          intermediateWaypoints.push(...sortedWaypoints);
          console.log(`Added ${sortedWaypoints.length} "Want to Visit" waypoints in optimized order`);
        } else {
          // Fallback: no "Want to Visit" POIs found - build route without waypoints
          console.log('No "Want to Visit" POIs found, building direct route');
        }
      } else {
        console.log('User profile has no "Want to Visit" POIs, building direct route');
      }
      
      const route = await mapsAPI.buildRoute(
        routeStartPOI,
        routeFinishPOI,
        {
          profile: profile,
          avoidStairs: userProfile?.avoidStairs || false,
          waypoints: intermediateWaypoints
        }
      );
      
      // Add intermediate POI IDs to route data for saving purposes
      route.intermediatePOIIds = intermediateWaypoints.map(poi => String(poi.id));
      
      setRouteData(route);
    } catch (error) {
      console.error('Route building failed:', error);
      
      // Provide more user-friendly error messages
      let errorMessage = error.message || 'Unknown error occurred';
      
      // Handle GraphHopper API limit errors
      if (errorMessage.includes('API limit') || errorMessage.includes('heavily violated')) {
        errorMessage = 'API request limit exceeded. Please wait a moment or try upgrading your GraphHopper plan.';
      } else if (errorMessage.includes('GraphHopper routing error')) {
        // Parse GraphHopper-specific errors
        errorMessage = errorMessage.replace('GraphHopper routing error: ', '');
      }
      
      setRouteError(errorMessage);
    } finally {
      setIsLoadingRoute(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeStartPOI, routeFinishPOI, userProfile, poiCache, filteredPois.length]); // mapsAPI is stable

  // Note: Removed automatic route building on point changes
  // Routes will only be calculated when user clicks "Calculate Route" button

  // Clear route when points change (but not when loading a saved route)
  useEffect(() => {
    // Don't clear route data if we're loading a saved route
    if (isLoadingSavedRouteRef.current) {
      isLoadingSavedRouteRef.current = false;
      return;
    }
    
    setRouteData(null);
    setRouteError(null);
    setRouteBounds(null); // Clear route bounds when route points change
  }, [routeStartPOI, routeFinishPOI]);

  // Handler to open profile/routes choice modal
  const handleOpenProfileOrRoutes = useCallback(() => {
    setShowProfileOrRoutesModal(true);
  }, []);

  // Handler to save current route
  const handleSaveRoute = useCallback(() => {
    if (!routeData || !routeStartPOI || !routeFinishPOI || !userProfile) {
      alert('No route to save');
      return;
    }

    // Prompt for route name
    const routeName = prompt('Enter a name for this route:');
    if (!routeName || routeName.trim() === '') {
      return; // User cancelled or entered empty string
    }

    try {
      // Extract POI IDs from route in correct order: start -> intermediates -> finish
      const poiIds = [];
      
      // Start POI
      if (routeStartPOI) {
        poiIds.push(String(routeStartPOI.id));
      }
      
      // Add intermediate POI IDs (already in correct order from route building)
      if (routeData.intermediatePOIIds && routeData.intermediatePOIIds.length > 0) {
        poiIds.push(...routeData.intermediatePOIIds);
      }
      
      // Finish POI
      if (routeFinishPOI) {
        poiIds.push(String(routeFinishPOI.id));
      }

      // Create SavedRoute instance
      const savedRoute = new SavedRoute({
        name: routeName.trim(),
        geometry: routeData.geometry,
        distance: routeData.distance,
        duration: routeData.duration,
        poiIds: poiIds,
        createdAt: Date.now(),
        instructions: routeData.instructions || []
      });

      // Add to user profile
      userProfile.addSavedRoute(savedRoute);

      // Save to localStorage
      const savedJSON = userProfile.toJSON();
      localStorage.setItem('userProfile', JSON.stringify(savedJSON));
      
      // Reload profile from localStorage to trigger re-render
      const updatedProfile = UserProfile.fromJSON(savedJSON);
      setUserProfile(updatedProfile);

      alert(`Route "${routeName}" saved successfully!`);
    } catch (error) {
      alert(`Error saving route: ${error.message}`);
    }
  }, [routeData, routeStartPOI, routeFinishPOI, userProfile, poiCache]);

  // Handler to load a saved route
  const handleLoadRoute = useCallback((route) => {
    if (!userProfile) return;

    try {
      // Set flag to prevent route clearing in useEffect when we set start/finish POIs
      isLoadingSavedRouteRef.current = true;
      
      // Clear current route
      clearRoutePoints();
      
      // Set route data for display
      setRouteData({
        geometry: route.geometry,
        distance: route.distance,
        duration: route.duration,
        instructions: route.instructions
      });

      // Load POI objects from saved POI IDs
      const loadedPOIs = [];
      const wantToVisitPOIs = userProfile.getWantToVisitPOIs();
      
      for (const poiId of route.poiIds) {
        // First, check if POI already exists in cache with full data
        const cachedPOI = poiCache.find(p => String(p.id) === String(poiId));
        
        if (cachedPOI) {
          // POI exists in cache - use it and mark as wantToVisit
          cachedPOI.wantToVisit = true;
          // Make sure it's in the profile
          if (!userProfile.isWantToVisit(poiId)) {
            userProfile.addWantToVisit(cachedPOI);
          }
          loadedPOIs.push(cachedPOI);
        } else if (wantToVisitPOIs[poiId]) {
          // POI is in wantToVisit but not in cache - create minimal object
          const poiData = wantToVisitPOIs[poiId];
          const minimalPOI = {
            id: poiId,
            name: poiData.name,
            location: poiData.location,
            description: poiData.name,
            interest_categories: [], // We don't have category info in minimal save
            wantToVisit: true
          };
          loadedPOIs.push(minimalPOI);
        }
      }

      // Add loaded POIs to cache (if they're not already there)
      if (loadedPOIs.length > 0) {
        const existingIds = new Set(poiCache.map(p => String(p.id)));
        const newPOIs = loadedPOIs.filter(p => !existingIds.has(String(p.id)));
        if (newPOIs.length > 0) {
          setPoiCache(prev => [...prev, ...newPOIs]);
        }
      }

      // Set start and finish POIs
      if (loadedPOIs.length >= 2) {
        setRouteStartPOI(loadedPOIs[0]);
        setRouteFinishPOI(loadedPOIs[loadedPOIs.length - 1]);
      }

      // Calculate map bounds to fit route
      if (route.geometry && route.geometry.coordinates && route.geometry.coordinates.length > 0) {
        const coords = route.geometry.coordinates;
        let minLat = coords[0][1]; // GeoJSON has [lng, lat]
        let maxLat = coords[0][1];
        let minLng = coords[0][0];
        let maxLng = coords[0][0];
        
        coords.forEach(([lng, lat]) => {
          minLat = Math.min(minLat, lat);
          maxLat = Math.max(maxLat, lat);
          minLng = Math.min(minLng, lng);
          maxLng = Math.max(maxLng, lng);
        });

        // Set bounds to trigger map fitBounds
        setRouteBounds({ minLat, maxLat, minLng, maxLng });
      }

      // Close modal
      setShowSavedRoutesModal(false);
      setShowProfileOrRoutesModal(false);
    } catch (error) {
      // Reset flag on error
      isLoadingSavedRouteRef.current = false;
      alert(`Error loading route: ${error.message}`);
    }
  }, [userProfile, poiCache, clearRoutePoints]);

  // Handler to export route as GeoJSON
  const handleExportGeoJSON = useCallback((route, event) => {
    event.stopPropagation(); // Prevent route loading when clicking export button
    
    try {
      const geojson = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              name: route.name,
              distance: route.distance,
              duration: route.duration,
              poiCount: route.poiIds.length,
              createdAt: new Date(route.createdAt).toISOString()
            },
            geometry: route.geometry
          }
        ]
      };
      
      // Create downloadable file
      const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${route.name.replace(/[^a-z0-9]/gi, '_')}.geojson`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Error exporting GeoJSON: ${error.message}`);
    }
  }, []);

  // Restore wantToVisit state from user profile
  const restoreWantToVisitState = useCallback((pois) => {
    if (!userProfile) return pois;
    
    return pois.map(poi => {
      if (userProfile.isWantToVisit(poi.id)) {
        poi.wantToVisit = true;
      }
      return poi;
    });
  }, [userProfile]);

  // Handler for toggling want to visit
  const handleToggleWantToVisit = useCallback((poi) => {
    if (!userProfile) return;
    
    // Toggle POI instance state
    poi.wantToVisit = !poi.wantToVisit;
    
    // Update profile
    if (poi.wantToVisit) {
      userProfile.addWantToVisit(poi);
    } else {
      userProfile.removeWantToVisit(poi.id);
    }
    
    // Save to localStorage
    localStorage.setItem('userProfile', JSON.stringify(userProfile.toJSON()));
    
    // Force re-render
    setPois([...pois]);
    setPoiCache([...poiCache]);
  }, [userProfile, pois, poiCache]);

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
      
      // Restore wantToVisit state from user profile
      const poisWithState = restoreWantToVisitState(newPOIs);
      
      // Merge with cache (avoiding duplicates by ID)
      const cachedIds = new Set(poiCache.map(p => p.id));
      const uniqueNewPOIs = poisWithState.filter(poi => !cachedIds.has(poi.id));
      
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapBounds, currentZoom, selectedCategories, poiCache, restoreWantToVisitState]); // mapsAPI is stable

  // Initialize APIs in the background
  // Prompt API initialization removed - using simple chat only

  // Initialize user profile and show welcome modal on first load
  useEffect(() => {
    const visited = localStorage.getItem('routePlannerVisited');
    if (!visited) {
      // First time visitor - mark as visited, create empty profile, and show welcome modal
      localStorage.setItem('routePlannerVisited', 'true');
      setHasVisitedBefore(false);
      
      // Create new empty profile
      const newProfile = new UserProfile();
      setUserProfile(newProfile);
      
      // Show welcome modal
      setShowWelcomeModal(true);
    } else {
      // Returning user - show welcome modal on every visit
      setHasVisitedBefore(true);
      setShowWelcomeModal(true);
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

  // Apply profile interests to category filter
  const applyProfileInterests = useCallback(() => {
    if (!userProfile || userProfile.interests === UNFILLED_MARKERS.OBJECT) {
      alert('Please complete your profile first to set interests');
      setShowProfileModal(true);
      return;
    }
    
    const interests = userProfile.getInterests();
    const categoriesFromProfile = Object.keys(interests).filter(cat => interests[cat] > 0);
    
    if (categoriesFromProfile.length === 0) {
      alert('No interests found in your profile. Please update your profile.');
      setShowProfileModal(true);
      return;
    }
    
    setSelectedCategories(categoriesFromProfile);
  }, [userProfile]);

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
              onClick={handleOpenProfileOrRoutes}
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

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '8px', fontSize: '16px' }}>
            {!routeStartPOI ? '📍 Select Start Point' : '🏁 Select Finish Point'}
          </h3>
          
          {!sameStartFinish && (
            <Autocomplete
              searchFunction={(query, limit) => mapsAPI.autocompletePOI(query, limit)}
              onSelect={routeStartPOI ? handleFinishSelect : handleStartSelect}
              renderSuggestion={(poi) => (
                <>
                  <div style={{ fontWeight: '500', color: '#333' }}>
                    {poi.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                    {poi.description || poi.name}
                  </div>
                </>
              )}
              placeholder={routeStartPOI ? "Search finish point..." : "Search start point..."}
              minChars={3}
              maxResults={5}
              debounceMs={300}
            />
          )}
          
          {routeStartPOI && !routeFinishPOI && (
            <div style={{ marginTop: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={sameStartFinish}
                  onChange={(e) => {
                    setSameStartFinish(e.target.checked);
                    if (e.target.checked) {
                      setRouteFinishPOI(routeStartPOI);
                    } else {
                      setRouteFinishPOI(null);
                    }
                  }}
                  style={{ marginRight: '8px' }}
                />
                <span>Route should start and end at the same place</span>
              </label>
            </div>
          )}
        </div>

        {(routeStartPOI || routeFinishPOI) && (
          <div style={{
            marginBottom: '20px',
            padding: '12px',
            backgroundColor: '#f0f7ff',
            borderRadius: '8px',
            border: '1px solid #d0e7ff'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>Route Points</h4>
              <button
                onClick={clearRoutePoints}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              >
                Clear
              </button>
            </div>
            
            {routeStartPOI && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>
                  📍 Start:
                </div>
                <div style={{ fontSize: '13px', fontWeight: '500' }}>
                  {routeStartPOI.name}
                </div>
                <div style={{ fontSize: '11px', color: '#888' }}>
                  {routeStartPOI.description || routeStartPOI.name}
                </div>
              </div>
            )}
            
            {routeFinishPOI && !sameStartFinish && (
              <div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>
                  🏁 Finish:
                </div>
                <div style={{ fontSize: '13px', fontWeight: '500' }}>
                  {routeFinishPOI.name}
                </div>
                <div style={{ fontSize: '11px', color: '#888' }}>
                  {routeFinishPOI.description || routeFinishPOI.name}
                </div>
              </div>
            )}
            
            {sameStartFinish && (
              <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic', marginTop: '4px' }}>
                ↻ Same start and finish point
              </div>
            )}
          </div>
        )}

        {/* Calculate Route Button */}
        {routeStartPOI && routeFinishPOI && (
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={buildRoute}
              disabled={isLoadingRoute}
              style={{
                width: '100%',
                padding: '12px 20px',
                fontSize: '16px',
                fontWeight: 'bold',
                backgroundColor: isLoadingRoute ? '#ccc' : '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isLoadingRoute ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }}
              onMouseEnter={(e) => {
                if (!isLoadingRoute) {
                  e.target.style.backgroundColor = '#1976D2';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoadingRoute) {
                  e.target.style.backgroundColor = '#2196F3';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                }
              }}
            >
              {isLoadingRoute ? '⏳ Calculating Route...' : '🗺️ Calculate Route'}
            </button>
          </div>
        )}

        {/* Route Information Display */}
        {routeData && (
          <div style={{
            marginBottom: '20px',
            padding: '12px',
            backgroundColor: '#e8f5e9',
            borderRadius: '8px',
            border: '1px solid #c8e6c9'
          }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
              Route Information
            </h4>
            <div style={{ fontSize: '12px', color: '#333' }}>
              <div style={{ marginBottom: '4px' }}>
                📏 Distance: {(routeData.distance / 1000).toFixed(2)} km
              </div>
              <div style={{ marginBottom: '8px' }}>
                ⏱️ Duration: {Math.round(routeData.duration / 60)} min
              </div>
              <button
                onClick={handleSaveRoute}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '13px',
                  fontWeight: '500',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#45a049';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#4CAF50';
                }}
              >
                💾 Save Route
              </button>
            </div>
          </div>
        )}

        {isLoadingRoute && (
          <div style={{ padding: '12px', textAlign: 'center', fontSize: '13px', color: '#666', marginBottom: '20px' }}>
            Building route...
          </div>
        )}

        {routeError && (
          <div style={{
            padding: '12px',
            backgroundColor: '#ffebee',
            borderRadius: '8px',
            border: '1px solid #ffcdd2',
            fontSize: '12px',
            color: '#c62828',
            marginBottom: '20px'
          }}>
            ⚠️ {routeError}
          </div>
        )}

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
        {sortedFilteredPois.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ 
              marginTop: 0, 
              marginBottom: '12px',
              fontSize: '18px',
              color: '#333'
            }}>
              Points of Interest ({sortedFilteredPois.length})
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
              {sortedFilteredPois.map((poi, index) => {
                const poiCategories = poi.interest_categories || [];
                // Get colors for all categories
                const colors = poiCategories.map(cat => categoryColors[cat] || '#999');
                const isSelected = selectedPoiId === poi.id;
                
                // Create multi-color border using div elements for each category
                const numCategories = colors.length;
                
                return (
                  <div
                    key={poi.id || index}
                    id={`poi-item-${poi.id}`}
                    onClick={() => {
                      // Toggle selection: if already selected, deselect; otherwise select
                      setSelectedPoiId(prevId => prevId === poi.id ? null : poi.id);
                    }}
                    onMouseOver={(e) => {
                      if (!isSelected && !poi.wantToVisit) e.currentTarget.style.backgroundColor = '#f5f5f5';
                    }}
                    onMouseOut={(e) => {
                      if (!isSelected && !poi.wantToVisit) e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    style={{
                      padding: '12px 16px',
                      borderBottom: index < sortedFilteredPois.length - 1 ? '1px solid #eee' : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative',
                      backgroundColor: poi.wantToVisit ? WANT_TO_VISIT_POI_HIGHLIGHT_COLOR : (isSelected ? '#e3f2fd' : 'transparent'),
                      transform: isSelected ? 'translateX(4px)' : 'translateX(0)',
                      boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'center'
                    }}
                  >
                    {/* Multi-color category indicator (left border) */}
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: '4px',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      {colors.map((color, idx) => (
                        <div
                          key={idx}
                          style={{
                            flex: 1,
                            backgroundColor: color
                          }}
                        />
                      ))}
                    </div>
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
                      {/* Want to Visit Checkbox */}
                      <div style={{ marginBottom: '4px' }}>
                        <label 
                          onClick={(e) => e.stopPropagation()}
                          style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '12px' }}
                        >
                          <input
                            type="checkbox"
                            checked={poi.wantToVisit || false}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleToggleWantToVisit(poi);
                            }}
                            style={{ marginRight: '4px' }}
                          />
                          Want to visit
                        </label>
                      </div>
                      
                      <POITitle poi={poi} color={colors[0]} variant="default" />
                      <POIType poi={poi} />
                      <POILinks poi={poi} fontSize="11px" gap="8px" />
                      {getPOIAccessibility({ poi })}
            </div>
            </div>
                );
              })}
            </div>
          </div>
        )}

        {sortedFilteredPois.length === 0 && !isLoadingPOIs && (
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
          onApplyProfileInterests={applyProfileInterests}
          categoryColors={categoryColors}
          selectedPoiId={selectedPoiId}
          onPoiSelect={setSelectedPoiId}
          onImageLoaded={handleImageLoaded}
          onToggleWantToVisit={handleToggleWantToVisit}
          routeStartPOI={routeStartPOI}
          routeFinishPOI={routeFinishPOI}
          sameStartFinish={sameStartFinish}
          routeData={routeData}
          onRoutePointSelect={handleRoutePointSelect}
          routeBounds={routeBounds}
        />
      </div>

      {/* API Key Modal */}
      <Modal
        isOpen={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        title={`${mapsAPI.getRouteProvider()?.getProviderName() || 'Route Provider'} API Key Required`}
      >
        <div dangerouslySetInnerHTML={{ 
          __html: mapsAPI.getRouteProvider()?.getApiKeyInstructions() || 'Please provide an API key for route building.' 
        }} />
        
        <div style={{ marginTop: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Enter your API Key:
          </label>
          <input
            type="text"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="Paste your API key here"
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              boxSizing: 'border-box'
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSaveApiKey();
              }
            }}
          />
        </div>
        
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setShowApiKeyModal(false)}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              cursor: 'pointer',
              backgroundColor: '#f5f5f5',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSaveApiKey}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              cursor: 'pointer',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px'
            }}
          >
            Save API Key
          </button>
        </div>
      </Modal>

      {/* Profile/Routes Choice Modal */}
      <Modal
        isOpen={showProfileOrRoutesModal}
        onClose={() => setShowProfileOrRoutesModal(false)}
        title="Profile & Routes"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={() => {
              setShowProfileOrRoutesModal(false);
              setShowProfileModal(true);
            }}
            style={{
              padding: '12px 20px',
              fontSize: '15px',
              fontWeight: '500',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#1976D2';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#2196F3';
            }}
          >
            📝 Profile Setup
          </button>
          <button
            onClick={() => {
              setShowProfileOrRoutesModal(false);
              setShowSavedRoutesModal(true);
            }}
            style={{
              padding: '12px 20px',
              fontSize: '15px',
              fontWeight: '500',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#45a049';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#4CAF50';
            }}
          >
            🗺️ Saved Routes ({userProfile && userProfile.getAllSavedRoutes().length})
          </button>
        </div>
      </Modal>

      {/* Welcome Modal */}
      <Modal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        title="🗺️ Welcome to Route Planner!"
      >
        <div style={{ padding: '20px 0' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px', color: '#333', textAlign: 'center' }}>
            Where would you like to go?
          </h3>
          
          <Autocomplete
            searchFunction={(query, limit) => mapsAPI.autocompleteCities(query, limit)}
            onSelect={(city) => {
              handleCitySelect(city);
              setShowWelcomeModal(false);
            }}
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
          
          <p style={{ color: '#666', fontSize: '14px', marginTop: '16px', marginBottom: '0', textAlign: 'center' }}>
            Or close this window and use the map to explore. <br />
            Zoom in to level {MIN_ZOOM_LEVEL} or higher to search for points of interest.
          </p>
        </div>
      </Modal>

      {/* Saved Routes Modal */}
      <Modal
        isOpen={showSavedRoutesModal}
        onClose={() => setShowSavedRoutesModal(false)}
        title="Saved Routes"
      >
        {userProfile && userProfile.getAllSavedRoutes().length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
            {userProfile.getAllSavedRoutes().map((route) => (
              <div
                key={route.name}
                style={{
                  padding: '12px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '8px',
                  transition: 'all 0.2s',
                  border: '1px solid #ddd'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e3f2fd';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px' }}>
                  {route.name}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Created: {new Date(route.createdAt).toLocaleDateString()}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  POIs: {route.poiIds.length} points
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                  Distance: {(route.distance / 1000).toFixed(2)} km
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleLoadRoute(route)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      fontSize: '13px',
                      fontWeight: '500',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#1976D2';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#2196F3';
                    }}
                  >
                    Load Route
                  </button>
                  <button
                    onClick={(e) => handleExportGeoJSON(route, e)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      fontSize: '13px',
                      fontWeight: '500',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#45a049';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#4CAF50';
                    }}
                  >
                    Export GeoJSON
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
            <p style={{ margin: 0, fontSize: '14px' }}>
              No saved routes yet. Build and save your first route to get started!
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
