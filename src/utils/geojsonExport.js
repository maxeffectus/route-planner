/**
 * GeoJSON Export Utilities
 * Handles conversion of routes and POIs to GeoJSON format
 */

/**
 * Convert Wikipedia field to full URL
 * @param {string} wikipedia - Wikipedia field (e.g., "en:Article_Name")
 * @returns {string|null} Full Wikipedia URL or null
 */
function getWikipediaUrl(wikipedia) {
  if (!wikipedia) return null;
  
  if (wikipedia.includes(':')) {
    const [language, article] = wikipedia.split(':', 2);
    return `https://${language}.wikipedia.org/wiki/${article}`;
  }
  
  return `https://en.wikipedia.org/wiki/${wikipedia}`;
}

/**
 * Create a GeoJSON Feature for a route LineString
 * @param {Object} route - SavedRoute instance
 * @returns {Object} GeoJSON Feature
 */
function createRouteFeature(route) {
  return {
    type: "Feature",
    properties: {
      name: route.name,
      distance: route.distance,
      duration: route.duration,
      poiCount: route.pois?.length || 0,
      createdAt: new Date(route.createdAt).toISOString(),
      feature_type: 'route'
    },
    geometry: route.geometry
  };
}

/**
 * Create a GeoJSON Feature for a POI Point
 * @param {Object} poi - POI object with metadata
 * @param {number} index - Index in the route
 * @param {number} totalPOIs - Total number of POIs
 * @returns {Object} GeoJSON Feature
 */
function createPOIFeature(poi, index, totalPOIs) {
  if (!poi.location || !poi.location.lat || !poi.location.lng) {
    return null;
  }
  
  // Determine POI type based on position
  const poiType = index === 0 ? 'start' : (index === totalPOIs - 1 ? 'finish' : 'waypoint');
  
  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [poi.location.lng, poi.location.lat]
    },
    properties: {
      name: poi.name,
      description: poi.description || poi.name,
      category: poi.interest_categories?.join(', ') || 'Unknown',
      icon_url: poi.imageUrl || null,
      website: poi.website || null,
      wikipedia: poi.wikipedia ? getWikipediaUrl(poi.wikipedia) : null,
      poi_id: poi.id,
      poi_type: poiType,
      sequence: index + 1
    }
  };
}

/**
 * Export a saved route to GeoJSON format
 * @param {Object} route - SavedRoute instance with POI metadata
 * @returns {Object} GeoJSON FeatureCollection
 */
export function exportRouteToGeoJSON(route) {
  if (!route || !route.geometry) {
    throw new Error('Invalid route: missing geometry');
  }
  
  if (!route.pois || route.pois.length === 0) {
    throw new Error('Invalid route: missing POI data. Cannot export route without POI metadata.');
  }
  
  const features = [];
  
  // Add route LineString feature
  features.push(createRouteFeature(route));
  
  // Add POI Point features
  route.pois.forEach((poi, index) => {
    const poiFeature = createPOIFeature(poi, index, route.pois.length);
    if (poiFeature) {
      features.push(poiFeature);
    }
  });
  
  return {
    type: "FeatureCollection",
    features: features
  };
}

/**
 * Download GeoJSON as a file
 * @param {Object} geojson - GeoJSON FeatureCollection
 * @param {string} filename - Desired filename (without extension)
 */
export function downloadGeoJSON(geojson, filename) {
  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename.replace(/[^a-z0-9]/gi, '_')}.geojson`;
  a.click();
  URL.revokeObjectURL(url);
}

