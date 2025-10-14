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
}


/**
 * OpenStreetMap API implementation
 */
export class OpenStreetAPI extends MapsAPI {
  constructor(apiKey = null) {
    super(apiKey);
    this.baseUrl = 'https://nominatim.openstreetmap.org';
    this.routingUrl = 'https://router.project-osrm.org';
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

  getProviderName() {
    return 'OpenStreetMap';
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
      key: this.apiKey
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

  getProviderName() {
    return 'Google Maps';
  }
}

