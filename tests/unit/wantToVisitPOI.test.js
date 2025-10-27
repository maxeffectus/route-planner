import { UserProfile, UNFILLED_MARKERS } from '../../src/models/UserProfile';
import { OpenStreetPOI } from '../../src/models/POI';

describe('Want to Visit POI Functionality', () => {
  describe('UserProfile wantToVisit methods', () => {
    test('should initialize wantToVisitPOIs as UNFILLED_MARKERS.OBJECT', () => {
      const profile = new UserProfile();
      expect(profile.wantToVisitPOIs).toBe(UNFILLED_MARKERS.OBJECT);
    });

    test('should add POI to wantToVisit list', () => {
      const profile = new UserProfile();
      const poi = new OpenStreetPOI({
        id: 'node/123',
        name: 'Test POI',
        location: { lat: 48.8584, lng: 2.2945 }
      });
      
      profile.addWantToVisit(poi);
      
      expect(profile.wantToVisitPOIs['node/123']).toBeDefined();
      expect(profile.wantToVisitPOIs['node/123'].name).toBe('Test POI');
      expect(profile.wantToVisitPOIs['node/123'].location).toEqual({ lat: 48.8584, lng: 2.2945 });
      expect(profile.wantToVisitPOIs['node/123'].addedAt).toBeDefined();
    });

    test('should remove POI from wantToVisit list', () => {
      const profile = new UserProfile();
      const poi = new OpenStreetPOI({
        id: 'node/123',
        name: 'Test POI',
        location: { lat: 48.8584, lng: 2.2945 }
      });
      
      profile.addWantToVisit(poi);
      expect(profile.isWantToVisit('node/123')).toBe(true);
      
      profile.removeWantToVisit('node/123');
      expect(profile.isWantToVisit('node/123')).toBe(false);
    });

    test('should check if POI is in wantToVisit list', () => {
      const profile = new UserProfile();
      const poi = new OpenStreetPOI({
        id: 'node/123',
        name: 'Test POI',
        location: { lat: 48.8584, lng: 2.2945 }
      });
      
      expect(profile.isWantToVisit('node/123')).toBe(false);
      
      profile.addWantToVisit(poi);
      expect(profile.isWantToVisit('node/123')).toBe(true);
    });

    test('should return empty object for getWantToVisitPOIs when unfilled', () => {
      const profile = new UserProfile();
      expect(profile.getWantToVisitPOIs()).toEqual({});
    });

    test('should return all wantToVisit POIs', () => {
      const profile = new UserProfile();
      const poi1 = new OpenStreetPOI({
        id: 'node/123',
        name: 'POI 1',
        location: { lat: 48.8584, lng: 2.2945 }
      });
      const poi2 = new OpenStreetPOI({
        id: 'node/456',
        name: 'POI 2',
        location: { lat: 48.8606, lng: 2.3376 }
      });
      
      profile.addWantToVisit(poi1);
      profile.addWantToVisit(poi2);
      
      const wantToVisit = profile.getWantToVisitPOIs();
      expect(Object.keys(wantToVisit)).toHaveLength(2);
      expect(wantToVisit['node/123']).toBeDefined();
      expect(wantToVisit['node/456']).toBeDefined();
    });

    test('should handle multiple additions of same POI', () => {
      const profile = new UserProfile();
      const poi = new OpenStreetPOI({
        id: 'node/123',
        name: 'Test POI',
        location: { lat: 48.8584, lng: 2.2945 }
      });
      
      profile.addWantToVisit(poi);
      const firstAddedAt = profile.wantToVisitPOIs['node/123'].addedAt;
      
      // Add again immediately
      profile.addWantToVisit(poi);
      const secondAddedAt = profile.wantToVisitPOIs['node/123'].addedAt;
      
      // Should update timestamp
      expect(secondAddedAt).toBeGreaterThanOrEqual(firstAddedAt);
    });
  });

  describe('UserProfile serialization with wantToVisit', () => {
    test('should serialize wantToVisitPOIs in toJSON', () => {
      const profile = new UserProfile();
      const poi = new OpenStreetPOI({
        id: 'node/123',
        name: 'Test POI',
        location: { lat: 48.8584, lng: 2.2945 }
      });
      
      profile.addWantToVisit(poi);
      
      const json = profile.toJSON();
      expect(json.wantToVisitPOIs).toBeDefined();
      expect(json.wantToVisitPOIs['node/123']).toBeDefined();
    });

    test('should deserialize wantToVisitPOIs from JSON', () => {
      const data = {
        userId: 'test',
        wantToVisitPOIs: {
          'node/123': {
            name: 'Test POI',
            addedAt: 1698765432000,
            location: { lat: 48.8584, lng: 2.2945 }
          }
        }
      };
      
      const profile = UserProfile.fromJSON(data);
      expect(profile.isWantToVisit('node/123')).toBe(true);
      expect(profile.wantToVisitPOIs['node/123'].name).toBe('Test POI');
    });

    test('should handle missing wantToVisitPOIs in fromJSON', () => {
      const data = { userId: 'test' };
      const profile = UserProfile.fromJSON(data);
      
      expect(profile.wantToVisitPOIs).toBe(UNFILLED_MARKERS.OBJECT);
      expect(profile.isWantToVisit('node/123')).toBe(false);
    });
  });

  describe('OpenStreetPOI wantToVisit field', () => {
    test('should initialize wantToVisit as false by default', () => {
      const poi = new OpenStreetPOI({
        id: 'node/123',
        name: 'Test POI'
      });
      
      expect(poi.wantToVisit).toBe(false);
    });

    test('should initialize wantToVisit from data', () => {
      const poi = new OpenStreetPOI({
        id: 'node/123',
        name: 'Test POI',
        wantToVisit: true
      });
      
      expect(poi.wantToVisit).toBe(true);
    });

    test('should include wantToVisit in toJSON', () => {
      const poi = new OpenStreetPOI({
        id: 'node/123',
        name: 'Test POI',
        wantToVisit: true
      });
      
      const json = poi.toJSON();
      expect(json.wantToVisit).toBe(true);
    });

    test('should restore wantToVisit from JSON', () => {
      const data = {
        id: 'node/123',
        name: 'Test POI',
        wantToVisit: true
      };
      
      const poi = OpenStreetPOI.fromJSON(data);
      expect(poi.wantToVisit).toBe(true);
    });
  });

  describe('POI sorting with wantToVisit', () => {
    test('should sort wantToVisit POIs before others', () => {
      const pois = [
        new OpenStreetPOI({ id: '1', name: 'B POI', wantToVisit: false }),
        new OpenStreetPOI({ id: '2', name: 'A POI', wantToVisit: true }),
        new OpenStreetPOI({ id: '3', name: 'C POI', wantToVisit: false }),
        new OpenStreetPOI({ id: '4', name: 'D POI', wantToVisit: true })
      ];
      
      const sorted = pois.sort((a, b) => {
        if (a.wantToVisit && !b.wantToVisit) return -1;
        if (!a.wantToVisit && b.wantToVisit) return 1;
        return a.name.localeCompare(b.name);
      });
      
      expect(sorted[0].wantToVisit).toBe(true);
      expect(sorted[1].wantToVisit).toBe(true);
      expect(sorted[2].wantToVisit).toBe(false);
      expect(sorted[3].wantToVisit).toBe(false);
    });

    test('should sort alphabetically within wantToVisit group', () => {
      const pois = [
        new OpenStreetPOI({ id: '1', name: 'C POI', wantToVisit: true }),
        new OpenStreetPOI({ id: '2', name: 'A POI', wantToVisit: true }),
        new OpenStreetPOI({ id: '3', name: 'B POI', wantToVisit: true })
      ];
      
      const sorted = pois.sort((a, b) => {
        if (a.wantToVisit && !b.wantToVisit) return -1;
        if (!a.wantToVisit && b.wantToVisit) return 1;
        return a.name.localeCompare(b.name);
      });
      
      expect(sorted[0].name).toBe('A POI');
      expect(sorted[1].name).toBe('B POI');
      expect(sorted[2].name).toBe('C POI');
    });

    test('should sort alphabetically within non-wantToVisit group', () => {
      const pois = [
        new OpenStreetPOI({ id: '1', name: 'Z POI', wantToVisit: false }),
        new OpenStreetPOI({ id: '2', name: 'X POI', wantToVisit: false }),
        new OpenStreetPOI({ id: '3', name: 'Y POI', wantToVisit: false })
      ];
      
      const sorted = pois.sort((a, b) => {
        if (a.wantToVisit && !b.wantToVisit) return -1;
        if (!a.wantToVisit && b.wantToVisit) return 1;
        return a.name.localeCompare(b.name);
      });
      
      expect(sorted[0].name).toBe('X POI');
      expect(sorted[1].name).toBe('Y POI');
      expect(sorted[2].name).toBe('Z POI');
    });
  });

  describe('Edge cases', () => {
    test('should handle empty POI ID', () => {
      const profile = new UserProfile();
      expect(profile.isWantToVisit('')).toBe(false);
    });

    test('should handle null POI ID', () => {
      const profile = new UserProfile();
      expect(profile.isWantToVisit(null)).toBe(false);
    });

    test('should handle undefined POI ID', () => {
      const profile = new UserProfile();
      expect(profile.isWantToVisit(undefined)).toBe(false);
    });

    test('should handle POI without location', () => {
      const profile = new UserProfile();
      const poi = new OpenStreetPOI({
        id: 'node/123',
        name: 'Test POI'
      });
      
      profile.addWantToVisit(poi);
      expect(profile.wantToVisitPOIs['node/123'].location).toBeUndefined();
    });

    test('should remove non-existent POI gracefully', () => {
      const profile = new UserProfile();
      expect(() => profile.removeWantToVisit('node/999')).not.toThrow();
    });
  });
});
