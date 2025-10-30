import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { OpenStreetAPI } from '../services/MapsAPI';
import { UserProfile, InterestCategory, MobilityType, TransportMode, UNFILLED_MARKERS } from '../models/UserProfile';
import { SavedRoute } from '../models/SavedRoute';
import { InteractiveMap } from '../components/InteractiveMap';
import { Autocomplete } from '../components/Autocomplete';
import { POIAccordion } from '../components/POIAccordion';
import { RoutePointSelector } from '../components/RoutePointSelector';
import { RouteInfoDisplay } from '../components/RouteInfoDisplay';
import SimpleProfileSetupChat from '../components/SimpleProfileSetupChat';
import { getAllCategoryValues, categoryColors } from '../utils/categoryMapping';
import { GraphHopperRouteProvider } from '../services/GraphHopperRouteProvider';
import { Modal } from '../components/Modal';
import { sortWaypointsByNearestNeighbor } from '../utils/routeOptimization';
import { usePromptAPI } from '../hooks/usePromptAPI';
import { useStreamingText } from '../hooks/useStreamingText';
import { ResponseDisplay } from '../components/ResponseDisplay';
import { usePOIGrouping } from '../hooks/usePOIGrouping';
import { useRouteState } from '../hooks/useRouteState';
import { usePOICache } from '../hooks/usePOICache';
import { pickPOIsWithAI } from '../services/AIPoiPicker';
import { exportRouteToGeoJSON, downloadGeoJSON } from '../utils/geojsonExport';
import { exportRouteToKML, downloadKML } from '../utils/kmlExport';
import { loadUserProfile, saveUserProfile, clearUserProfile } from '../utils/profileStorage';
import { buildPOIListForRoute, calculateRouteBounds, reconstructPOIsFromRoute, filterNewPOIs } from '../utils/routeManagement';
import { filterPOIsByCategories, sortPOIsByWantToVisit } from '../utils/poiFilters';

// Minimum zoom level required for POI search
const MIN_ZOOM_LEVEL = 11;

// Default zoom level when selecting a city (if city bounds are too large, we use this zoom level)
const DEFAULT_SELECTED_CITY_ZOOM = 13;

// Color for want-to-visit POI highlight (used for both card background and marker halos)
export const WANT_TO_VISIT_POI_HIGHLIGHT_COLOR = '#BBDEFB'; // Medium blue - more visible than light blue

// Maximum number of intermediate points allowed in a route (start + up to 15 waypoints + finish = 17 total points, which fits in 4 GraphHopper API requests)
const MAX_INTERMEDIATE_ROUTE_POINTS = 15;

export function RoutePlanner() {
  // Use custom hooks for state management
  const {
    pois,
    poiCache,
    selectedPoiId,
    mapBounds,
    setPois,
    setPoiCache,
    setSelectedPoiId,
    setMapBounds,
    handleImageLoaded,
    handleBoundsChange
  } = usePOICache();

  const {
    routeStartPOI,
    routeFinishPOI,
    sameStartFinish,
    routeData,
    isLoadingRoute,
    routeError,
    routeBounds,
    isLoadingSavedRouteRef,
    setRouteStartPOI,
    setRouteFinishPOI,
    setSameStartFinish,
    setRouteData,
    setIsLoadingRoute,
    setRouteError,
    setRouteBounds,
    handleStartSelect,
    handleFinishSelect,
    handleSameStartFinishChange,
    clearRoutePoints
  } = useRouteState();

  // Local state that doesn't fit into hooks
  const [isLoadingPOIs, setIsLoadingPOIs] = useState(false);
  const [poiError, setPoiError] = useState(null);
  const [currentZoom, setCurrentZoom] = useState(2);
  const [selectedCityBbox, setSelectedCityBbox] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const mapsAPI = useMemo(() => new OpenStreetAPI(), []); // Create once and reuse
  const citySelectionRef = React.useRef(null); // Track city selection for auto-search
  
  // Prompt API is no longer used for profile setup
  
  // Profile setup modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showProfileOrRoutesModal, setShowProfileOrRoutesModal] = useState(false);
  const [showSavedRoutesModal, setShowSavedRoutesModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const profileChatRef = useRef(null);
  // Simple chat is now the only option

  // State for selected city in welcome modal
  const [selectedCity, setSelectedCity] = useState(null);
  const [highlightedCity, setHighlightedCity] = useState(null); // Track city for which highlights were generated
  const [cityInputValue, setCityInputValue] = useState(''); // Track input value in welcome modal

  // Prompt API hooks for AI highlights
  const { hasSession, createSession, promptStreaming, destroySession } = usePromptAPI();
  const { response: aiHighlights, isLoading: isLoadingHighlights, processStream, resetResponse } = useStreamingText();

  // Accessibility warning modal state
  const [accessibilityWarning, setAccessibilityWarning] = useState(null); // { poi, message }

  // AI POI picker state
  const [isPickingPOIs, setIsPickingPOIs] = useState(false);
  const [aiPickerWarning, setAiPickerWarning] = useState(null); // { pois: [], onConfirm: function }
  const [showModelDownloadModal, setShowModelDownloadModal] = useState(false); // For Prompt API model download confirmation
  const [modelDownloadCallback, setModelDownloadCallback] = useState(null); // Callback to execute after download
  
  // Route deletion confirmation state
  const [routeToDelete, setRouteToDelete] = useState(null); // SavedRoute object to delete

  // Load user profile from localStorage on component mount
  // If no profile exists, create a new one
  useEffect(() => {
    const profile = loadUserProfile();
    if (profile) {
      console.log('Profile loaded from localStorage on mount');
      setUserProfile(profile);
    } else {
      console.log('No profile found in localStorage - creating new one');
      const newProfile = new UserProfile();
      setUserProfile(newProfile);
      saveUserProfile(newProfile);
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

  // handleImageLoaded is now provided by usePOICache hook
  // categoryColors is now imported from utils/categoryMapping
  // isPoiInBbox is now imported from utils/poiFilters

  // Filter POIs based on selected categories using utility
  const filteredPois = useMemo(() => {
    return filterPOIsByCategories(pois, selectedCategories);
  }, [pois, selectedCategories]);

  // Sort POIs: selected ones first, then alphabetically within groups
  const sortedFilteredPois = useMemo(() => {
    return sortPOIsByWantToVisit(filteredPois);
  }, [filteredPois]);

  // Use POI grouping to check accessibility
  const { getGroupForPOI, groups } = usePOIGrouping(sortedFilteredPois, userProfile);

  // POI display logic is now handled by usePOICache hook

  // Auto-scroll selected POI into view
  React.useEffect(() => {
    if (selectedPoiId) {
      const element = document.getElementById(`poi-item-${selectedPoiId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedPoiId]);

  // handleBoundsChange is now provided by usePOICache hook

  const handleZoomChange = useCallback((zoom) => {
    setCurrentZoom(zoom);
  }, []);

  // Reset highlighted city when user changes input value
  useEffect(() => {
    // If user changed the input value, reset highlighted city to allow re-generation
    if (highlightedCity && cityInputValue !== highlightedCity.displayName) {
      setHighlightedCity(null);
      resetResponse();
    }
  }, [cityInputValue, highlightedCity, resetResponse]);

  const handleCitySelect = useCallback((city) => {
    console.log('City selected:', city);
    if (city.boundingbox) {
      setSelectedCityBbox(city.boundingbox);
      // Mark that we just selected a city, so we can auto-search after zoom updates
      citySelectionRef.current = Date.now();
    }
    // Store selected city for AI highlights (don't close modal)
    setSelectedCity(city);
  }, []);

  // handleStartSelect and handleFinishSelect are now provided by useRouteState hook

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

  // clearRoutePoints is now provided by useRouteState hook

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
  // Route clearing on point changes is now handled by useRouteState hook

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
      // Extract full POI objects using utility function
      const pois = buildPOIListForRoute(
        routeStartPOI,
        routeData.intermediatePOIIds || [],
        routeFinishPOI,
        poiCache
      );

      // Create SavedRoute instance with full POI data
      const savedRoute = new SavedRoute({
        name: routeName.trim(),
        geometry: routeData.geometry,
        distance: routeData.distance,
        duration: routeData.duration,
        pois: pois,
        createdAt: Date.now(),
        instructions: routeData.instructions || []
      });

      // Add to user profile
      userProfile.addSavedRoute(savedRoute);

      // Save to localStorage using utility
      saveUserProfile(userProfile);
      
      // Reload profile from localStorage to trigger re-render
      const updatedProfile = loadUserProfile();
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

      // Reconstruct POIs using utility function
      const loadedPOIs = reconstructPOIsFromRoute(route, poiCache, userProfile);

      // Extract intermediate POI IDs (exclude start and finish)
      const intermediatePOIIds = loadedPOIs.length > 2 
        ? loadedPOIs.slice(1, -1).map(poi => String(poi.id))
        : [];

      // Set route data for display with intermediate POI IDs
      setRouteData({
        geometry: route.geometry,
        distance: route.distance,
        duration: route.duration,
        instructions: route.instructions,
        intermediatePOIIds: intermediatePOIIds
      });

      // Add new POIs to cache using utility
      const newPOIs = filterNewPOIs(loadedPOIs, poiCache);
      if (newPOIs.length > 0) {
        setPoiCache(prev => [...prev, ...newPOIs]);
      }

      // Set start and finish POIs
      if (loadedPOIs.length >= 2) {
        setRouteStartPOI(loadedPOIs[0]);
        setRouteFinishPOI(loadedPOIs[loadedPOIs.length - 1]);
      }

      // Calculate and set route bounds using utility
      const bounds = calculateRouteBounds(route.geometry);
      if (bounds) {
        setRouteBounds(bounds);
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
      const geojson = exportRouteToGeoJSON(route);
      downloadGeoJSON(geojson, route.name);
    } catch (error) {
      alert(`Error exporting GeoJSON: ${error.message}`);
    }
  }, []);

  // Handler to export route as KML
  const handleExportKML = useCallback((route, event) => {
    event.stopPropagation(); // Prevent route loading when clicking export button
    
    try {
      const kml = exportRouteToKML(route);
      downloadKML(kml, route.name);
    } catch (error) {
      alert(`Error exporting KML: ${error.message}`);
    }
  }, []);

  // Handler to delete a saved route
  const handleDeleteRoute = useCallback(() => {
    if (!routeToDelete || !userProfile) return;

    try {
      // Delete route from profile
      const success = userProfile.deleteSavedRoute(routeToDelete.name);
      
      if (success) {
        // Save updated profile to localStorage
        saveUserProfile(userProfile);
        
        // Reload profile from localStorage to trigger re-render
        const updatedProfile = loadUserProfile();
        setUserProfile(updatedProfile);
        
        // Close confirmation modal
        setRouteToDelete(null);
      } else {
        alert(`Route "${routeToDelete.name}" not found.`);
      }
    } catch (error) {
      alert(`Error deleting route: ${error.message}`);
    }
  }, [routeToDelete, userProfile]);

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

  // Actual toggle logic (separated for reuse in confirmation)
  const performWantToVisitToggle = useCallback((poi) => {
    if (!userProfile) return;
    
    // Toggle POI instance state
    poi.wantToVisit = !poi.wantToVisit;
    
    // Update profile
    if (poi.wantToVisit) {
      userProfile.addWantToVisit(poi);
    } else {
      userProfile.removeWantToVisit(poi.id);
    }
    
    // Save to localStorage and reload profile to trigger re-render using utility
    saveUserProfile(userProfile);
    const updatedProfile = loadUserProfile();
    setUserProfile(updatedProfile);
    
    // Force re-render of POI lists
    setPois([...pois]);
    setPoiCache([...poiCache]);
  }, [userProfile, pois, poiCache]);

  // Handler for toggling want to visit
  const handleToggleWantToVisit = useCallback((poi) => {
    if (!userProfile) return;
    
    const isAdding = !poi.wantToVisit;
    
    // If adding to "Want to Visit", check accessibility
    if (isAdding) {
      const group = getGroupForPOI(poi.id);
      
      // Generate warning message based on accessibility group
      let warningMessage = null;
      if (group === 'inaccessible') {
        warningMessage = 'This venue is not suitable for your mobility needs. Are you sure you want to visit it?';
      } else if (group === 'limitedAccessibility') {
        warningMessage = 'This venue has got limited accessibility for your mobility needs. Are you sure you want to visit it?';
      } else if (group === 'unknown') {
        warningMessage = "We don't know if this venue is suitable for your mobility needs. Are you sure you want to visit it?";
      }
      
      // If there's a warning, show modal instead of proceeding
      if (warningMessage) {
        setAccessibilityWarning({ poi, message: warningMessage });
        return;
      }
    }
    
    // If no warning or removing from "Want to Visit", proceed directly
    performWantToVisitToggle(poi);
  }, [userProfile, getGroupForPOI, performWantToVisitToggle]);

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
      // First time visitor - mark as visited
      localStorage.setItem('routePlannerVisited', 'true');
      console.log('First-time visitor - marking as visited');
      
      // Profile will be created by the first useEffect, so don't create it here
      
      // Show welcome modal
      setShowWelcomeModal(true);
    } else {
      // Returning user - show welcome modal on every visit
      setShowWelcomeModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

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
    showProfileModal,
    userProfile: userProfile ? {
      isComplete: userProfile.isComplete(),
      completionPercentage: userProfile.getCompletionPercentage(),
      savedRoutesCount: userProfile.getAllSavedRoutes?.().length || 0
    } : null,
    localStorage: localStorage.getItem('routePlannerVisited'),
    userProfileFromStorage: localStorage.getItem('userProfile') ? 'exists' : 'missing'
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

  // Open city selection modal
  const handleOpenCitySelection = useCallback(() => {
    setShowWelcomeModal(true);
  }, []);

  // Handle AI POI picking
  const handlePickPOIsWithAI = useCallback(async () => {
    if (!userProfile) {
      alert('Please create a user profile first');
      return;
    }

    // Validate time window and travel pace
    if (!userProfile.timeWindow || 
        userProfile.timeWindow.startHour === UNFILLED_MARKERS.NUMBER ||
        userProfile.timeWindow.endHour === UNFILLED_MARKERS.NUMBER ||
        !userProfile.travelPace ||
        userProfile.travelPace === UNFILLED_MARKERS.STRING) {
      alert('Please complete your profile first. Set your preferred time window and travel pace.');
      setShowProfileModal(true);
      return;
    }

    // Get accessible POIs from grouping
    const accessiblePOIs = groups.accessible || [];
    
    if (accessiblePOIs.length === 0) {
      alert('No accessible POIs found. Please find POIs on the map first.');
      return;
    }

    setIsPickingPOIs(true);

    try {
      // Call AI service with callback for downloadable model
      const selectedIds = await pickPOIsWithAI(accessiblePOIs, userProfile, async (promptAPI, sessionOptions) => {
        // Show modal and wait for user confirmation
        return new Promise((resolve, reject) => {
          setShowModelDownloadModal(true);
          setModelDownloadCallback(async () => {
            try {
              // User confirmed, download model
              await promptAPI.downloadModel(undefined, sessionOptions);
              setShowModelDownloadModal(false);
              setModelDownloadCallback(null);
              resolve();
            } catch (error) {
              setShowModelDownloadModal(false);
              setModelDownloadCallback(null);
              reject(error);
            }
          });
        });
      });
      
      if (!selectedIds || selectedIds.length === 0) {
        alert('AI could not select any POIs. Please try again.');
        setIsPickingPOIs(false);
        return;
      }

      // Find the actual POI objects
      const selectedPOIs = accessiblePOIs.filter(poi => 
        selectedIds.includes(String(poi.id))
      );

      // Check for inaccessible POIs (should not happen as we only send accessible ones)
      // But check anyway in case something changed
      const problematicPOIs = [];
      selectedPOIs.forEach(poi => {
        const group = getGroupForPOI(poi.id);
        if (group === 'inaccessible' || group === 'limitedAccessibility' || group === 'unknown') {
          problematicPOIs.push({ poi, group });
        }
      });

      // If there are problematic POIs, show warning modal
      if (problematicPOIs.length > 0) {
        setAiPickerWarning({
          pois: problematicPOIs,
          onConfirm: () => {
            // Mark all as Want to Visit
            selectedPOIs.forEach(poi => {
              performWantToVisitToggle(poi);
            });
            setAiPickerWarning(null);
            setIsPickingPOIs(false);
          }
        });
      } else {
        // No problems, add all directly
        selectedPOIs.forEach(poi => {
          performWantToVisitToggle(poi);
        });
        setIsPickingPOIs(false);
      }

    } catch (error) {
      console.error('Error picking POIs with AI:', error);
      
      // Show user-friendly error message
      let errorMessage = error.message;
      if (errorMessage.includes('not available')) {
        errorMessage = 
          'Chrome AI (Prompt API) is not available in your browser.\n\n' +
          'To use this feature:\n' +
          '1. Use Chrome Canary or Chrome Dev (version 138+)\n' +
          '2. Enable flags:\n' +
          '   • chrome://flags/#prompt-api-for-gemini-nano\n' +
          '   • chrome://flags/#optimization-guide-on-device-model\n' +
          '3. Restart your browser\n\n' +
          'Or manually select POIs by clicking the checkboxes.';
      }
      
      alert(`Failed to pick POIs with AI:\n\n${errorMessage}`);
      setIsPickingPOIs(false);
    }
  }, [userProfile, groups, getGroupForPOI, performWantToVisitToggle]);

  // Handle AI highlights request
  const handleGetAIHighlights = useCallback(async () => {
    if (!selectedCity) return;
    
    try {
      // Destroy existing session if it exists
      if (hasSession) {
        await destroySession();
      }
      
      // Create new session for this request
      await createSession();
      
      // Build prompt with city name
      const prompt = `Provide a short tourist summary in a few paragraphs (2-3) about what ${selectedCity.displayName} is famous for. Focus on the most well-known facts and the main reasons why tourists visit. Respond only with the summary text, without any comments or introductory lines.`;
      
      // Get streaming response
      const stream = await promptStreaming(prompt);
      await processStream(stream, {
        initialMessage: 'Generating highlights...'
      });
      
      // Mark this city as highlighted
      setHighlightedCity(selectedCity);
      
      // Destroy session after completion
      await destroySession();
    } catch (error) {
      console.error('Error getting AI highlights:', error);
      
      // Show user-friendly error message
      let errorMessage = error.message;
      if (errorMessage.includes('not available')) {
        errorMessage = 
          'Chrome AI (Prompt API) is not available in your browser.\n\n' +
          'To use this feature:\n' +
          '1. Use Chrome Canary or Chrome Dev (version 138+)\n' +
          '2. Enable flags:\n' +
          '   • chrome://flags/#prompt-api-for-gemini-nano\n' +
          '   • chrome://flags/#optimization-guide-on-device-model\n' +
          '3. Restart your browser';
      }
      
      alert(`Failed to get AI highlights:\n\n${errorMessage}`);
      
      // Try to clean up session even on error
      try {
        if (hasSession) {
          await destroySession();
        }
      } catch (cleanupError) {
        console.error('Error cleaning up session:', cleanupError);
      }
    }
  }, [selectedCity, hasSession, createSession, promptStreaming, processStream, destroySession]);

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh',
      gap: '0',
      overflow: 'hidden'
    }}>
      {/* Left Half - POI List */}
      <div style={{ 
        flex: '0 0 50%',
        padding: '20px',
        backgroundColor: '#f9f9f9',
        overflowY: 'hidden',
        borderRight: '2px solid #e0e0e0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Fixed top section with all controls */}
        <div style={{ flexShrink: 0 }}>
          {/* Profile Setup Button - show different states based on profile completion */}
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

        {/* Debug button for testing - remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={() => {
                localStorage.removeItem('routePlannerVisited');
                localStorage.removeItem('userProfile');
                setUserProfile(null);
                // Don't auto-open profile modal - let user open it manually
                window.location.reload(); // Reload to reset state
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

        <RoutePointSelector
          routeStartPOI={routeStartPOI}
          routeFinishPOI={routeFinishPOI}
          sameStartFinish={sameStartFinish}
          onStartSelect={handleStartSelect}
          onFinishSelect={handleFinishSelect}
          onSameStartFinishChange={handleSameStartFinishChange}
          onClear={clearRoutePoints}
          mapsAPI={mapsAPI}
        />

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
        <RouteInfoDisplay
          routeData={routeData}
          onSaveRoute={handleSaveRoute}
          poiCount={routeData?.intermediatePOIIds?.length || 0}
          travelPace={userProfile?.travelPace}
        />

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
        </div>

        {/* Scrollable POI List - takes remaining space */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {/* POI List with Accordion */}
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

            <button
              onClick={handlePickPOIsWithAI}
              disabled={isPickingPOIs || sortedFilteredPois.length === 0}
              style={{
                width: '100%',
                padding: '10px',
                marginBottom: '12px',
                fontSize: '14px',
                fontWeight: '500',
                backgroundColor: isPickingPOIs || sortedFilteredPois.length === 0 ? '#ccc' : '#9C27B0',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isPickingPOIs || sortedFilteredPois.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!isPickingPOIs && sortedFilteredPois.length > 0) {
                  e.target.style.backgroundColor = '#7B1FA2';
                }
              }}
              onMouseLeave={(e) => {
                if (!isPickingPOIs && sortedFilteredPois.length > 0) {
                  e.target.style.backgroundColor = '#9C27B0';
                }
              }}
            >
              {isPickingPOIs ? '⏳ AI is selecting Points Of Interest...' : '🤖 Pick Points Of Interest with AI'}
            </button>

            <POIAccordion
              pois={sortedFilteredPois}
              userProfile={userProfile}
              categoryColors={categoryColors}
              selectedPoiId={selectedPoiId}
              onPoiSelect={setSelectedPoiId}
              mapsAPI={mapsAPI}
              onImageLoaded={handleImageLoaded}
              onToggleWantToVisit={handleToggleWantToVisit}
            />
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
                    saveUserProfile(userProfile);
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
                  saveUserProfile(profile);
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Right Half - Interactive Map */}
      <div style={{ 
        flex: '0 0 50%',
        position: 'relative',
        height: '100%'
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
          defaultSelectedCityZoom={DEFAULT_SELECTED_CITY_ZOOM}
          poiError={poiError}
          hasPOIsInArea={filteredPois.length > 0}
          selectedCategories={selectedCategories}
          onCategoriesChange={setSelectedCategories}
          onApplyProfileInterests={applyProfileInterests}
          onSelectCity={handleOpenCitySelection}
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
        onClose={async () => {
          // Destroy PromptAPI session if it exists
          if (hasSession) {
            try {
              await destroySession();
            } catch (error) {
              console.error('Error destroying session on modal close:', error);
            }
          }
          
          setShowWelcomeModal(false);
          setSelectedCity(null);
          setHighlightedCity(null);
          setCityInputValue('');
          resetResponse();
        }}
        title="🗺️ Welcome to Route Planner!"
        style={{ minHeight: '100px' }}
      >
        <div style={{ padding: '20px 0', minHeight: '100px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px', color: '#333', textAlign: 'center' }}>
            Where would you like to go?
          </h3>
          
          <Autocomplete
            searchFunction={(query, limit) => mapsAPI.autocompleteCities(query, limit)}
            onSelect={(city) => {
              handleCitySelect(city);
              // Don't close modal - let user get AI highlights
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
            value={cityInputValue}
            onChange={setCityInputValue}
            keepValueOnSelect={true}
            getDisplayValue={(city) => city.displayName}
          />
          
          {selectedCity && (() => {
            // Check if highlights already generated for current city
            const alreadyHighlighted = highlightedCity && highlightedCity.displayName === selectedCity.displayName;
            const isButtonDisabled = isLoadingHighlights || alreadyHighlighted;
            
            return (
              <button
                onClick={handleGetAIHighlights}
                disabled={isButtonDisabled}
                style={{
                  width: '100%',
                  marginTop: '16px',
                  padding: '12px',
                  fontSize: '15px',
                  fontWeight: '500',
                  backgroundColor: isButtonDisabled ? '#ccc' : '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
                  transition: 'background-color 0.2s'
                }}
              >
                {isLoadingHighlights ? '⏳ Loading...' : alreadyHighlighted ? '✅ Highlights already generated' : '✨ Give me AI highlights'}
              </button>
            );
          })()}
          
          {aiHighlights && selectedCity && (
            <div style={{ marginTop: '16px' }}>
              <h4 style={{ marginTop: 0, marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                About {selectedCity.name}:
              </h4>
              <ResponseDisplay response={aiHighlights} />
            </div>
          )}
          
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
                  position: 'relative',
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
                {/* Delete button in top-right corner */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setRouteToDelete(route);
                  }}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    padding: '6px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'rgba(244, 67, 54, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                  title="Delete route"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#f44336"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>

                <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '4px', paddingRight: '30px' }}>
                  {route.name}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  Created: {new Date(route.createdAt).toLocaleDateString()}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  POIs: {route.pois?.length || 0} points
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
                  <button
                    onClick={(e) => handleExportKML(route, e)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      fontSize: '13px',
                      fontWeight: '500',
                      backgroundColor: '#FF9800',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#F57C00';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#FF9800';
                    }}
                  >
                    Export KML
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

      {/* Accessibility Warning Modal */}
      {accessibilityWarning && (
        <Modal
          isOpen={true}
          onClose={() => setAccessibilityWarning(null)}
          title="⚠️ Accessibility Warning"
        >
          <div style={{ padding: '20px 0' }}>
            <p style={{ 
              margin: '0 0 20px 0', 
              fontSize: '15px', 
              color: '#333',
              lineHeight: '1.5'
            }}>
              {accessibilityWarning.message}
            </p>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setAccessibilityWarning(null)}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#e0e0e0';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#f5f5f5';
                }}
              >
                No
              </button>
              <button
                onClick={() => {
                  // Confirm and proceed with adding to "Want to Visit"
                  performWantToVisitToggle(accessibilityWarning.poi);
                  setAccessibilityWarning(null);
                }}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#1976D2';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#2196F3';
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* AI Picker Warning Modal */}
      {aiPickerWarning && (
        <Modal
          isOpen={true}
          onClose={() => {
            setAiPickerWarning(null);
            setIsPickingPOIs(false);
          }}
          title="⚠️ Some POIs have accessibility concerns"
        >
          <div style={{ padding: '20px 0' }}>
            <p style={{ 
              margin: '0 0 12px 0', 
              fontSize: '15px', 
              color: '#333',
              lineHeight: '1.5'
            }}>
              The AI selected the following POIs with accessibility issues for your mobility type:
            </p>
            
            <ul style={{ 
              margin: '0 0 20px 0', 
              padding: '0 0 0 20px',
              fontSize: '14px',
              color: '#555'
            }}>
              {aiPickerWarning.pois.map(({ poi, group }) => {
                let status = '';
                if (group === 'inaccessible') status = 'Not accessible';
                else if (group === 'limitedAccessibility') status = 'Limited accessibility';
                else if (group === 'unknown') status = 'Unknown accessibility';
                
                return (
                  <li key={poi.id} style={{ marginBottom: '8px' }}>
                    <strong>{poi.name}</strong>
                    <span style={{ color: '#999', marginLeft: '8px' }}>({status})</span>
                  </li>
                );
              })}
            </ul>
            
            <p style={{ 
              margin: '0 0 20px 0', 
              fontSize: '14px', 
              color: '#666',
              lineHeight: '1.5'
            }}>
              Do you want to add all selected POIs to your "Want to Visit" list anyway?
            </p>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setAiPickerWarning(null);
                  setIsPickingPOIs(false);
                }}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#e0e0e0';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#f5f5f5';
                }}
              >
                Cancel
              </button>
              <button
                onClick={aiPickerWarning.onConfirm}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#1976D2';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#2196F3';
                }}
              >
                Add All Anyway
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Route Confirmation Modal */}
      {routeToDelete && (
        <Modal
          isOpen={true}
          onClose={() => setRouteToDelete(null)}
          title="🗑️ Delete Route"
        >
          <div style={{ padding: '20px 0' }}>
            <p style={{ 
              margin: '0 0 20px 0', 
              fontSize: '15px', 
              color: '#333',
              lineHeight: '1.5'
            }}>
              Are you sure you want to delete route <strong>"{routeToDelete.name}"</strong>?
            </p>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setRouteToDelete(null)}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#e0e0e0';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#f5f5f5';
                }}
              >
                No
              </button>
              <button
                onClick={handleDeleteRoute}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#d32f2f';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#f44336';
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Model Download Confirmation Modal */}
      {showModelDownloadModal && (
        <Modal
          isOpen={true}
          onClose={() => {
            setShowModelDownloadModal(false);
            setModelDownloadCallback(null);
            setIsPickingPOIs(false);
          }}
          title="📥 Download AI Model Required"
        >
          <div style={{ padding: '20px 0' }}>
            <p style={{ 
              margin: '0 0 20px 0', 
              fontSize: '15px', 
              color: '#333',
              lineHeight: '1.5'
            }}>
              To use AI-powered POI selection, the AI model needs to be downloaded to your device. 
              This will happen automatically after you click "Download".
            </p>
            
            <div style={{ 
              padding: '12px 16px',
              backgroundColor: '#e3f2fd',
              border: '1px solid #90caf9',
              borderRadius: '6px',
              marginBottom: '20px'
            }}>
              <p style={{ margin: 0, fontSize: '14px', color: '#1565c0' }}>
                ℹ️ The model will be cached on your device for future use.
              </p>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowModelDownloadModal(false);
                  setModelDownloadCallback(null);
                  setIsPickingPOIs(false);
                }}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: '#f5f5f5',
                  color: '#333',
                  border: '1px solid #ddd',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#e0e0e0';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#f5f5f5';
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (modelDownloadCallback) {
                    modelDownloadCallback();
                  }
                }}
                style={{
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#45a049';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#4CAF50';
                }}
              >
                Download
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
