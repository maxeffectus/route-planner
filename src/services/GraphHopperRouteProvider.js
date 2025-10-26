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
    // MobilityType takes priority - wheelchair/stroller need accessible routes
    if (mobilityType === MobilityType.WHEELCHAIR || mobilityType === MobilityType.STROLLER) {
      return 'wheelchair';
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

    const params = new URLSearchParams({
      key: this.apiKey,
      profile: profile,
      points_encoded: 'false',
      instructions: 'true',
      locale: 'en'
    });

    // Add all points
    points.forEach(point => {
      params.append('point', `${point[0]},${point[1]}`);
    });

    // Add accessibility options
    if (profile === 'wheelchair' || avoidStairs) {
      params.append('ch.disable', 'true');
      if (avoidStairs) {
        params.append('avoid', 'steps');
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/route?${params.toString()}`);
      const data = await response.json();

      if (data.message) {
        throw new Error(data.message);
      }

      if (!data.paths || data.paths.length === 0) {
        throw new Error('No route found');
      }

      const route = data.paths[0];

      return {
        geometry: route.points,
        distance: route.distance,
        duration: route.time / 1000,
        instructions: route.instructions || [],
        waypoints: points
      };
    } catch (error) {
      throw new Error(`GraphHopper routing error: ${error.message}`);
    }
  }
}

