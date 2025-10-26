import { GraphHopperRouteProvider } from '../../src/services/GraphHopperRouteProvider';
import { OpenStreetPOI } from '../../src/models/POI';
import { UserProfile, MobilityType, TransportMode } from '../../src/models/UserProfile';

// Mock fetch for GraphHopper API
global.fetch = jest.fn();

describe('Route Building Integration', () => {
  let routeProvider;
  const mockApiKey = 'test-graphhopper-key';
  
  // Mock POI objects
  const createMockPOI = (name, lat, lng, categories = ['history_culture']) => {
    return new OpenStreetPOI({
      id: `poi-${name.toLowerCase().replace(/\s+/g, '-')}`,
      name: name,
      type: 'landmark',
      interest_categories: categories,
      location: { lat, lng },
      osmType: 'node',
      osmId: Math.floor(Math.random() * 100000),
      significance: 1,
      allTags: {}
    });
  };
  
  beforeEach(() => {
    routeProvider = new GraphHopperRouteProvider(mockApiKey);
    fetch.mockClear();
  });
  
  describe('API Key Management', () => {
    test('should initialize with GraphHopper provider when API key provided', () => {
      expect(routeProvider).toBeInstanceOf(GraphHopperRouteProvider);
      expect(routeProvider.apiKey).toBe(mockApiKey);
    });
    
    test('should validate API key', () => {
      expect(routeProvider.apiKey).toBe(mockApiKey);
      expect(routeProvider.getProviderName()).toBe('GraphHopper');
    });
  });
  
  describe('Route Building with Different Profiles', () => {
    const startPOI = createMockPOI('Brandenburg Gate', 52.5163, 13.3777);
    const finishPOI = createMockPOI('Museum Island', 52.5210, 13.3960);
    
    beforeEach(() => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          paths: [{
            points: {
              coordinates: [
                [13.3777, 52.5163],
                [13.3800, 52.5180],
                [13.3900, 52.5200],
                [13.3960, 52.5210]
              ],
              type: 'LineString'
            },
            distance: 1850.0,
            time: 1320000,
            instructions: [
              {
                distance: 200,
                sign: 0,
                interval: [0, 1],
                text: 'Head north on Unter den Linden'
              }
            ],
            snapped_waypoints: {
              coordinates: [
                [13.3777, 52.5163],
                [13.3960, 52.5210]
              ]
            }
          }]
        })
      });
    });
    
    test('should build route with foot profile', async () => {
      const route = await routeProvider.buildRoute(startPOI, finishPOI, {
        profile: 'foot',
        avoidStairs: false,
        waypoints: []
      });
      
      expect(route).toBeDefined();
      expect(route.distance).toBe(1850.0);
      expect(route.duration).toBe(1320);
      expect(fetch).toHaveBeenCalled();
      
      const calledUrl = fetch.mock.calls[0][0];
      expect(calledUrl).toContain('profile=foot');
    });
    
    test('should build route with wheelchair profile', async () => {
      const route = await routeProvider.buildRoute(startPOI, finishPOI, {
        profile: 'wheelchair',
        avoidStairs: true,
        waypoints: []
      });
      
      expect(route).toBeDefined();
      const calledUrl = fetch.mock.calls[0][0];
      expect(calledUrl).toContain('profile=wheelchair');
    });
    
    test('should build route with bike profile', async () => {
      const route = await routeProvider.buildRoute(startPOI, finishPOI, {
        profile: 'bike',
        avoidStairs: false,
        waypoints: []
      });
      
      expect(route).toBeDefined();
      const calledUrl = fetch.mock.calls[0][0];
      expect(calledUrl).toContain('profile=bike');
    });
    
    test('should build route with car profile', async () => {
      const route = await routeProvider.buildRoute(startPOI, finishPOI, {
        profile: 'car',
        avoidStairs: false,
        waypoints: []
      });
      
      expect(route).toBeDefined();
      const calledUrl = fetch.mock.calls[0][0];
      expect(calledUrl).toContain('profile=car');
    });
    
    test('should include waypoints in route', async () => {
      const waypoint1 = createMockPOI('Checkpoint 1', 52.5170, 13.3820);
      const waypoint2 = createMockPOI('Checkpoint 2', 52.5190, 13.3900);
      
      const route = await routeProvider.buildRoute(startPOI, finishPOI, {
        profile: 'foot',
        avoidStairs: false,
        waypoints: [waypoint1, waypoint2]
      });
      
      expect(route).toBeDefined();
      const calledUrl = fetch.mock.calls[0][0];
      // Should include multiple points (start + 2 waypoints + finish = 4 points)
      const pointMatches = calledUrl.match(/point=/g);
      expect(pointMatches).toHaveLength(4);
    });
    
    test('should handle avoidStairs option', async () => {
      await routeProvider.buildRoute(startPOI, finishPOI, {
        profile: 'wheelchair',
        avoidStairs: true,
        waypoints: []
      });
      
      const calledUrl = fetch.mock.calls[0][0];
      // Check for stairs avoidance option
      expect(calledUrl).toContain('profile=wheelchair');
      expect(calledUrl).toContain('avoid=steps');
    });
  });
  
  describe('Route Building with User Profile', () => {
    test('should map user profile to routing profile', () => {
      const profile = routeProvider.getProfileForMobility(
        MobilityType.WHEELCHAIR,
        TransportMode.WALK
      );
      
      expect(profile).toBe('wheelchair');
    });
  });
  
  describe('Error Handling', () => {
    const startPOI = createMockPOI('Start', 52.5160, 13.3777);
    const finishPOI = createMockPOI('Finish', 52.5180, 13.3800);
    
    test('should handle API error response', async () => {
      fetch.mockResolvedValue({
        ok: false,
        json: async () => ({
          message: 'Invalid API key'
        })
      });
      
      await expect(
        routeProvider.buildRoute(startPOI, finishPOI, {})
      ).rejects.toThrow();
    });
    
    test('should handle network error', async () => {
      fetch.mockRejectedValue(new Error('Network error'));
      
      await expect(
        routeProvider.buildRoute(startPOI, finishPOI, {})
      ).rejects.toThrow();
    });
    
    test('should handle invalid route response', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Unable to route' })
      });
      
      await expect(
        routeProvider.buildRoute(startPOI, finishPOI, {})
      ).rejects.toThrow();
    });
  });
});
