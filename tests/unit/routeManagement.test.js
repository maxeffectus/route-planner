/**
 * Tests for Route Management utilities
 */

import { extractPOIData, reconstructPOIsFromRoute, buildPOIListForRoute } from '../../src/utils/routeManagement';
import { OpenStreetPOI } from '../../src/models/POI';

describe('Route Management Utilities', () => {
  describe('extractPOIData', () => {
    it('should use toJSON method if POI has it (OpenStreetPOI instance)', () => {
      const poi = new OpenStreetPOI({
        id: 'test-poi',
        name: 'Test POI',
        type: 'monument',
        location: { lat: 52.5, lng: 13.4 },
        interest_categories: ['history_culture'],
        description: 'Test description',
        website: 'https://example.com',
        wikipedia: 'en:Test',
        imageUrl: 'https://example.com/image.jpg',
        allTags: { wheelchair: 'yes', ramp: 'yes' }
      });

      const data = extractPOIData(poi);

      expect(data).toEqual({
        id: 'test-poi',
        name: 'Test POI',
        type: 'monument',
        location: { lat: 52.5, lng: 13.4 },
        interest_categories: ['history_culture'],
        description: 'Test description',
        website: 'https://example.com',
        wikipedia: 'en:Test',
        imageUrl: 'https://example.com/image.jpg',
        wikidata: undefined,
        wikimediaCommons: undefined,
        osmType: undefined,
        osmId: undefined,
        significance: undefined,
        resolvedImageUrl: null,
        allTags: { wheelchair: 'yes', ramp: 'yes' },
        wantToVisit: false
      });
    });

    it('should extract data from plain object', () => {
      const poi = {
        id: 'test-poi',
        name: 'Test POI',
        location: { lat: 52.5, lng: 13.4 },
        description: 'Test description'
      };

      const data = extractPOIData(poi);

      expect(data).toEqual({
        id: 'test-poi',
        name: 'Test POI',
        location: { lat: 52.5, lng: 13.4 },
        interest_categories: [],
        description: 'Test description',
        website: null,
        wikipedia: null,
        imageUrl: null,
        type: null,
        osmType: null,
        osmId: null,
        allTags: {}
      });
    });

    it('should include allTags from plain object', () => {
      const poi = {
        id: 'test-poi',
        name: 'Test POI',
        location: { lat: 52.5, lng: 13.4 },
        allTags: { wheelchair: 'yes' }
      };

      const data = extractPOIData(poi);

      expect(data.allTags).toEqual({ wheelchair: 'yes' });
    });

    it('should return null for null POI', () => {
      const data = extractPOIData(null);
      expect(data).toBeNull();
    });
  });

  describe('reconstructPOIsFromRoute', () => {
    const mockUserProfile = {
      isWantToVisit: jest.fn(() => false),
      addWantToVisit: jest.fn()
    };

    const mockRoute = {
      pois: [
        {
          id: 'poi1',
          name: 'Brandenburg Gate',
          type: 'monument',
          location: { lat: 52.5163, lng: 13.3777 },
          interest_categories: ['history_culture'],
          description: 'Historic monument',
          website: 'https://example.com',
          wikipedia: 'en:Brandenburg_Gate',
          imageUrl: 'https://example.com/image.jpg',
          allTags: { wheelchair: 'yes' }
        },
        {
          id: 'poi2',
          name: 'Reichstag',
          type: 'building',
          location: { lat: 52.5186, lng: 13.3761 },
          interest_categories: ['history_culture'],
          description: 'Parliament building',
          allTags: { wheelchair: 'limited' }
        }
      ]
    };

    it('should reconstruct POIs from saved route data', () => {
      const emptyCache = [];
      const loadedPOIs = reconstructPOIsFromRoute(mockRoute, emptyCache, mockUserProfile);

      expect(loadedPOIs).toHaveLength(2);
      expect(loadedPOIs[0]).toBeInstanceOf(OpenStreetPOI);
      expect(loadedPOIs[1]).toBeInstanceOf(OpenStreetPOI);
      expect(loadedPOIs[0].name).toBe('Brandenburg Gate');
      expect(loadedPOIs[1].name).toBe('Reichstag');
    });

    it('should have accessibility methods on reconstructed POIs', () => {
      const emptyCache = [];
      const loadedPOIs = reconstructPOIsFromRoute(mockRoute, emptyCache, mockUserProfile);

      // Check that POIs have accessibility methods
      expect(typeof loadedPOIs[0].isWheelchairAccessible).toBe('function');
      expect(typeof loadedPOIs[0].isStrollerAccessible).toBe('function');
      expect(typeof loadedPOIs[1].isTempMobilityIssuesAccessible).toBe('function');
      expect(typeof loadedPOIs[1].isBikeAccessible).toBe('function');

      // Test accessibility checking
      expect(loadedPOIs[0].isWheelchairAccessible()).toBe('yes');
      expect(loadedPOIs[1].isWheelchairAccessible()).toBe('limited');
    });

    it('should set wantToVisit to true for all loaded POIs', () => {
      const emptyCache = [];
      const loadedPOIs = reconstructPOIsFromRoute(mockRoute, emptyCache, mockUserProfile);

      expect(loadedPOIs[0].wantToVisit).toBe(true);
      expect(loadedPOIs[1].wantToVisit).toBe(true);
    });

    it('should use cached POI if it exists', () => {
      const cachedPOI = new OpenStreetPOI({
        id: 'poi1',
        name: 'Brandenburg Gate',
        type: 'monument',
        location: { lat: 52.5163, lng: 13.3777 },
        interest_categories: ['history_culture'],
        description: 'Historic monument',
        allTags: { wheelchair: 'yes' }
      });

      const cache = [cachedPOI];
      const loadedPOIs = reconstructPOIsFromRoute(mockRoute, cache, mockUserProfile);

      // Should use the cached POI (same reference)
      expect(loadedPOIs[0]).toBe(cachedPOI);
      expect(loadedPOIs[0].wantToVisit).toBe(true);
    });

    it('should throw error if route has no POIs', () => {
      const emptyRoute = { pois: [] };
      
      expect(() => {
        reconstructPOIsFromRoute(emptyRoute, [], mockUserProfile);
      }).toThrow('Route does not contain POI data. Cannot load route.');
    });

    it('should add POIs to user profile if not already present', () => {
      mockUserProfile.isWantToVisit.mockReturnValue(false);
      mockUserProfile.addWantToVisit.mockClear();

      const emptyCache = [];
      reconstructPOIsFromRoute(mockRoute, emptyCache, mockUserProfile);

      expect(mockUserProfile.addWantToVisit).toHaveBeenCalledTimes(2);
    });

    it('should not add POIs to user profile if already present', () => {
      mockUserProfile.isWantToVisit.mockReturnValue(true);
      mockUserProfile.addWantToVisit.mockClear();

      const emptyCache = [];
      reconstructPOIsFromRoute(mockRoute, emptyCache, mockUserProfile);

      expect(mockUserProfile.addWantToVisit).not.toHaveBeenCalled();
    });
  });

  describe('buildPOIListForRoute', () => {
    const startPOI = new OpenStreetPOI({
      id: 'start',
      name: 'Start Point',
      type: 'point',
      location: { lat: 52.5, lng: 13.4 },
      interest_categories: [],
      description: 'Start',
      allTags: {}
    });

    const finishPOI = new OpenStreetPOI({
      id: 'finish',
      name: 'Finish Point',
      type: 'point',
      location: { lat: 52.6, lng: 13.5 },
      interest_categories: [],
      description: 'Finish',
      allTags: {}
    });

    const waypointPOI = new OpenStreetPOI({
      id: 'waypoint',
      name: 'Waypoint',
      type: 'monument',
      location: { lat: 52.55, lng: 13.45 },
      interest_categories: ['history_culture'],
      description: 'Waypoint description',
      allTags: { wheelchair: 'yes' }
    });

    it('should build POI list with start, waypoints, and finish', () => {
      const cache = [waypointPOI];
      const intermediateIds = ['waypoint'];

      const pois = buildPOIListForRoute(startPOI, intermediateIds, finishPOI, cache);

      expect(pois).toHaveLength(3);
      expect(pois[0].name).toBe('Start Point');
      expect(pois[1].name).toBe('Waypoint');
      expect(pois[2].name).toBe('Finish Point');
    });

    it('should include allTags in extracted POI data', () => {
      const cache = [waypointPOI];
      const intermediateIds = ['waypoint'];

      const pois = buildPOIListForRoute(startPOI, intermediateIds, finishPOI, cache);

      // All POIs should have allTags field
      expect(pois[0]).toHaveProperty('allTags');
      expect(pois[1]).toHaveProperty('allTags');
      expect(pois[2]).toHaveProperty('allTags');

      // Waypoint should have wheelchair tag
      expect(pois[1].allTags).toEqual({ wheelchair: 'yes' });
    });

    it('should handle missing intermediate POIs', () => {
      const cache = [];
      const intermediateIds = ['nonexistent'];

      const pois = buildPOIListForRoute(startPOI, intermediateIds, finishPOI, cache);

      // Should only have start and finish
      expect(pois).toHaveLength(2);
      expect(pois[0].name).toBe('Start Point');
      expect(pois[1].name).toBe('Finish Point');
    });

    it('should handle empty intermediate list', () => {
      const cache = [];
      const intermediateIds = [];

      const pois = buildPOIListForRoute(startPOI, intermediateIds, finishPOI, cache);

      expect(pois).toHaveLength(2);
      expect(pois[0].name).toBe('Start Point');
      expect(pois[1].name).toBe('Finish Point');
    });

    it('should handle multiple waypoints', () => {
      const waypoint2 = new OpenStreetPOI({
        id: 'waypoint2',
        name: 'Waypoint 2',
        type: 'museum',
        location: { lat: 52.56, lng: 13.46 },
        interest_categories: ['art_museums'],
        description: 'Waypoint 2 description',
        allTags: { wheelchair: 'no' }
      });

      const cache = [waypointPOI, waypoint2];
      const intermediateIds = ['waypoint', 'waypoint2'];

      const pois = buildPOIListForRoute(startPOI, intermediateIds, finishPOI, cache);

      expect(pois).toHaveLength(4);
      expect(pois[0].name).toBe('Start Point');
      expect(pois[1].name).toBe('Waypoint');
      expect(pois[2].name).toBe('Waypoint 2');
      expect(pois[3].name).toBe('Finish Point');
    });
  });
});

