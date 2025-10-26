/**
 * Abstract base class for route providers
 * Defines interface that all route providers must implement
 */
export class BaseRouteProvider {
  constructor(apiKey = null) {
    if (this.constructor === BaseRouteProvider) {
      throw new Error('BaseRouteProvider is an abstract class');
    }
    this.apiKey = apiKey;
  }

  /**
   * Build route between start and finish points with optional waypoints
   * @param {OpenStreetPOI} startPOI - Starting point
   * @param {OpenStreetPOI} finishPOI - Ending point
   * @param {Object} options - Route options
   * @param {string} options.profile - Provider-specific profile name
   * @param {boolean} options.avoidStairs - Avoid stairs/steps
   * @param {Array<OpenStreetPOI>} options.waypoints - Intermediate waypoints
   * @returns {Promise<RouteData>} Route information
   */
  async buildRoute(startPOI, finishPOI, options = {}) {
    throw new Error('buildRoute() must be implemented by subclass');
  }

  /**
   * Map MobilityType and TransportMode to provider-specific profile
   * @param {string} mobilityType - MobilityType from UserProfile
   * @param {string} transportMode - TransportMode from UserProfile
   * @returns {string} Provider-specific profile name
   */
  getProfileForMobility(mobilityType, transportMode) {
    throw new Error('getProfileForMobility() must be implemented by subclass');
  }

  /**
   * Get provider name
   * @returns {string} Provider name
   */
  getProviderName() {
    throw new Error('getProviderName() must be implemented by subclass');
  }

  /**
   * Get instructions for obtaining API key
   * @returns {string} HTML formatted instructions
   */
  getApiKeyInstructions() {
    throw new Error('getApiKeyInstructions() must be implemented by subclass');
  }
}

/**
 * Standard route data structure returned by all providers
 * @typedef {Object} RouteData
 * @property {Object} geometry - GeoJSON geometry (coordinates array)
 * @property {number} distance - Distance in meters
 * @property {number} duration - Duration in seconds
 * @property {Array<Object>} instructions - Turn-by-turn instructions
 * @property {Array<Array<number>>} waypoints - Waypoint coordinates [lat, lng]
 */

