/**
 * Tests for SavedRoute model
 */

import { SavedRoute } from '../../src/models/SavedRoute';

describe('SavedRoute', () => {
  const mockGeometry = {
    type: 'LineString',
    coordinates: [[52.5, 13.4], [52.51, 13.41], [52.52, 13.42]]
  };

  const mockRouteData = {
    name: 'Berlin Tour',
    geometry: mockGeometry,
    distance: 5000,
    duration: 3600,
    poiIds: ['poi1', 'poi2', 'poi3'],
    createdAt: Date.now(),
    instructions: ['Turn left', 'Turn right']
  };

  describe('constructor', () => {
    it('should create a SavedRoute with all fields', () => {
      const route = new SavedRoute(mockRouteData);
      
      expect(route.name).toBe('Berlin Tour');
      expect(route.geometry).toEqual(mockGeometry);
      expect(route.distance).toBe(5000);
      expect(route.duration).toBe(3600);
      expect(route.poiIds).toEqual(['poi1', 'poi2', 'poi3']);
      expect(route.createdAt).toBeDefined();
      expect(route.instructions).toEqual(['Turn left', 'Turn right']);
    });

    it('should use defaults for empty data', () => {
      const route = new SavedRoute();
      
      expect(route.name).toBe('');
      expect(route.geometry).toBeNull();
      expect(route.distance).toBe(0);
      expect(route.duration).toBe(0);
      expect(route.poiIds).toEqual([]);
      expect(route.createdAt).toBeDefined();
      expect(route.instructions).toEqual([]);
    });
  });

  describe('validate', () => {
    it('should return true for valid route', () => {
      const route = new SavedRoute(mockRouteData);
      expect(route.validate()).toBe(true);
    });

    it('should return false for missing name', () => {
      const route = new SavedRoute({
        ...mockRouteData,
        name: ''
      });
      expect(route.validate()).toBe(false);
    });

    it('should return false for missing geometry', () => {
      const route = new SavedRoute({
        ...mockRouteData,
        geometry: null
      });
      expect(route.validate()).toBe(false);
    });

    it('should return false for missing POI IDs', () => {
      const route = new SavedRoute({
        ...mockRouteData,
        poiIds: []
      });
      expect(route.validate()).toBe(false);
    });

    it('should return false for less than 2 POI IDs', () => {
      const route = new SavedRoute({
        ...mockRouteData,
        poiIds: ['poi1']
      });
      expect(route.validate()).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should serialize route to JSON', () => {
      const route = new SavedRoute(mockRouteData);
      const json = route.toJSON();
      
      expect(json).toEqual({
        name: 'Berlin Tour',
        geometry: mockGeometry,
        distance: 5000,
        duration: 3600,
        poiIds: ['poi1', 'poi2', 'poi3'],
        createdAt: mockRouteData.createdAt,
        instructions: ['Turn left', 'Turn right']
      });
    });
  });

  describe('fromJSON', () => {
    it('should create SavedRoute from JSON data', () => {
      const json = {
        name: 'Berlin Tour',
        geometry: mockGeometry,
        distance: 5000,
        duration: 3600,
        poiIds: ['poi1', 'poi2', 'poi3'],
        createdAt: 1234567890,
        instructions: ['Turn left', 'Turn right']
      };
      
      const route = SavedRoute.fromJSON(json);
      
      expect(route.name).toBe('Berlin Tour');
      expect(route.geometry).toEqual(mockGeometry);
      expect(route.distance).toBe(5000);
      expect(route.duration).toBe(3600);
      expect(route.poiIds).toEqual(['poi1', 'poi2', 'poi3']);
      expect(route.createdAt).toBe(1234567890);
      expect(route.instructions).toEqual(['Turn left', 'Turn right']);
    });
  });
});

