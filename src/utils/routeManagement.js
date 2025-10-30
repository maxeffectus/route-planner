/**
 * Route Management Utilities
 * Handles route-related operations like saving, loading, and POI extraction
 */

import { OpenStreetPOI } from '../models/POI';

/**
 * Extract POI data for storage
 * @param {Object} poi - POI object
 * @returns {Object|null} Extracted POI data or null
 */
export function extractPOIData(poi) {
  if (!poi) return null;
  
  // Check if POI has toJSON method (OpenStreetPOI instance)
  if (typeof poi.toJSON === 'function') {
    return poi.toJSON();
  }
  
  // Otherwise, extract manually but include allTags if available
  return {
    id: poi.id,
    name: poi.name,
    location: poi.location,
    interest_categories: poi.interest_categories || [],
    description: poi.description || poi.name,
    website: poi.website || null,
    wikipedia: poi.wikipedia || null,
    imageUrl: poi.imageUrl || poi.resolvedImageUrl || null,
    type: poi.type || null,
    osmType: poi.osmType || null,
    osmId: poi.osmId || null,
    allTags: poi.allTags || {}
  };
}

/**
 * Build POI list for route in correct order
 * @param {Object} routeStartPOI - Start POI
 * @param {Array<string>} intermediatePOIIds - Intermediate POI IDs
 * @param {Object} routeFinishPOI - Finish POI
 * @param {Array<Object>} poiCache - POI cache
 * @returns {Array<Object>} Array of POI data objects
 */
export function buildPOIListForRoute(routeStartPOI, intermediatePOIIds, routeFinishPOI, poiCache) {
  const pois = [];
  
  // Start POI
  if (routeStartPOI) {
    const poiData = extractPOIData(routeStartPOI);
    if (poiData) pois.push(poiData);
  }
  
  // Add intermediate POIs (already in correct order from route building)
  if (intermediatePOIIds && intermediatePOIIds.length > 0) {
    intermediatePOIIds.forEach(poiId => {
      // Find full POI object from cache
      const poi = poiCache.find(p => String(p.id) === String(poiId));
      if (poi) {
        const poiData = extractPOIData(poi);
        if (poiData) pois.push(poiData);
      }
    });
  }
  
  // Finish POI
  if (routeFinishPOI) {
    const poiData = extractPOIData(routeFinishPOI);
    if (poiData) pois.push(poiData);
  }
  
  return pois;
}

/**
 * Calculate bounding box from route geometry
 * @param {Object} geometry - GeoJSON geometry object
 * @returns {Object|null} Bounding box {minLat, maxLat, minLng, maxLng} or null
 */
export function calculateRouteBounds(geometry) {
  if (!geometry || !geometry.coordinates || geometry.coordinates.length === 0) {
    return null;
  }
  
  const coords = geometry.coordinates;
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
  
  return { minLat, maxLat, minLng, maxLng };
}

/**
 * Reconstruct POIs from saved route
 * @param {Object} route - SavedRoute instance
 * @param {Array<Object>} poiCache - Current POI cache
 * @param {Object} userProfile - User profile
 * @returns {Array<Object>} Array of reconstructed POI objects
 */
export function reconstructPOIsFromRoute(route, poiCache, userProfile) {
  if (!route.pois || route.pois.length === 0) {
    throw new Error('Route does not contain POI data. Cannot load route.');
  }
  
  const loadedPOIs = [];
  
  route.pois.forEach(poiData => {
    // Check if POI already exists in cache
    let poi = poiCache.find(p => String(p.id) === String(poiData.id));
    
    if (poi) {
      // Use cached POI (it has full OpenStreetPOI methods)
      poi.wantToVisit = true;
    } else {
      // Create OpenStreetPOI from saved data to get all methods
      poi = new OpenStreetPOI({
        id: poiData.id,
        name: poiData.name,
        location: poiData.location,
        description: poiData.description || poiData.name,
        interest_categories: poiData.interest_categories || [],
        website: poiData.website || null,
        wikipedia: poiData.wikipedia || null,
        imageUrl: poiData.imageUrl || null,
        type: poiData.type || null,
        osmType: poiData.osmType || null,
        osmId: poiData.osmId || null,
        allTags: poiData.allTags || {},
        wantToVisit: true
      });
    }
    
    // Make sure it's in the profile's wantToVisit
    if (userProfile && !userProfile.isWantToVisit(poiData.id)) {
      userProfile.addWantToVisit(poi);
    }
    
    loadedPOIs.push(poi);
  });
  
  return loadedPOIs;
}

/**
 * Add new POIs to cache (avoiding duplicates)
 * @param {Array<Object>} newPOIs - New POIs to add
 * @param {Array<Object>} existingCache - Existing POI cache
 * @returns {Array<Object>} Filtered new POIs that are not in cache
 */
export function filterNewPOIs(newPOIs, existingCache) {
  const existingIds = new Set(existingCache.map(p => String(p.id)));
  return newPOIs.filter(p => !existingIds.has(String(p.id)));
}

