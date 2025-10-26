import noImagePlaceholder from '../static_resources/no_image_placeholder.png';
import { OpenStreetPOI } from '../models/POI';
import { InterestCategory } from '../models/UserProfile';

/**
 * Base class for Maps API integrations
 * Provides common interface for different map providers
 */
export class MapsAPI {
  constructor(apiKey) {
    if (this.constructor === MapsAPI) {
      throw new Error('MapsAPI is an abstract class and cannot be instantiated directly');
    }
    this.apiKey = apiKey;
  }

  /**
   * Calculate route between multiple waypoints
   * @param {Array<{lat: number, lng: number}>} waypoints - Array of coordinates
   * @param {Object} options - Route calculation options
   * @returns {Promise<Object>} Route data
   */
  async calculateRoute(waypoints, options = {}) {
    throw new Error('calculateRoute() must be implemented by subclass');
  }

  /**
   * Geocode an address to coordinates
   * @param {string} address - Address to geocode
   * @returns {Promise<{lat: number, lng: number}>} Coordinates
   */
  async geocodeAddress(address) {
    throw new Error('geocodeAddress() must be implemented by subclass');
  }

  /**
   * Reverse geocode coordinates to address
   * @param {number} lat - Latitude
   * @param {number} lng - Longitude
   * @returns {Promise<string>} Address
   */
  async reverseGeocode(lat, lng) {
    throw new Error('reverseGeocode() must be implemented by subclass');
  }

  /**
   * Get distance matrix between origins and destinations
   * @param {Array<{lat: number, lng: number}>} origins - Origin points
   * @param {Array<{lat: number, lng: number}>} destinations - Destination points
   * @param {Object} options - Distance matrix options
   * @returns {Promise<Object>} Distance matrix data
   */
  async getDistanceMatrix(origins, destinations, options = {}) {
    throw new Error('getDistanceMatrix() must be implemented by subclass');
  }

  /**
   * Search for places near a location
   * @param {string} query - Search query
   * @param {Object} location - Center point {lat, lng}
   * @param {number} radius - Search radius in meters
   * @returns {Promise<Array>} Array of places
   */
  async searchPlaces(query, location, radius) {
    throw new Error('searchPlaces() must be implemented by subclass');
  }

  /**
   * Validate API key
   * @returns {Promise<boolean>} True if valid
   */
  async validateApiKey() {
    throw new Error('validateApiKey() must be implemented by subclass');
  }

  /**
   * Get provider name
   * @returns {string} Provider name
   */
  getProviderName() {
    throw new Error('getProviderName() must be implemented by subclass');
  }

  /**
   * Autocomplete city names as user types
   * @param {string} query - Partial city name
   * @param {number} limit - Max number of suggestions
   * @returns {Promise<Array>} Array of city suggestions
   */
  async autocompleteCities(query, limit = 10) {
    throw new Error('autocompleteCities() must be implemented by subclass');
  }

  /**
   * Get static map image URL
   * @param {Object} options - Map options
   * @param {Object} options.center - Center point {lat, lng}
   * @param {number} options.zoom - Zoom level (1-20)
   * @param {Object} options.bbox - Bounding box {minLat, minLng, maxLat, maxLng}
   * @param {Object} options.size - Image size {width, height}
   * @param {Array} options.markers - Optional array of markers [{lat, lng, color}]
   * @returns {string} URL to static map image
   */
  getStaticMapUrl(options) {
    throw new Error('getStaticMapUrl() must be implemented by subclass');
  }

  /**
   * Get Points of Interest (POI) in an area
   * @param {Object} bbox - Bounding box {minLat, minLng, maxLat, maxLng}
   * @param {number} limit - Maximum number of results
   * @param {Array<string>} categories - POI categories to search for
   * @returns {Promise<Array>} Array of POIs with name, type, location, etc.
   */
  async getPOI(bbox, limit = 50, categories = [InterestCategory.HISTORY_CULTURE, InterestCategory.ART_MUSEUMS, InterestCategory.ARCHITECTURE, InterestCategory.NATURE_PARKS, InterestCategory.ENTERTAINMENT, InterestCategory.GASTRONOMY]) {
    throw new Error('getPOI() must be implemented by subclass');
  }
}


/**
 * OpenStreetMap API implementation
 */
export class OpenStreetAPI extends MapsAPI {
  constructor(apiKey = null) {
    super(apiKey);
    this.baseUrl = 'https://nominatim.openstreetmap.org';
    this.routingUrl = 'https://router.project-osrm.org';
    // Request queue for Wikidata to avoid rate limiting
    this.wikidataQueue = [];
    this.isProcessingQueue = false;
    this.requestDelay = 500; // ms between requests
    // Cache for failed Wikidata requests to avoid retrying
    this.failedWikidataIds = new Set();
  }

  /**
   * Determine POI interest categories from OSM element tags
   * Returns an array of InterestCategory values that the POI belongs to
   * A POI can belong to multiple categories (e.g., a bar that is also entertainment venue)
   * @param {Object} element - OSM element with tags
   * @returns {Array<InterestCategory>} Array of interest categories
   * @private
   */
  #determinePOIInterestCategories(element) {
    const categories = [];
    
    // Check for Art & Museums
    if (element.tags?.tourism === 'museum' || 
        element.tags?.tourism === 'gallery' || 
        element.tags?.amenity === 'arts_centre') {
      categories.push(InterestCategory.ART_MUSEUMS);
    }
    
    // Check for Architecture
    if (element.tags?.amenity === 'place_of_worship' || 
        element.tags?.building?.match(/cathedral|church|mosque|temple|castle|palace/)) {
      categories.push(InterestCategory.ARCHITECTURE);
    }
    
    // Check for Nature & Parks
    if (element.tags?.leisure?.match(/park|garden/) || 
        element.tags?.tourism === 'viewpoint' ||
        element.tags?.natural?.match(/beach|cave|peak/)) {
      categories.push(InterestCategory.NATURE_PARKS);
    }
    
    // Check for Entertainment
    if (element.tags?.tourism === 'attraction' || 
        element.tags?.amenity?.match(/cinema|theatre|casino/)) {
      categories.push(InterestCategory.ENTERTAINMENT);
    }
    
    // Check for Gastronomy
    if (element.tags?.amenity?.match(/restaurant|cafe|bar|pub|food_court/) ||
        element.tags?.shop?.match(/bakery|butcher|seafood|wine|alcohol/)) {
      categories.push(InterestCategory.GASTRONOMY);
    }
    
    // Check for Nightlife
    if (element.tags?.amenity?.match(/bar|pub|nightclub/) ||
        element.tags?.leisure?.match(/adult_gaming_centre|casino/)) {
      categories.push(InterestCategory.NIGHTLIFE);
    }
    
    // Check for History & Culture
    if (element.tags?.historic) {
      categories.push(InterestCategory.HISTORY_CULTURE);
    }
    
    // Default: if no categories were assigned, use HISTORY_CULTURE
    if (categories.length === 0) {
      categories.push(InterestCategory.HISTORY_CULTURE);
    }
    
    return categories;
  }

  getProviderName() {
    return 'OpenStreetMap';
  }

  async calculateRoute(waypoints, options = {}) {
    // Format waypoints for OSRM
    const coordinates = waypoints
      .map(point => `${point.lng},${point.lat}`)
      .join(';');
    
    const url = `${this.routingUrl}/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.code !== 'Ok') {
        throw new Error(`Route calculation failed: ${data.message}`);
      }
      
      return {
        distance: data.routes[0].distance, // meters
        duration: data.routes[0].duration, // seconds
        geometry: data.routes[0].geometry,
        legs: data.routes[0].legs
      };
    } catch (error) {
      throw new Error(`OpenStreetMap route error: ${error.message}`);
    }
  }

  async geocodeAddress(address) {
    const url = `${this.baseUrl}/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data || data.length === 0) {
        throw new Error('Address not found');
      }
      
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    } catch (error) {
      throw new Error(`OpenStreetMap geocoding error: ${error.message}`);
    }
  }

  async reverseGeocode(lat, lng) {
    const url = `${this.baseUrl}/reverse?lat=${lat}&lon=${lng}&format=json`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data || !data.display_name) {
        throw new Error('Location not found');
      }
      
      return data.display_name;
    } catch (error) {
      throw new Error(`OpenStreetMap reverse geocoding error: ${error.message}`);
    }
  }

  async getDistanceMatrix(origins, destinations, options = {}) {
    // OpenStreetMap doesn't have a built-in distance matrix API
    // Calculate using OSRM for each origin-destination pair
    const results = [];
    
    for (const origin of origins) {
      const row = [];
      for (const destination of destinations) {
        try {
          const route = await this.calculateRoute([origin, destination], options);
          row.push({
            distance: route.distance,
            duration: route.duration
          });
        } catch (error) {
          row.push({ error: error.message });
        }
      }
      results.push(row);
    }
    
    return {
      origins,
      destinations,
      rows: results
    };
  }

  async searchPlaces(query, location, radius) {
    // Nominatim doesn't have a native radius parameter, but we can use:
    // 1. viewbox + bounded to limit search area
    // 2. Or we manually filter, which gives us more control
    
    /**
     * Raw OpenStreetMap/Nominatim place data format (real example):
     * {
     *   "place_id": 133115363,
     *   "licence": "Data © OpenStreetMap contributors, ODbL 1.0. http://osm.org/copyright",
     *   "osm_type": "node",
     *   "osm_id": 437612731,
     *   "lat": "52.5205315",
     *   "lon": "13.4051631",
     *   "class": "amenity",
     *   "type": "restaurant",
     *   "place_rank": 30,
     *   "importance": 0.00008875486381318407,
     *   "addresstype": "amenity",
     *   "name": "BLOCK HOUSE",
     *   "display_name": "BLOCK HOUSE, 7, Karl-Liebknecht-Straße, Nikolaiviertel, Friedrichswerder, Митте, Berlin, 10178, Germany",
     *   "boundingbox": ["52.5204815", "52.5205815", "13.4051131", "13.4052131"]
     * }
     * 
     * Note: Some results may have additional fields like "icon", "address", etc.
     */

    
    // Calculate bounding box from center point and radius
    const radiusInDegrees = radius / 111320; // Convert meters to degrees (approximate)
    const minLat = location.lat - radiusInDegrees;
    const maxLat = location.lat + radiusInDegrees;
    const minLon = location.lng - radiusInDegrees;
    const maxLon = location.lng + radiusInDegrees;
    
    // Using viewbox with bounded=1 to restrict results to the area
    const url = `${this.baseUrl}/search?` +
      `q=${encodeURIComponent(query)}` +
      `&format=json` +
      `&limit=50` + // Get more results to filter
      `&viewbox=${minLon},${maxLat},${maxLon},${minLat}` +
      `&bounded=1`; // Restrict results to viewbox
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      // Still calculate distances for accurate filtering and sorting
      const results = data.map(place => {
        const placeLat = parseFloat(place.lat);
        const placeLon = parseFloat(place.lon);
        
        // Calculate distance using Haversine formula
        const R = 6371e3; // Earth's radius in meters
        const φ1 = location.lat * Math.PI / 180;
        const φ2 = placeLat * Math.PI / 180;
        const Δφ = (placeLat - location.lat) * Math.PI / 180;
        const Δλ = (placeLon - location.lng) * Math.PI / 180;
        
        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        
        return {
          name: place.display_name,
          location: {
            lat: placeLat,
            lng: placeLon
          },
          type: place.type,
          importance: place.importance,
          distance: Math.round(distance) // distance in meters
        };
      }).filter(place => place.distance <= radius); // Ensure within exact radius
      
      // Sort by distance (closest first)
      return results.sort((a, b) => a.distance - b.distance).slice(0, 10);
    } catch (error) {
      throw new Error(`OpenStreetMap search error: ${error.message}`);
    }
  }

  async validateApiKey() {
    // OpenStreetMap doesn't require API key for basic usage
    return true;
  }

  /**
   * Autocomplete city names as user types
   * @param {string} query - Partial city name
   * @param {number} limit - Max number of suggestions (default: 10)
   * @returns {Promise<Array>} Array of city suggestions
   */
  async autocompleteCities(query, limit = 10) {
    /**
     * Using Nominatim's search WITHOUT class restriction
     * to get broader results, then filter on our end
     */
    const url = `${this.baseUrl}/search?` +
      `q=${encodeURIComponent(query)}` +
      `&format=json` +
      `&limit=50` + // Get more results to filter
      `&addressdetails=1`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      console.log('Raw Nominatim results for "' + query + '":', data.length, 'results');
      if (data.length > 0) {
        console.log(data.map(p => ({
          name: p.name,
          type: p.type,
          class: p.class,
          display_name: p.display_name
        })));
      }
      
      // Filter to only cities/towns/villages and format response
      const cities = data
        .filter(place => {
          // Accept place types that are settlements
          const validPlaceTypes = ['city', 'town', 'village', 'hamlet', 'municipality', 'borough'];
          
          // Accept boundary types that represent cities (ceremonial, administrative)
          const validBoundaryTypes = ['ceremonial', 'administrative'];
          
          // Check if it's a valid place OR a city boundary
          const isValidPlace = place.class === 'place' && validPlaceTypes.includes(place.type);
          const isValidBoundary = place.class === 'boundary' && validBoundaryTypes.includes(place.type);
          
          return isValidPlace || isValidBoundary;
        })
        .map(place => ({
          name: place.name || place.display_name.split(',')[0],
          displayName: place.display_name,
          location: {
            lat: parseFloat(place.lat),
            lng: parseFloat(place.lon)
          },
          boundingbox: place.boundingbox ? {
            minLat: parseFloat(place.boundingbox[0]),
            maxLat: parseFloat(place.boundingbox[1]),
            minLng: parseFloat(place.boundingbox[2]),
            maxLng: parseFloat(place.boundingbox[3])
          } : null,
          type: place.type,
          country: place.address?.country,
          state: place.address?.state,
          placeId: place.place_id
        }))
        .slice(0, limit); // Return only requested number
      
      console.log('Filtered cities:', cities.length);
      
      return cities;
    } catch (error) {
      throw new Error(`OpenStreetMap autocomplete error: ${error.message}`);
    }
  }

  /**
   * Get Points of Interest using Overpass API
   * @param {Object} bbox - Bounding box {minLat, minLng, maxLat, maxLng}
   * @param {number} limit - Maximum number of results
   * @param {Array<string>} categories - POI categories to search for
   * @returns {Promise<Array>} Array of POIs
   */
  async getPOI(bbox, limit = 50, categories = [InterestCategory.HISTORY_CULTURE, InterestCategory.ART_MUSEUMS, InterestCategory.ARCHITECTURE, InterestCategory.NATURE_PARKS, InterestCategory.ENTERTAINMENT, InterestCategory.GASTRONOMY]) {
    // Build smart Overpass query that filters for significant POIs only
    // Based on Wikipedia presence, landmark status, and type    
    const bboxStr = `${bbox.minLat},${bbox.minLng},${bbox.maxLat},${bbox.maxLng}`;
    console.log('Getting POIs for bbox:', bboxStr, 'limit:', limit);
    // History & Culture: historic sites, monuments, castles
    const history_culture_query = `
        node["historic"~"castle|monument|ruins|memorial"]["historic"!~"memorial"](${bboxStr});
        way["historic"~"castle|monument|ruins|memorial"]["historic"!~"memorial"](${bboxStr});
        relation["historic"~"castle|monument|ruins|memorial"]["historic"!~"memorial"](${bboxStr});
    `;
    
    // Art & Museums: museums, galleries, art centers
    const art_museums_query = `
        node["tourism"="museum"](${bboxStr})(if:t["landmark"]=="yes" || is_tag("wikipedia"));
        way["tourism"="museum"](${bboxStr})(if:t["landmark"]=="yes" || is_tag("wikipedia"));
        relation["tourism"="museum"](${bboxStr})(if:t["landmark"]=="yes" || is_tag("wikipedia"));
        node["tourism"="gallery"]["name"](${bboxStr})(if:t["landmark"]=="yes" || is_tag("wikipedia"));
        way["tourism"="gallery"]["name"](${bboxStr})(if:t["landmark"]=="yes" || is_tag("wikipedia"));
        relation["tourism"="gallery"]["name"](${bboxStr})(if:t["landmark"]=="yes" || is_tag("wikipedia"));
        node["amenity"="arts_centre"](${bboxStr});
        way["amenity"="arts_centre"](${bboxStr});
        relation["amenity"="arts_centre"](${bboxStr});
    `;
    
    // Architecture: significant buildings, landmarks
    const architecture_query = `
        node["amenity"="place_of_worship"]["building"~"cathedral|church|mosque|temple"](${bboxStr});
        way["amenity"="place_of_worship"]["building"~"cathedral|church|mosque|temple"](${bboxStr});
        relation["amenity"="place_of_worship"]["building"~"cathedral|church|mosque|temple"](${bboxStr});
        node["building"~"cathedral|church|mosque|temple|castle|palace"]["name"](${bboxStr});
        way["building"~"cathedral|church|mosque|temple|castle|palace"]["name"](${bboxStr});
        relation["building"~"cathedral|church|mosque|temple|castle|palace"]["name"](${bboxStr});
    `;
    
    // Nature & Parks: parks, gardens, viewpoints
    const nature_parks_query = `
        node["leisure"~"park|garden"]["name"](${bboxStr});
        way["leisure"~"park|garden"]["name"](${bboxStr});
        relation["leisure"~"park|garden"]["name"](${bboxStr});
        node["tourism"="viewpoint"]["name"](${bboxStr});
        way["tourism"="viewpoint"]["name"](${bboxStr});
        relation["tourism"="viewpoint"]["name"](${bboxStr});
        node["natural"~"beach|cave|peak"]["name"](${bboxStr});
        way["natural"~"beach|cave|peak"]["name"](${bboxStr});
        relation["natural"~"beach|cave|peak"]["name"](${bboxStr});
    `;
    
    // Entertainment: attractions, theaters, cinemas
    const entertainment_query = `
        node["tourism"="attraction"](${bboxStr})(if:t["landmark"]=="yes" || is_tag("wikipedia"));
        way["tourism"="attraction"](${bboxStr})(if:t["landmark"]=="yes" || is_tag("wikipedia"));
        relation["tourism"="attraction"](${bboxStr})(if:t["landmark"]=="yes" || is_tag("wikipedia"));
        node["amenity"~"cinema|theatre|casino"](${bboxStr});
        way["amenity"~"cinema|theatre|casino"](${bboxStr});
        relation["amenity"~"cinema|theatre|casino"](${bboxStr});
    `;
    
    // Gastronomy: restaurants, cafes, food markets
    const gastronomy_query = `
        node["amenity"~"restaurant|cafe|bar|pub|food_court"]["name"](${bboxStr});
        way["amenity"~"restaurant|cafe|bar|pub|food_court"]["name"](${bboxStr});
        relation["amenity"~"restaurant|cafe|bar|pub|food_court"]["name"](${bboxStr});
        node["shop"~"bakery|butcher|seafood|wine|alcohol"]["name"](${bboxStr});
        way["shop"~"bakery|butcher|seafood|wine|alcohol"]["name"](${bboxStr});
        relation["shop"~"bakery|butcher|seafood|wine|alcohol"]["name"](${bboxStr});
    `;
    
    // Nightlife: bars, clubs, nightlife venues
    const nightlife_query = `
        node["amenity"~"bar|pub|nightclub"]["name"](${bboxStr});
        way["amenity"~"bar|pub|nightclub"]["name"](${bboxStr});
        relation["amenity"~"bar|pub|nightclub"]["name"](${bboxStr});
        node["leisure"~"adult_gaming_centre|casino"](${bboxStr});
        way["leisure"~"adult_gaming_centre|casino"](${bboxStr});
        relation["leisure"~"adult_gaming_centre|casino"](${bboxStr});
    `;

    const query = `
      [out:json][timeout:90];
      // 1. Significant POIs only
      (
        ${categories.includes(InterestCategory.HISTORY_CULTURE) ? history_culture_query : ''}
        ${categories.includes(InterestCategory.ART_MUSEUMS) ? art_museums_query : ''}
        ${categories.includes(InterestCategory.ARCHITECTURE) ? architecture_query : ''}
        ${categories.includes(InterestCategory.NATURE_PARKS) ? nature_parks_query : ''}
        ${categories.includes(InterestCategory.ENTERTAINMENT) ? entertainment_query : ''}
        ${categories.includes(InterestCategory.GASTRONOMY) ? gastronomy_query : ''}
        ${categories.includes(InterestCategory.NIGHTLIFE) ? nightlife_query : ''}
      )->.pois;

      // 2. Get noise items
      (
        node["tourism"~"artwork|information"](${bboxStr});
        way["tourism"~"artwork|information"](${bboxStr});
        relation["tourism"~"artwork|information"](${bboxStr});
      )->.noise;
      
      // 3. Subtract noise from pois
      (.pois; - .noise;);
    
      out center;
    `.trim();

    // Retry logic for 504 Gateway Timeout errors
    const maxRetries = 3;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Fetching POIs (attempt ${attempt}/${maxRetries})...`);
        
        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `data=${encodeURIComponent(query)}`
        });
        
        // Check for 504 Gateway Timeout
        if (response.status === 504) {
          lastError = new Error(`Overpass API timeout (504) on attempt ${attempt}`);
          console.warn(lastError.message);
          
          if (attempt < maxRetries) {
            // Wait before retrying (exponential backoff: 2s, 4s, 8s)
            const waitTime = Math.pow(2, attempt) * 1000;
            console.log(`Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue; // Retry
          } else {
            // All retries exhausted
            throw new Error(
              `Overpass API server is overloaded (Gateway Timeout 504). ` +
              `Failed after ${maxRetries} attempts. Please try again in a few moments, ` +
              `or try zooming in to a smaller area.`
            );
          }
        }
        
        // Check for 414 Request-URI Too Long (should not happen with POST, but just in case)
        if (response.status === 414) {
          throw new Error(
            `Overpass API request too long (414). This should not happen with POST requests. ` +
            `Please try reducing the search area or number of categories.`
          );
        }
        
        // Check for other HTTP errors
        if (!response.ok) {
          throw new Error(`Overpass API request failed: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        console.log(`Overpass API returned ${data.elements.length} POIs`);
        
        const pois = data.elements.map(element => {
          // Get coordinates (nodes have lat/lon, ways/relations have center)
          const lat = element.lat || element.center?.lat;
          const lon = element.lon || element.center?.lon;
          
          // Calculate significance score for sorting
          let significance = 0;
          if (element.tags?.wikipedia) significance += 10; // Has Wikipedia article
          if (element.tags?.wikidata) significance += 5;   // Has Wikidata entry
          if (element.tags?.website) significance += 3;    // Has official website
          if (element.tags?.name) significance += 2;       // Has name
          if (element.type === 'relation') significance += 3; // Larger feature
          else if (element.type === 'way') significance += 1;
          
          // Extract image URL if available
          let imageUrl = null;
          if (element.tags?.image) {
            // Direct image URL (highest priority - sometimes present)
            imageUrl = element.tags.image;
          } else if (element.tags?.wikimedia_commons) {
            // Convert Wikimedia Commons filename to URL
            const filename = element.tags.wikimedia_commons.replace('File:', '');
            imageUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=300`;
          }
          // Note: If imageUrl is null, getPOIImage() will try Wikidata next
          
          // Determine POI interest categories (can be multiple)
          const interestCategories = this.#determinePOIInterestCategories(element);
          
          return new OpenStreetPOI({
            id: element.id,
            name: element.tags?.name || 'Unnamed',
            type: element.tags?.tourism || element.tags?.historic || element.tags?.amenity || element.tags?.leisure,
            interest_categories: interestCategories,
            location: {
              lat: lat,
              lng: lon
            },
            description: element.tags?.description,
            website: element.tags?.website,
            wikipedia: element.tags?.wikipedia,
            wikidata: element.tags?.wikidata,
            imageUrl: imageUrl,
            wikimediaCommons: element.tags?.wikimedia_commons,
            osmType: element.type,
            osmId: element.id,
            significance: significance,
            allTags: element.tags || {} // Pass all OSM tags for accessibility checking
          });
        })
        .filter(poi => poi.location.lat && poi.location.lng) // Filter out POIs without coordinates
        .sort((a, b) => b.significance - a.significance) // Sort by significance (highest first)
        .slice(0, limit); // Return only requested number after sorting
        
        console.log(`Returning top ${pois.length} POIs sorted by significance`);
        
        return pois;
        
      } catch (error) {
        // If it's not a 504 error or we're on the last attempt, throw immediately
        if (!error.message.includes('504') || attempt === maxRetries) {
          throw new Error(`OpenStreetMap POI error: ${error.message}`);
        }
        
        lastError = error;
        console.warn(`Attempt ${attempt} failed:`, error.message);
        
        // Wait before retrying (exponential backoff)
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // This should never be reached, but just in case
    throw new Error(`OpenStreetMap POI error: ${lastError?.message || 'Unknown error after retries'}`);
  }

  /**
   * Get POI image URL with multiple fallback options
   * @param {Object} poi - POI object with image fields
   * @returns {Promise<string>} Image URL or placeholder
   */
  async getPOIImage(poi) {
    // Option 1: Direct imageUrl (already includes wikimedia_commons and image tag)
    if (poi.imageUrl) {
      return poi.imageUrl;
    }
    
    // Option 2: Try Wikidata if available
    if (poi.wikidata) {
      try {
        const wikidataImage = await this.getWikidataImage(poi.wikidata);
        if (wikidataImage) {
          return wikidataImage;
        }
      } catch (error) {
        console.warn(`Failed to fetch Wikidata image for ${poi.name}:`, error);
      }
    }
    
    // Fallback: Return local placeholder image
    return noImagePlaceholder;
  }

  /**
   * Fetch image from Wikidata using P18 property
   * @param {string} wikidataId - Wikidata ID (e.g., "Q123456")
   * @returns {Promise<string|null>} Image URL or null
   */
  /**
   * Process the Wikidata request queue with rate limiting
   */
  async processWikidataQueue() {
    if (this.isProcessingQueue || this.wikidataQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.wikidataQueue.length > 0) {
      const { wikidataId, resolve } = this.wikidataQueue.shift();
      
      try {
        const imageUrl = await this.fetchWikidataImageDirect(wikidataId);
        resolve(imageUrl);
      } catch (error) {
        console.warn(`Wikidata fetch error for ${wikidataId}:`, error);
        resolve(null);
      }

      // Wait before processing next request to avoid rate limiting
      if (this.wikidataQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.requestDelay));
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Add Wikidata request to queue
   */
  async getWikidataImage(wikidataId) {
    // Check if this ID has already failed
    if (this.failedWikidataIds.has(wikidataId)) {
      return null;
    }

    return new Promise((resolve) => {
      this.wikidataQueue.push({ wikidataId, resolve });
      this.processWikidataQueue();
    });
  }

  /**
   * Fetch image from Wikidata using Action API (better CORS support)
   */
  async fetchWikidataImageDirect(wikidataId) {
    try {
      // Clean up the Wikidata ID (remove any prefix)
      const cleanId = wikidataId.replace(/^[^Q]*/, '');
      
      // Use Wikidata Action API instead of Special:EntityData (better CORS support)
      const url = `https://www.wikidata.org/w/api.php?` +
        `action=wbgetclaims&entity=${cleanId}&property=P18&format=json&origin=*`;
      
      const response = await fetch(url);
      if (!response.ok) {
        this.failedWikidataIds.add(wikidataId);
        return null;
      }
      
      const data = await response.json();
      
      // Get P18 (image) property claims
      const imageClaims = data.claims?.P18;
      if (!imageClaims || imageClaims.length === 0) {
        this.failedWikidataIds.add(wikidataId);
        return null;
      }
      
      // Get the first image filename
      const imageFilename = imageClaims[0].mainsnak?.datavalue?.value;
      if (!imageFilename) {
        this.failedWikidataIds.add(wikidataId);
        return null;
      }
      
      // Convert to Wikimedia Commons URL
      const encodedFilename = encodeURIComponent(imageFilename.replace(/ /g, '_'));
      return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodedFilename}?width=300`;
      
    } catch (error) {
      console.warn(`Wikidata image fetch error for ${wikidataId}:`, error);
      this.failedWikidataIds.add(wikidataId);
      return null;
    }
  }

  getProviderName() {
    return 'OpenStreetMap';
  }

  /**
   * Get static map image URL
   * @param {Object} options - Map options
   * @param {Object} options.center - Center point {lat, lng} (if not using bbox)
   * @param {number} options.zoom - Zoom level (1-19) (if not using bbox)
   * @param {Object} options.bbox - Bounding box {minLat, minLng, maxLat, maxLng} (alternative to center+zoom)
   * @param {Object} options.size - Image size {width, height}
   * @param {Array} options.markers - Optional array of markers [{lat, lng, color}]
   * @returns {string} URL to static map image
   */
  getStaticMapUrl(options) {
    const { center, zoom = 13, bbox, size = { width: 600, height: 400 }, markers = [] } = options;
    
    // Using OpenStreetMap Tile Server with center point
    // Note: This returns a single tile URL. For production with bounding box support:
    // - Use Geoapify (free 3000/day): https://www.geoapify.com/static-maps-api
    // - Use MapTiler (free 100k/month): https://www.maptiler.com
    // - Get your own Mapbox token: https://www.mapbox.com
    
    let actualCenter, actualZoom;
    
    if (bbox) {
      // Calculate center from bounding box
      actualCenter = {
        lat: (bbox.minLat + bbox.maxLat) / 2,
        lng: (bbox.minLng + bbox.maxLng) / 2
      };
      
      // Calculate appropriate zoom level based on bbox size
      const latDiff = Math.abs(bbox.maxLat - bbox.minLat);
      const lngDiff = Math.abs(bbox.maxLng - bbox.minLng);
      const maxDiff = Math.max(latDiff, lngDiff);
      
      // Estimate zoom level (rough approximation)
      if (maxDiff > 10) actualZoom = 5;
      else if (maxDiff > 5) actualZoom = 6;
      else if (maxDiff > 2) actualZoom = 7;
      else if (maxDiff > 1) actualZoom = 8;
      else if (maxDiff > 0.5) actualZoom = 9;
      else if (maxDiff > 0.2) actualZoom = 10;
      else if (maxDiff > 0.1) actualZoom = 11;
      else if (maxDiff > 0.05) actualZoom = 12;
      else if (maxDiff > 0.02) actualZoom = 13;
      else if (maxDiff > 0.01) actualZoom = 14;
      else actualZoom = 15;
    } else {
      actualCenter = center;
      actualZoom = zoom;
    }
    
    // Calculate tile coordinates
    const lat_rad = actualCenter.lat * Math.PI / 180;
    const n = Math.pow(2, actualZoom);
    const xtile = Math.floor((actualCenter.lng + 180) / 360 * n);
    const ytile = Math.floor((1 - Math.log(Math.tan(lat_rad) + 1 / Math.cos(lat_rad)) / Math.PI) / 2 * n);
    
    // Return OSM tile URL
    // Note: This is a single 256x256 tile. For production, use a proper static map service.
    return `https://tile.openstreetmap.org/${actualZoom}/${xtile}/${ytile}.png`;
  }
}


/**
 * Google Maps API implementation
 */
export class GoogleMapsAPI extends MapsAPI {
  constructor(apiKey) {
    super(apiKey);
    if (!apiKey) {
      throw new Error('Google Maps API requires an API key');
    }
    this.baseUrl = 'https://maps.googleapis.com/maps/api';
  }

  getProviderName() {
    return 'Google Maps';
  }

  async calculateRoute(waypoints, options = {}) {
    const origin = waypoints[0];
    const destination = waypoints[waypoints.length - 1];
    const intermediateWaypoints = waypoints.slice(1, -1);
    
    const params = new URLSearchParams({
      origin: `${origin.lat},${origin.lng}`,
      destination: `${destination.lat},${destination.lng}`,
      key: this.apiKey,
      mode: options.mode || 'driving'
    });
    
    if (intermediateWaypoints.length > 0) {
      const waypointsStr = intermediateWaypoints
        .map(wp => `${wp.lat},${wp.lng}`)
        .join('|');
      params.append('waypoints', waypointsStr);
    }
    
    const url = `${this.baseUrl}/directions/json?${params}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error(`Route calculation failed: ${data.status}`);
      }
      
      const route = data.routes[0];
      const leg = route.legs[0];
      
      return {
        distance: leg.distance.value, // meters
        duration: leg.duration.value, // seconds
        geometry: route.overview_polyline.points,
        legs: route.legs,
        summary: route.summary
      };
    } catch (error) {
      throw new Error(`Google Maps route error: ${error.message}`);
    }
  }

  async geocodeAddress(address) {
    const params = new URLSearchParams({
      address: address,
      key: this.apiKey
    });
    
    const url = `${this.baseUrl}/geocode/json?${params}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== 'OK' || !data.results.length) {
        throw new Error('Address not found');
      }
      
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng
      };
    } catch (error) {
      throw new Error(`Google Maps geocoding error: ${error.message}`);
    }
  }

  async reverseGeocode(lat, lng) {
    const params = new URLSearchParams({
      latlng: `${lat},${lng}`,
      key: this.apiKey
    });
    
    const url = `${this.baseUrl}/geocode/json?${params}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== 'OK' || !data.results.length) {
        throw new Error('Location not found');
      }
      
      return data.results[0].formatted_address;
    } catch (error) {
      throw new Error(`Google Maps reverse geocoding error: ${error.message}`);
    }
  }

  async getDistanceMatrix(origins, destinations, options = {}) {
    const originsStr = origins.map(o => `${o.lat},${o.lng}`).join('|');
    const destinationsStr = destinations.map(d => `${d.lat},${d.lng}`).join('|');
    
    const params = new URLSearchParams({
      origins: originsStr,
      destinations: destinationsStr,
      key: this.apiKey,
      mode: options.mode || 'driving'
    });
    
    const url = `${this.baseUrl}/distancematrix/json?${params}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error(`Distance matrix failed: ${data.status}`);
      }
      
      return {
        origins: data.origin_addresses,
        destinations: data.destination_addresses,
        rows: data.rows.map(row => 
          row.elements.map(element => ({
            distance: element.distance?.value,
            duration: element.duration?.value,
            status: element.status
          }))
        )
      };
    } catch (error) {
      throw new Error(`Google Maps distance matrix error: ${error.message}`);
    }
  }

  async searchPlaces(query, location, radius) {
    const params = new URLSearchParams({
      query: query,
      location: `${location.lat},${location.lng}`,
      radius: radius,
      key: this.apiKey
    });
    
    const url = `${this.baseUrl}/place/textsearch/json?${params}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Place search failed: ${data.status}`);
      }
      
      return data.results.map(place => ({
        name: place.name,
        location: place.geometry.location,
        address: place.formatted_address,
        rating: place.rating,
        types: place.types
      }));
    } catch (error) {
      throw new Error(`Google Maps search error: ${error.message}`);
    }
  }

  async validateApiKey() {
    try {
      // Make a simple geocode request to validate
      await this.geocodeAddress('New York');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Autocomplete city names as user types
   * @param {string} query - Partial city name
   * @param {number} limit - Max number of suggestions (default: 10)
   * @returns {Promise<Array>} Array of city suggestions
   */
  async autocompleteCities(query, limit = 10) {
    const params = new URLSearchParams({
      input: query,
      types: '(cities)',
      key: this.apiKey  // TODO: different keys for different Google map APIs
    });
    
    const url = `${this.baseUrl}/place/autocomplete/json?${params}`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        throw new Error(`Autocomplete failed: ${data.status}`);
      }
      
      // Get place details for each prediction to get coordinates
      const results = await Promise.all(
        data.predictions.slice(0, limit).map(async (prediction) => {
          try {
            const detailsParams = new URLSearchParams({
              place_id: prediction.place_id,
              fields: 'name,geometry,address_components',
              key: this.apiKey
            });
            
            const detailsResponse = await fetch(
              `${this.baseUrl}/place/details/json?${detailsParams}`
            );
            const details = await detailsResponse.json();
            
            if (details.status === 'OK') {
              const addressComponents = details.result.address_components || [];
              const country = addressComponents.find(c => c.types.includes('country'))?.long_name;
              const state = addressComponents.find(c => c.types.includes('administrative_area_level_1'))?.long_name;
              
              return {
                name: details.result.name,
                displayName: prediction.description,
                location: details.result.geometry.location,
                type: 'city',
                country: country,
                state: state,
                placeId: prediction.place_id
              };
            }
            return null;
          } catch (err) {
            console.warn('Failed to get place details:', err);
            return null;
          }
        })
      );
      
      return results.filter(r => r !== null);
    } catch (error) {
      throw new Error(`Google Maps autocomplete error: ${error.message}`);
    }
  }

  /**
   * Get Points of Interest using Google Places API
   * @param {Object} bbox - Bounding box {minLat, minLng, maxLat, maxLng}
   * @param {number} limit - Maximum number of results
   * @param {Array<string>} categories - POI categories to search for
   * @returns {Promise<Array>} Array of POIs
   */
  async getPOI(bbox, limit = 50, categories = [InterestCategory.HISTORY_CULTURE, InterestCategory.ART_MUSEUMS, InterestCategory.ARCHITECTURE, InterestCategory.NATURE_PARKS, InterestCategory.ENTERTAINMENT, InterestCategory.GASTRONOMY]) {
    // Google Places doesn't support bbox directly, so we search from center
    const centerLat = (bbox.minLat + bbox.maxLat) / 2;
    const centerLng = (bbox.minLng + bbox.maxLng) / 2;
    
    // Calculate radius from bbox
    const latDiff = Math.abs(bbox.maxLat - bbox.minLat);
    const lngDiff = Math.abs(bbox.maxLng - bbox.minLng);
    const radiusInDegrees = Math.max(latDiff, lngDiff) / 2;
    const radiusInMeters = Math.min(radiusInDegrees * 111320, 50000); // Max 50km
    
    // Map categories to Google types
    const typeMapping = {
      'attraction': 'tourist_attraction',
      'museum': 'museum',
      'monument': 'point_of_interest',
      'historic': 'point_of_interest',
      'place_of_worship': 'place_of_worship',
      'park': 'park',
      'viewpoint': 'point_of_interest'
    };
    
    const allResults = [];
    
    // Query for each category
    for (const category of categories) {
      const googleType = typeMapping[category] || 'tourist_attraction';
      
      const params = new URLSearchParams({
        location: `${centerLat},${centerLng}`,
        radius: Math.floor(radiusInMeters),
        type: googleType,
        key: this.apiKey
      });
      
      const url = `${this.baseUrl}/place/nearbysearch/json?${params}`;
      
      try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
          const results = (data.results || []).map(place => ({
            id: place.place_id,
            name: place.name,
            type: googleType,
            category: category,
            location: place.geometry.location,
            rating: place.rating,
            userRatingsTotal: place.user_ratings_total,
            vicinity: place.vicinity,
            photos: place.photos?.map(p => p.photo_reference),
            placeId: place.place_id
          }));
          
          allResults.push(...results);
        }
      } catch (error) {
        console.warn(`Failed to fetch ${category} POIs:`, error);
      }
    }
    
    // Remove duplicates and sort by rating
    const uniqueResults = Array.from(
      new Map(allResults.map(item => [item.id, item])).values()
    );
    
    // Sort by rating (highest first), then by number of ratings
    const sorted = uniqueResults.sort((a, b) => {
      // Primary sort: rating
      if (b.rating !== a.rating) {
        return (b.rating || 0) - (a.rating || 0);
      }
      // Secondary sort: number of ratings (popularity)
      return (b.userRatingsTotal || 0) - (a.userRatingsTotal || 0);
    });
    
    return sorted.slice(0, limit);
  }

  getProviderName() {
    return 'Google Maps';
  }

  /**
   * Get static map image URL using Google Maps Static API
   * @param {Object} options - Map options
   * @param {Object} options.center - Center point {lat, lng} (if not using bbox)
   * @param {number} options.zoom - Zoom level (1-20) (if not using bbox)
   * @param {Object} options.bbox - Bounding box {minLat, minLng, maxLat, maxLng} (alternative to center+zoom)
   * @param {Object} options.size - Image size {width, height}
   * @param {Array} options.markers - Optional array of markers [{lat, lng, color}]
   * @returns {string} URL to static map image
   */
  getStaticMapUrl(options) {
    const { center, zoom = 13, bbox, size = { width: 600, height: 400 }, markers = [] } = options;
    const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
    
    const params = new URLSearchParams({
      size: `${size.width}x${size.height}`,
      key: this.apiKey
    });

    // Use bounding box if provided, otherwise use center+zoom
    if (bbox) {
      // Google Maps uses visible parameter for bounding box
      const sw = `${bbox.minLat},${bbox.minLng}`; // Southwest corner
      const ne = `${bbox.maxLat},${bbox.maxLng}`; // Northeast corner
      params.append('visible', sw);
      params.append('visible', ne);
    } else {
      params.append('center', `${center.lat},${center.lng}`);
      params.append('zoom', zoom);
    }

    // Add markers if provided
    if (markers.length > 0) {
      markers.forEach(marker => {
        const color = marker.color || 'red';
        params.append('markers', `color:${color}|${marker.lat},${marker.lng}`);
      });
    }

    return `${baseUrl}?${params.toString()}`;
  }
}

