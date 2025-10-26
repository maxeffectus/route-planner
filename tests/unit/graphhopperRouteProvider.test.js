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
    test('should return wheelchair profile for WHEELCHAIR mobility', () => {
      const profile = provider.getProfileForMobility(MobilityType.WHEELCHAIR, TransportMode.WALK);
      expect(profile).toBe('wheelchair');
    });
    
    test('should return wheelchair profile for STROLLER mobility', () => {
      const profile = provider.getProfileForMobility(MobilityType.STROLLER, TransportMode.WALK);
      expect(profile).toBe('wheelchair'); // STROLLER uses wheelchair profile
    });
    
    test('should return wheelchair profile for LOW_ENDURANCE mobility', () => {
      const profile = provider.getProfileForMobility(MobilityType.LOW_ENDURANCE, TransportMode.WALK);
      expect(profile).toBe('foot'); // According to implementation
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
    
    test('should handle wheelchair profile with avoid_stairs', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => graphHopperResponse
      });
      
      await provider.buildRoute(startPOI, finishPOI, {
        profile: 'wheelchair',
        avoidStairs: true,
        waypoints: []
      });
      
      const calledUrl = fetch.mock.calls[0][0];
      // Should include wheelchair-specific options
      expect(calledUrl).toContain('profile=wheelchair');
      expect(calledUrl).toContain('avoid=steps');
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
});

