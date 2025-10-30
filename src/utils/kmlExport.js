/**
 * KML Export Utilities
 * Handles conversion of routes and POIs to KML format for Google Maps
 */

/**
 * Escape XML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

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
 * Create KML ExtendedData element for a POI
 * @param {Object} poi - POI object with metadata
 * @param {number} index - Index in the route
 * @param {number} totalPOIs - Total number of POIs
 * @returns {string} KML ExtendedData XML
 */
function createPOIExtendedData(poi, index, totalPOIs) {
  const poiType = index === 0 ? 'start' : (index === totalPOIs - 1 ? 'finish' : 'waypoint');
  const category = poi.interest_categories?.join(', ') || 'Unknown';
  const wikipediaUrl = poi.wikipedia ? getWikipediaUrl(poi.wikipedia) : null;
  
  let extendedData = '      <ExtendedData>\n';
  
  // Category
  extendedData += `        <Data name="category">\n`;
  extendedData += `          <value>${escapeXml(category)}</value>\n`;
  extendedData += `        </Data>\n`;
  
  // POI Type
  extendedData += `        <Data name="poi_type">\n`;
  extendedData += `          <value>${escapeXml(poiType)}</value>\n`;
  extendedData += `        </Data>\n`;
  
  // Sequence
  extendedData += `        <Data name="sequence">\n`;
  extendedData += `          <value>${index + 1}</value>\n`;
  extendedData += `        </Data>\n`;
  
  // POI ID
  extendedData += `        <Data name="poi_id">\n`;
  extendedData += `          <value>${escapeXml(String(poi.id))}</value>\n`;
  extendedData += `        </Data>\n`;
  
  // Website (if available)
  if (poi.website) {
    extendedData += `        <Data name="website">\n`;
    extendedData += `          <value>${escapeXml(poi.website)}</value>\n`;
    extendedData += `        </Data>\n`;
  }
  
  // Wikipedia (if available)
  if (wikipediaUrl) {
    extendedData += `        <Data name="wikipedia">\n`;
    extendedData += `          <value>${escapeXml(wikipediaUrl)}</value>\n`;
    extendedData += `        </Data>\n`;
  }
  
  // Icon URL (if available)
  if (poi.imageUrl) {
    extendedData += `        <Data name="icon_url">\n`;
    extendedData += `          <value>${escapeXml(poi.imageUrl)}</value>\n`;
    extendedData += `        </Data>\n`;
  }
  
  extendedData += '      </ExtendedData>\n';
  
  return extendedData;
}

/**
 * Create KML Placemark for a POI
 * @param {Object} poi - POI object with metadata
 * @param {number} index - Index in the route
 * @param {number} totalPOIs - Total number of POIs
 * @returns {string} KML Placemark XML
 */
function createPOIPlacemark(poi, index, totalPOIs) {
  if (!poi.location || !poi.location.lat || !poi.location.lng) {
    return '';
  }
  
  const poiType = index === 0 ? 'start' : (index === totalPOIs - 1 ? 'finish' : 'waypoint');
  
  // Create description with links
  let description = escapeXml(poi.description || poi.name);
  if (poi.website || poi.wikipedia) {
    description += '\\n\\nLinks:\\n';
    if (poi.website) {
      description += `Website: ${escapeXml(poi.website)}\\n`;
    }
    if (poi.wikipedia) {
      const wikipediaUrl = getWikipediaUrl(poi.wikipedia);
      description += `Wikipedia: ${escapeXml(wikipediaUrl)}\\n`;
    }
  }
  
  let placemark = '    <Placemark>\n';
  placemark += `      <name>${escapeXml(poi.name)}</name>\n`;
  placemark += `      <description>${description}</description>\n`;
  
  // Add style for different POI types
  if (poiType === 'start') {
    placemark += '      <styleUrl>#startStyle</styleUrl>\n';
  } else if (poiType === 'finish') {
    placemark += '      <styleUrl>#finishStyle</styleUrl>\n';
  } else {
    placemark += '      <styleUrl>#waypointStyle</styleUrl>\n';
  }
  
  placemark += '      <Point>\n';
  // KML uses lon,lat,altitude format
  placemark += `        <coordinates>${poi.location.lng},${poi.location.lat},0</coordinates>\n`;
  placemark += '      </Point>\n';
  
  placemark += createPOIExtendedData(poi, index, totalPOIs);
  
  placemark += '    </Placemark>\n';
  
  return placemark;
}

/**
 * Create KML Placemark for route LineString
 * @param {Object} route - SavedRoute instance
 * @returns {string} KML Placemark XML
 */
function createRoutePlacemark(route) {
  let placemark = '    <Placemark>\n';
  placemark += `      <name>${escapeXml(route.name)}</name>\n`;
  
  // Create description with route info
  const distanceKm = (route.distance / 1000).toFixed(2);
  const durationMin = Math.round(route.duration / 1000 / 60);
  const createdDate = new Date(route.createdAt).toLocaleDateString();
  
  const description = `Distance: ${distanceKm} km\\nDuration: ${durationMin} minutes\\nPOIs: ${route.pois?.length || 0} points\\nCreated: ${createdDate}`;
  placemark += `      <description>${description}</description>\n`;
  
  placemark += '      <styleUrl>#routeStyle</styleUrl>\n';
  
  placemark += '      <LineString>\n';
  placemark += '        <tessellate>1</tessellate>\n';
  placemark += '        <coordinates>\n';
  
  // Convert GeoJSON coordinates to KML format (lon,lat,altitude)
  if (route.geometry && route.geometry.coordinates) {
    route.geometry.coordinates.forEach(coord => {
      // GeoJSON is [lon, lat], KML is lon,lat,altitude
      placemark += `          ${coord[0]},${coord[1]},0\n`;
    });
  }
  
  placemark += '        </coordinates>\n';
  placemark += '      </LineString>\n';
  
  // Add extended data for route
  placemark += '      <ExtendedData>\n';
  placemark += `        <Data name="distance">\n`;
  placemark += `          <value>${route.distance}</value>\n`;
  placemark += `        </Data>\n`;
  placemark += `        <Data name="duration">\n`;
  placemark += `          <value>${route.duration}</value>\n`;
  placemark += `        </Data>\n`;
  placemark += `        <Data name="poi_count">\n`;
  placemark += `          <value>${route.pois?.length || 0}</value>\n`;
  placemark += `        </Data>\n`;
  placemark += '      </ExtendedData>\n';
  
  placemark += '    </Placemark>\n';
  
  return placemark;
}

/**
 * Create KML styles for different marker types
 * @returns {string} KML Style XML
 */
function createStyles() {
  let styles = '';
  
  // Route style
  styles += '  <Style id="routeStyle">\n';
  styles += '    <LineStyle>\n';
  styles += '      <color>ff0000ff</color>\n'; // Red in KML AABBGGRR format
  styles += '      <width>4</width>\n';
  styles += '    </LineStyle>\n';
  styles += '  </Style>\n';
  
  // Start point style (green)
  styles += '  <Style id="startStyle">\n';
  styles += '    <IconStyle>\n';
  styles += '      <color>ff00ff00</color>\n'; // Green
  styles += '      <scale>1.3</scale>\n';
  styles += '      <Icon>\n';
  styles += '        <href>http://maps.google.com/mapfiles/kml/paddle/grn-circle.png</href>\n';
  styles += '      </Icon>\n';
  styles += '    </IconStyle>\n';
  styles += '  </Style>\n';
  
  // Finish point style (red)
  styles += '  <Style id="finishStyle">\n';
  styles += '    <IconStyle>\n';
  styles += '      <color>ff0000ff</color>\n'; // Red
  styles += '      <scale>1.3</scale>\n';
  styles += '      <Icon>\n';
  styles += '        <href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href>\n';
  styles += '      </Icon>\n';
  styles += '    </IconStyle>\n';
  styles += '  </Style>\n';
  
  // Waypoint style (yellow)
  styles += '  <Style id="waypointStyle">\n';
  styles += '    <IconStyle>\n';
  styles += '      <color>ff00ffff</color>\n'; // Yellow
  styles += '      <scale>1.1</scale>\n';
  styles += '      <Icon>\n';
  styles += '        <href>http://maps.google.com/mapfiles/kml/paddle/ylw-circle.png</href>\n';
  styles += '      </Icon>\n';
  styles += '    </IconStyle>\n';
  styles += '  </Style>\n';
  
  return styles;
}

/**
 * Export a saved route to KML format
 * @param {Object} route - SavedRoute instance with POI metadata
 * @returns {string} KML XML string
 */
export function exportRouteToKML(route) {
  if (!route || !route.geometry) {
    throw new Error('Invalid route: missing geometry');
  }
  
  if (!route.pois || route.pois.length === 0) {
    throw new Error('Invalid route: missing POI data. Cannot export route without POI metadata.');
  }
  
  let kml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  kml += '<kml xmlns="http://www.opengis.net/kml/2.2">\n';
  kml += '  <Document>\n';
  kml += `    <name>${escapeXml(route.name)}</name>\n`;
  kml += `    <description>Route exported from Route Planner</description>\n`;
  
  // Add styles
  kml += createStyles();
  
  // Add route LineString
  kml += createRoutePlacemark(route);
  
  // Add POI markers
  route.pois.forEach((poi, index) => {
    kml += createPOIPlacemark(poi, index, route.pois.length);
  });
  
  kml += '  </Document>\n';
  kml += '</kml>\n';
  
  return kml;
}

/**
 * Download KML as a file
 * @param {string} kml - KML XML string
 * @param {string} filename - Desired filename (without extension)
 */
export function downloadKML(kml, filename) {
  const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename.replace(/[^a-z0-9]/gi, '_')}.kml`;
  a.click();
  URL.revokeObjectURL(url);
}

