/**
 * POI Filtering and Sorting Utilities
 */

/**
 * Check if a POI is within a bounding box
 * @param {Object} poi - POI object
 * @param {Object} bbox - Bounding box {minLat, maxLat, minLng, maxLng}
 * @returns {boolean} True if POI is in bbox
 */
export function isPoiInBbox(poi, bbox) {
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
}

/**
 * Filter POIs by selected categories
 * A POI is shown if it has at least one category in common with selectedCategories
 * @param {Array<Object>} pois - Array of POIs
 * @param {Array<string>} selectedCategories - Array of selected category names
 * @returns {Array<Object>} Filtered POIs
 */
export function filterPOIsByCategories(pois, selectedCategories) {
  if (!selectedCategories || selectedCategories.length === 0) {
    return pois;
  }
  
  return pois.filter(poi => {
    const poiCategories = poi.interest_categories || [];
    return poiCategories.some(cat => selectedCategories.includes(cat));
  });
}

/**
 * Sort POIs: wantToVisit first, then alphabetically within groups
 * @param {Array<Object>} pois - Array of POIs
 * @returns {Array<Object>} Sorted POIs (creates a new array)
 */
export function sortPOIsByWantToVisit(pois) {
  return [...pois].sort((a, b) => {
    // Selected POIs first
    if (a.wantToVisit && !b.wantToVisit) return -1;
    if (!a.wantToVisit && b.wantToVisit) return 1;
    
    // Alphabetically within groups
    return a.name.localeCompare(b.name);
  });
}

/**
 * Filter POIs by map bounds
 * @param {Array<Object>} pois - Array of POIs
 * @param {Object} bounds - Map bounds {minLat, maxLat, minLng, maxLng}
 * @returns {Array<Object>} POIs within bounds
 */
export function filterPOIsByBounds(pois, bounds) {
  if (!bounds) {
    return [];
  }
  
  return pois.filter(poi => isPoiInBbox(poi, bounds));
}

