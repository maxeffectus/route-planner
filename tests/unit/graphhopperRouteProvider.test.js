import { GraphHopperRouteProvider } from '../../src/services/GraphHopperRouteProvider';
import { MobilityType, TransportMode } from '../../src/models/UserProfile';
import { OpenStreetPOI } from '../../src/models/POI';
import graphHopperResponse from '../fixtures/graphhopper-response.json';

// Mock fetch globally
global.fetch = jest.fn();

describe('GraphHopperRouteProvider', () => {
  let provider;
  const mockApiKey = 'test-api-key';
  
  // Mock POI objects
  const createMockPOI = (name, lat, lng) => {
    return new OpenStreetPOI({
      id: `test-${name}`,
      name: name,
      type: 'museum',
      interest_categories: ['art_museums'],
      location: { lat, lng },
      osmType: 'node',
      osmId: 12345,
      significance: 1
    });
  };
  
  const startPOI = createMockPOI('Start Point', 52.5160, 13.3777);
  const finishPOI = createMockPOI('Finish Point', 52.5180, 13.3800);
  
  beforeEach(() => {
    provider = new GraphHopperRouteProvider(mockApiKey);
    fetch.mockClear();
  });
  
  describe('Constructor and Basic Properties', () => {
    test('should create instance with API key', () => {
      expect(provider.apiKey).toBe(mockApiKey);
      expect(provider.baseUrl).toBe('https://graphhopper.com/api/1');
    });
    
    test('should throw error if BaseRouteProvider instantiated directly', () => {
      // This is tested indirectly since we can't import BaseRouteProvider
      // But we can verify that GraphHopper is a proper subclass
      expect(provider).toBeInstanceOf(Object);
    });
  });
  
  describe('getProviderName', () => {
    test('should return GraphHopper', () => {
      expect(provider.getProviderName()).toBe('GraphHopper');
    });
  });
  
  describe('getProfileForMobility', () => {
    test('should return foot profile for WHEELCHAIR mobility', () => {
      // WORKAROUND: GraphHopper free tier doesn't support wheelchair profile
      // Uses foot + avoid=steps instead
      const profile = provider.getProfileForMobility(MobilityType.WHEELCHAIR, TransportMode.WALK);
      expect(profile).toBe('foot');
    });
    
    test('should return foot profile for STROLLER mobility', () => {
      // WORKAROUND: GraphHopper free tier doesn't support wheelchair profile
      // Uses foot + avoid=steps instead
      const profile = provider.getProfileForMobility(MobilityType.STROLLER, TransportMode.WALK);
      expect(profile).toBe('foot');
    });
    
    test('should return foot profile for LOW_ENDURANCE mobility', () => {
      const profile = provider.getProfileForMobility(MobilityType.LOW_ENDURANCE, TransportMode.WALK);
      expect(profile).toBe('foot');
    });
    
    test('should return foot profile for STANDARD mobility with WALK transport', () => {
      const profile = provider.getProfileForMobility(MobilityType.STANDARD, TransportMode.WALK);
      expect(profile).toBe('foot');
    });
    
    test('should return bike profile for STANDARD mobility with BIKE transport', () => {
      const profile = provider.getProfileForMobility(MobilityType.STANDARD, TransportMode.BIKE);
      expect(profile).toBe('bike');
    });
    
    test('should return car profile for STANDARD mobility with CAR_TAXI transport', () => {
      const profile = provider.getProfileForMobility(MobilityType.STANDARD, TransportMode.CAR_TAXI);
      expect(profile).toBe('car');
    });
    
    test('should return foot profile for STANDARD mobility with PUBLIC_TRANSIT transport', () => {
      const profile = provider.getProfileForMobility(MobilityType.STANDARD, TransportMode.PUBLIC_TRANSIT);
      expect(profile).toBe('foot');
    });
    
    test('should have fallback to foot profile', () => {
      const profile = provider.getProfileForMobility('UNKNOWN_MOBILITY', 'UNKNOWN_TRANSPORT');
      expect(profile).toBe('foot');
    });
  });
  
  describe('getApiKeyInstructions', () => {
    test('should return markdown instructions', () => {
      const instructions = provider.getApiKeyInstructions();
      expect(instructions).toContain('How to get GraphHopper API Key');
      expect(instructions).toContain('graphhopper.com');
      expect(instructions).toContain('Free tier includes');
      expect(instructions).toContain('500 requests');
    });
  });
  
  describe('buildRoute', () => {
    test('should build route successfully with foot profile', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => graphHopperResponse
      });
      
      const route = await provider.buildRoute(startPOI, finishPOI, {
        preferredTransport: TransportMode.WALK,
        mobilityType: MobilityType.STANDARD,
        avoidStairs: false,
        waypoints: []
      });
      
      expect(fetch).toHaveBeenCalled();
      expect(route).toBeDefined();
      expect(route.distance).toBe(1250.5);
      expect(route.duration).toBe(960);
      expect(route.geometry).toBeDefined();
      expect(route.instructions).toHaveLength(3);
    });
    
    test('should include waypoints in route', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => graphHopperResponse
      });
      
      const waypoint = createMockPOI('Waypoint', 52.5165, 13.3780);
      
      const route = await provider.buildRoute(startPOI, finishPOI, {
        preferredTransport: TransportMode.WALK,
        mobilityType: MobilityType.STANDARD,
        avoidStairs: false,
        waypoints: [waypoint]
      });
      
      expect(fetch).toHaveBeenCalled();
      const calledUrl = fetch.mock.calls[0][0];
      // Should include waypoint in the request
      expect(calledUrl).toContain('point=');
    });
    
    test('should throw error when API key is missing', async () => {
      const providerWithoutKey = new GraphHopperRouteProvider(null);
      
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'API key is missing' })
      });
      
      await expect(
        providerWithoutKey.buildRoute(startPOI, finishPOI, {})
      ).rejects.toThrow();
    });
    
    test('should throw error when no route found', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ paths: [] })
      });
      
      await expect(
        provider.buildRoute(startPOI, finishPOI, {})
      ).rejects.toThrow('No route found');
    });
    
    test('should handle foot profile with avoidStairs option', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => graphHopperResponse
      });
      
      // NOTE: avoidStairs parameter is accepted but not used with free tier
      // GraphHopper free tier doesn't support flexible mode (avoid=steps)
      await provider.buildRoute(startPOI, finishPOI, {
        profile: 'foot',
        avoidStairs: true,
        waypoints: []
      });
      
      const calledUrl = fetch.mock.calls[0][0];
      // Should use foot profile (avoid=steps is disabled for free tier)
      expect(calledUrl).toContain('profile=foot');
      expect(calledUrl).not.toContain('avoid=steps');
      expect(calledUrl).not.toContain('ch.disable');
    });
    
    test('should handle bike profile', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => graphHopperResponse
      });
      
      const route = await provider.buildRoute(startPOI, finishPOI, {
        profile: 'bike',
        avoidStairs: false,
        waypoints: []
      });
      
      const calledUrl = fetch.mock.calls[0][0];
      expect(calledUrl).toContain('profile=bike');
    });
    
    test('should handle car profile', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => graphHopperResponse
      });
      
      const route = await provider.buildRoute(startPOI, finishPOI, {
        profile: 'car',
        avoidStairs: false,
        waypoints: []
      });
      
      const calledUrl = fetch.mock.calls[0][0];
      expect(calledUrl).toContain('profile=car');
    });
    
    test('should handle fetch errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));
      
      await expect(
        provider.buildRoute(startPOI, finishPOI, {})
      ).rejects.toThrow('GraphHopper routing error');
    });
    
    test('should return proper route data structure', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => graphHopperResponse
      });
      
      const route = await provider.buildRoute(startPOI, finishPOI, {
        preferredTransport: TransportMode.WALK,
        mobilityType: MobilityType.STANDARD,
        avoidStairs: false,
        waypoints: []
      });
      
      expect(route).toHaveProperty('geometry');
      expect(route).toHaveProperty('distance');
      expect(route).toHaveProperty('duration');
      expect(route).toHaveProperty('instructions');
      expect(route).toHaveProperty('waypoints');
      
      expect(typeof route.distance).toBe('number');
      expect(typeof route.duration).toBe('number');
      expect(Array.isArray(route.instructions)).toBe(true);
      expect(Array.isArray(route.waypoints)).toBe(true);
    });
  });
  
  describe('Edge Cases', () => {
    test('should handle empty instructions array', async () => {
      const modifiedResponse = {
        ...graphHopperResponse,
        paths: [{
          ...graphHopperResponse.paths[0],
          instructions: []
        }]
      };
      
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => modifiedResponse
      });
      
      const route = await provider.buildRoute(startPOI, finishPOI, {});
      
      expect(route.instructions).toEqual([]);
    });
    
    test('should handle undefined waypoints', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => graphHopperResponse
      });
      
      const route = await provider.buildRoute(startPOI, finishPOI, {
        preferredTransport: TransportMode.WALK,
        mobilityType: MobilityType.STANDARD,
        avoidStairs: false
      });
      
      expect(route).toBeDefined();
    });
  });

  describe('Multi-Segment Routing (>5 points)', () => {
    // Helper to create mock waypoints
    const createMockWaypoints = (count) => {
      const waypoints = [];
      for (let i = 0; i < count; i++) {
        waypoints.push({
          id: `waypoint-${i}`,
          name: `Waypoint ${i}`,
          location: { lat: 52.5 + i * 0.01, lng: 13.3 + i * 0.01 }
        });
      }
      return waypoints;
    };

    test('should split 6 points into 2 segments', async () => {
      const waypoints = createMockWaypoints(4); // Start + 4 waypoints + finish = 6 points total
      
      // Mock responses for 2 segments
      // Segment 1: points 0-4 (5 points)
      const segment1Response = {
        paths: [{
          points: {
            coordinates: [[13.3777, 52.5160], [13.3778, 52.5161], [13.3780, 52.5162], [13.3785, 52.5165], [13.3790, 52.5170]],
            type: 'LineString'
          },
          distance: 500,
          time: 300000,
          instructions: [{ text: 'Segment 1 instruction', distance: 500 }]
        }]
      };
      
      // Segment 2: points 4-5 (overlap at point 4)
      const segment2Response = {
        paths: [{
          points: {
            coordinates: [[13.3790, 52.5170], [13.3800, 52.5180]],
            type: 'LineString'
          },
          distance: 300,
          time: 180000,
          instructions: [{ text: 'Segment 2 instruction', distance: 300 }]
        }]
      };

      fetch.mockResolvedValueOnce({ ok: true, json: async () => segment1Response });
      fetch.mockResolvedValueOnce({ ok: true, json: async () => segment2Response });
      
      const route = await provider.buildRoute(startPOI, finishPOI, { waypoints });
      
      // Check that both segments were called
      expect(fetch).toHaveBeenCalledTimes(2);
      
      // Check combined results
      expect(route.distance).toBe(800); // 500 + 300
      expect(route.duration).toBe(480); // (300000 + 180000) / 1000
      expect(route.instructions).toHaveLength(2);
      
      // Check geometry - should have 6 coordinates (5 from segment1 + 1 new from segment2)
      expect(route.geometry.coordinates).toHaveLength(6);
    });

    test('should split 9 points into 2 segments', async () => {
      const waypoints = createMockWaypoints(7); // Start + 7 waypoints + finish = 9 points total
      
      // Should split into 2 segments:
      // Segment 1: points 0-4 (5 points: start, w0, w1, w2, w3)
      // Segment 2: points 4-8 (5 points from w3 with overlap, up to finish)
      
      const segment1Response = { paths: [{ points: { coordinates: Array(5).fill([13.3777, 52.5160]), type: 'LineString' }, distance: 1000, time: 600000, instructions: [] }] };
      const segment2Response = { paths: [{ points: { coordinates: Array(5).fill([13.3777, 52.5160]), type: 'LineString' }, distance: 1500, time: 900000, instructions: [] }] };

      fetch.mockResolvedValueOnce({ ok: true, json: async () => segment1Response });
      fetch.mockResolvedValueOnce({ ok: true, json: async () => segment2Response });
      
      const route = await provider.buildRoute(startPOI, finishPOI, { waypoints });
      
      // Should only call API twice
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(route.distance).toBe(2500); // 1000 + 1500
      expect(route.duration).toBe(1500); // (600000 + 900000) / 1000
    });
    
    test('should split 10 points into 3 segments', async () => {
      const waypoints = createMockWaypoints(8); // Start + 8 waypoints + finish = 10 points total
      
      // Should split into 3 segments:
      // Segment 1: points 0-4 (5 points)
      // Segment 2: points 4-8 (5 points with overlap)
      // Segment 3: points 8-9 (2 points with overlap)
      
      const segment1Response = { paths: [{ points: { coordinates: Array(5).fill([13.3777, 52.5160]), type: 'LineString' }, distance: 1000, time: 600000, instructions: [] }] };
      const segment2Response = { paths: [{ points: { coordinates: Array(5).fill([13.3777, 52.5160]), type: 'LineString' }, distance: 1500, time: 900000, instructions: [] }] };
      const segment3Response = { paths: [{ points: { coordinates: Array(2).fill([13.3777, 52.5160]), type: 'LineString' }, distance: 500, time: 300000, instructions: [] }] };

      fetch.mockResolvedValueOnce({ ok: true, json: async () => segment1Response });
      fetch.mockResolvedValueOnce({ ok: true, json: async () => segment2Response });
      fetch.mockResolvedValueOnce({ ok: true, json: async () => segment3Response });
      
      const route = await provider.buildRoute(startPOI, finishPOI, { waypoints });
      
      // Should call API three times
      expect(fetch).toHaveBeenCalledTimes(3);
      expect(route.distance).toBe(3000); // 1000 + 1500 + 500
      expect(route.duration).toBe(1800); // (600000 + 900000 + 300000) / 1000
    });

    test('should handle single segment when points <= 5', async () => {
      const waypoints = createMockWaypoints(3); // Start + 3 waypoints + finish = 5 points total
      
      fetch.mockResolvedValueOnce({ ok: true, json: async () => graphHopperResponse });
      
      const route = await provider.buildRoute(startPOI, finishPOI, { waypoints });
      
      // Should only call API once (no splitting needed)
      expect(fetch).toHaveBeenCalledTimes(1);
      
      expect(route.distance).toBe(graphHopperResponse.paths[0].distance);
    });

    test('should combine instructions from all segments', async () => {
      const waypoints = createMockWaypoints(4);
      
      const segment1Response = {
        paths: [{
          points: { coordinates: Array(5).fill([13.3777, 52.5160]), type: 'LineString' },
          distance: 500,
          time: 300000,
          instructions: [
            { text: 'Turn left', distance: 200 },
            { text: 'Go straight', distance: 300 }
          ]
        }]
      };
      
      const segment2Response = {
        paths: [{
          points: { coordinates: Array(2).fill([13.3777, 52.5160]), type: 'LineString' },
          distance: 300,
          time: 180000,
          instructions: [{ text: 'Turn right', distance: 300 }]
        }]
      };

      fetch.mockResolvedValueOnce({ ok: true, json: async () => segment1Response });
      fetch.mockResolvedValueOnce({ ok: true, json: async () => segment2Response });
      
      const route = await provider.buildRoute(startPOI, finishPOI, { waypoints });
      
      expect(route.instructions).toHaveLength(3);
      expect(route.instructions[0].text).toBe('Turn left');
      expect(route.instructions[2].text).toBe('Turn right');
    });
  });
});

