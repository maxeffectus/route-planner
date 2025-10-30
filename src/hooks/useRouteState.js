import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Hook for managing route state
 * Handles route points, route data, loading/error states
 */
export function useRouteState() {
  const [routeStartPOI, setRouteStartPOI] = useState(null);
  const [routeFinishPOI, setRouteFinishPOI] = useState(null);
  const [sameStartFinish, setSameStartFinish] = useState(false);
  const [routeData, setRouteData] = useState(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState(null);
  const [routeBounds, setRouteBounds] = useState(null);
  const isLoadingSavedRouteRef = useRef(false);

  // Handler for start point selection
  const handleStartSelect = useCallback((poi) => {
    console.log('Start point selected:', poi);
    setRouteStartPOI(poi);
  }, []);

  // Handler for finish point selection
  const handleFinishSelect = useCallback((poi) => {
    console.log('Finish point selected:', poi);
    setRouteFinishPOI(poi);
  }, []);

  // Handler for same start/finish checkbox
  const handleSameStartFinishChange = useCallback((checked) => {
    setSameStartFinish(checked);
    if (checked && routeStartPOI) {
      setRouteFinishPOI(routeStartPOI);
    } else if (!checked) {
      setRouteFinishPOI(null);
    }
  }, [routeStartPOI]);

  // Clear route points
  const clearRoutePoints = useCallback(() => {
    setRouteStartPOI(null);
    setRouteFinishPOI(null);
    setSameStartFinish(false);
    setRouteData(null);
  }, []);

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

  return {
    // State
    routeStartPOI,
    routeFinishPOI,
    sameStartFinish,
    routeData,
    isLoadingRoute,
    routeError,
    routeBounds,
    isLoadingSavedRouteRef,
    
    // Setters
    setRouteStartPOI,
    setRouteFinishPOI,
    setSameStartFinish,
    setRouteData,
    setIsLoadingRoute,
    setRouteError,
    setRouteBounds,
    
    // Handlers
    handleStartSelect,
    handleFinishSelect,
    handleSameStartFinishChange,
    clearRoutePoints
  };
}

