/**
 * Tests for UserProfile saved routes functionality
 */

import { UserProfile } from '../../src/models/UserProfile';
import { SavedRoute } from '../../src/models/SavedRoute';

describe('UserProfile Saved Routes', () => {
  let profile;
  let mockRoute;

  beforeEach(() => {
    profile = new UserProfile('user-123');
    mockRoute = new SavedRoute({
      name: 'Test Route',
      geometry: {
        type: 'LineString',
        coordinates: [[52.5, 13.4], [52.51, 13.41]]
      },
      distance: 5000,
      duration: 3600,
      poiIds: ['poi1', 'poi2']
    });
  });

  describe('addSavedRoute', () => {
    it('should add a route with unique name', () => {
      profile.addSavedRoute(mockRoute);
      
      expect(profile.getAllSavedRoutes()).toHaveLength(1);
      expect(profile.hasRoute('Test Route')).toBe(true);
    });

    it('should throw error for duplicate route name', () => {
      profile.addSavedRoute(mockRoute);
      
      expect(() => {
        profile.addSavedRoute(mockRoute);
      }).toThrow('Route with name "Test Route" already exists');
    });

    it('should throw error for invalid route', () => {
      const invalidRoute = new SavedRoute({
        name: 'Invalid',
        geometry: null, // Missing required fields
        distance: 0,
        duration: 0,
        poiIds: []
      });
      
      expect(() => {
        profile.addSavedRoute(invalidRoute);
      }).toThrow('Invalid route: missing required fields');
    });
  });

  describe('getSavedRoute', () => {
    it('should return route by name', () => {
      profile.addSavedRoute(mockRoute);
      const retrieved = profile.getSavedRoute('Test Route');
      
      expect(retrieved).toBeDefined();
      expect(retrieved.name).toBe('Test Route');
    });

    it('should return null for non-existent route', () => {
      const retrieved = profile.getSavedRoute('Non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('getAllSavedRoutes', () => {
    it('should return all saved routes', () => {
      profile.addSavedRoute(mockRoute);
      
      const route2 = new SavedRoute({
        name: 'Route 2',
        geometry: { type: 'LineString', coordinates: [[0, 0], [0.001, 0.001]] },
        distance: 1000,
        duration: 600,
        poiIds: ['poi3', 'poi4']
      });
      profile.addSavedRoute(route2);
      
      const allRoutes = profile.getAllSavedRoutes();
      expect(allRoutes).toHaveLength(2);
    });

    it('should return empty array when no routes saved', () => {
      const allRoutes = profile.getAllSavedRoutes();
      expect(allRoutes).toHaveLength(0);
    });
  });

  describe('deleteSavedRoute', () => {
    it('should delete route by name', () => {
      profile.addSavedRoute(mockRoute);
      expect(profile.hasRoute('Test Route')).toBe(true);
      
      const deleted = profile.deleteSavedRoute('Test Route');
      
      expect(deleted).toBe(true);
      expect(profile.hasRoute('Test Route')).toBe(false);
      expect(profile.getAllSavedRoutes()).toHaveLength(0);
    });

    it('should return false for non-existent route', () => {
      const deleted = profile.deleteSavedRoute('Non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('hasRoute', () => {
    it('should return true for existing route', () => {
      profile.addSavedRoute(mockRoute);
      expect(profile.hasRoute('Test Route')).toBe(true);
    });

    it('should return false for non-existent route', () => {
      expect(profile.hasRoute('Non-existent')).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should save and load routes from JSON', () => {
      profile.addSavedRoute(mockRoute);
      
      const json = profile.toJSON();
      expect(json.savedRoutes).toBeDefined();
      expect(json.savedRoutes['Test Route']).toBeDefined();
      
      const loadedProfile = UserProfile.fromJSON(json);
      expect(loadedProfile.hasRoute('Test Route')).toBe(true);
      expect(loadedProfile.getSavedRoute('Test Route').name).toBe('Test Route');
    });
  });
});

