import { BaseRouteProvider } from './BaseRouteProvider';
import { MobilityType, TransportMode } from '../models/UserProfile';

/**
 * GraphHopper routing service implementation
 * Docs: https://docs.graphhopper.com/
 */
export class GraphHopperRouteProvider extends BaseRouteProvider {
  constructor(apiKey) {
    super(apiKey);
    this.baseUrl = 'https://graphhopper.com/api/1';
  }

  getProviderName() {
    return 'GraphHopper';
  }

  /**
   * Map MobilityType and TransportMode to GraphHopper profile
   * @param {string} mobilityType - MobilityType value from UserProfile
   * @param {string} transportMode - TransportMode value from UserProfile (single value)
   * @returns {string} GraphHopper profile name
   */
  getProfileForMobility(mobilityType, transportMode) {
    // WORKAROUND: GraphHopper free tier doesn't support 'wheelchair' profile
    // For wheelchair/stroller users, we use 'foot' profile with avoid=steps parameter
    // The avoidStairs option should be set to true for these mobility types
    if (mobilityType === MobilityType.WHEELCHAIR || mobilityType === MobilityType.STROLLER) {
      return 'foot'; // Use foot profile + avoid=steps instead of wheelchair profile
    }
    
    // LOW_ENDURANCE also benefits from avoiding stairs
    if (mobilityType === MobilityType.LOW_ENDURANCE) {
      return 'foot'; // Will use avoid=steps if avoidStairs is true
    }
    
    // Map TransportMode to GraphHopper profiles
    if (transportMode === TransportMode.WALK) {
      return 'foot';
    }
    if (transportMode === TransportMode.BIKE) {
      return 'bike';
    }
    if (transportMode === TransportMode.CAR_TAXI) {
      return 'car';
    }
    if (transportMode === TransportMode.PUBLIC_TRANSIT) {
      return 'foot'; // Fallback: public transit routing requires specialized API
    }
    
    // Default fallback
    return 'foot';
  }

  getApiKeyInstructions() {
    return `
      <h3>How to get GraphHopper API Key</h3>
      <ol>
        <li>Go to <a href="https://graphhopper.com/" target="_blank">graphhopper.com</a></li>
        <li>Click "Sign Up" or "Get Started"</li>
        <li>Create a free account</li>
        <li>Navigate to your dashboard</li>
        <li>Copy your API key</li>
      </ol>
      <p><strong>Free tier includes:</strong> 500 requests per day</p>
      <p><strong>Note:</strong> Your API key will be stored locally in your browser.</p>
    `;
  }

  /**
   * Split points into segments with maximum number of points per segment
   * Segments overlap by 1 point to ensure continuity
   * @param {Array<Array<number>>} points - Array of [lat, lng] coordinates
   * @param {number} maxPoints - Maximum points per segment (default 5)
   * @returns {Array<Array<Array<number>>>} Array of point segments
   */
  _splitPointsIntoSegments(points, maxPoints = 5) {
    const segments = [];
    
    // If points fit in one segment, return it
    if (points.length <= maxPoints) {
      return [points];
    }
    
    let currentIndex = 0;
    
    while (currentIndex < points.length) {
      // All segments can have up to maxPoints (GraphHopper allows this many waypoints)
      // Subsequent segments start from the last point of previous segment (overlap)
      const endIndex = Math.min(currentIndex + maxPoints, points.length);
      
      const segment = points.slice(currentIndex, endIndex);
      segments.push(segment);
      
      // If we've reached the end, stop
      if (endIndex >= points.length) {
        break;
      }
      
      // Move to next segment: start from the last point of current segment (overlap)
      currentIndex = endIndex - 1;
    }
    
    return segments;
  }

  /**
   * Build route for a single segment
   * @param {Array<Array<number>>} segmentPoints - Points for this segment
   * @param {Object} options - Route options
   * @returns {Promise<Object>} Route data for this segment
   */
  async _buildRouteSegment(segmentPoints, options = {}) {
    const {
      profile = 'foot',
      avoidStairs = false
    } = options;

    const params = new URLSearchParams({
      key: this.apiKey,
      profile: profile,
      points_encoded: 'false',
      instructions: 'true',
      locale: 'en'
    });

    // Add all points
    segmentPoints.forEach(point => {
      params.append('point', `${point[0]},${point[1]}`);
    });

    // DISABLED: GraphHopper free tier doesn't support flexible mode (ch.disable=true)
    // Flexible mode is required to use 'avoid' parameters like 'avoid=steps'
    // For wheelchair/stroller users, we use 'foot' profile but cannot avoid stairs with free tier
    // To enable stairs avoidance, upgrade to a paid GraphHopper plan
    // 
    // Original code (commented out):
    // if (profile === 'wheelchair' || avoidStairs) {
    //   params.append('ch.disable', 'true');
    //   if (avoidStairs) {
    //     params.append('avoid', 'steps');
    //   }
    // }

    const response = await fetch(`${this.baseUrl}/route?${params.toString()}`);
    
    // Check HTTP response status
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        if (errorText) {
          errorMessage = errorText;
        }
      }
      
      throw new Error(errorMessage);
    }
    
    const data = await response.json();

    // Check for GraphHopper-specific error messages
    if (data.message) {
      if (data.message.includes('API limit')) {
        throw new Error(
          'GraphHopper API limit reached. Please wait or upgrade your plan at https://www.graphhopper.com/pricing/'
        );
      }
      throw new Error(data.message);
    }

    if (!data.paths || data.paths.length === 0) {
      throw new Error('No route found between the selected points');
    }

    return data.paths[0];
  }

  async buildRoute(startPOI, finishPOI, options = {}) {
    const {
      profile = 'foot',
      avoidStairs = false,
      waypoints = []
    } = options;

    // Build points array: start -> waypoints -> finish
    const points = [
      [startPOI.location.lat, startPOI.location.lng],
      ...waypoints.map(poi => [poi.location.lat, poi.location.lng]),
      [finishPOI.location.lat, finishPOI.location.lng]
    ];

    // GraphHopper API has a limit of 5 points per request
    const MAX_POINTS_PER_REQUEST = 5;

    try {
      // Check if we need to split into multiple segments
      if (points.length <= MAX_POINTS_PER_REQUEST) {
        // Single segment: use existing logic (now delegated to helper)
        const route = await this._buildRouteSegment(points, { profile, avoidStairs });
        
        return {
          geometry: route.points,
          distance: route.distance,
          duration: route.time, // Keep in milliseconds
          instructions: route.instructions || [],
          waypoints: points
        };
      }
      
      // Multiple segments needed
      const segments = this._splitPointsIntoSegments(points, MAX_POINTS_PER_REQUEST);
      
      // Build routes for all segments in parallel
      const segmentRoutes = await Promise.all(
        segments.map(segment => this._buildRouteSegment(segment, { profile, avoidStairs }))
      );
      
      // Combine segment results
      let totalDistance = 0;
      let totalDuration = 0;
      const allInstructions = [];
      const allCoordinates = [];
      
      segmentRoutes.forEach((route, segmentIndex) => {
        // Sum distance and duration
        totalDistance += route.distance || 0;
        totalDuration += route.time || 0;
        
        // Combine instructions
        if (route.instructions) {
          allInstructions.push(...route.instructions);
        }
        
        // Combine geometry coordinates
        // Skip first coordinate of segments after the first (to avoid duplication)
        const coordinates = route.points.coordinates || [];
        if (segmentIndex === 0) {
          // First segment: include all coordinates
          allCoordinates.push(...coordinates);
        } else {
          // Subsequent segments: skip first coordinate (overlap with previous segment)
          allCoordinates.push(...coordinates.slice(1));
        }
      });
      
      return {
        geometry: {
          coordinates: allCoordinates,
          type: 'LineString'
        },
        distance: totalDistance,
        duration: totalDuration, // Keep in milliseconds
        instructions: allInstructions,
        waypoints: points
      };
      
    } catch (error) {
      // Re-throw as-is if it's already our formatted error
      if (error.message.includes('GraphHopper') || error.message.includes('API limit')) {
        throw error;
      }
      throw new Error(`GraphHopper routing error: ${error.message}`);
    }
  }
}

