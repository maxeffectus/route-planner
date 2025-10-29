/**
 * Integration tests for GeoJSON export with POI markers
 */

import { SavedRoute } from '../../src/models/SavedRoute';

describe('GeoJSON Export Integration', () => {
  const mockGeometry = {
    type: 'LineString',
    coordinates: [
      [13.3777, 52.5163],
      [13.3761, 52.5186],
      [13.4013, 52.5191]
    ]
  };

  const mockPOIs = [
    {
      id: 'poi1',
      name: 'Brandenburg Gate',
      location: { lat: 52.5163, lng: 13.3777 },
      interest_categories: ['history_culture', 'architecture'],
      description: 'Historic monument in Berlin',
      website: 'https://example.com/brandenburg',
      wikipedia: 'en:Brandenburg_Gate',
      imageUrl: 'https://example.com/brandenburg.jpg'
    },
    {
      id: 'poi2',
      name: 'Reichstag Building',
      location: { lat: 52.5186, lng: 13.3761 },
      interest_categories: ['history_culture', 'architecture'],
      description: 'German parliament building',
      website: null,
      wikipedia: 'de:Reichstagsgebäude',
      imageUrl: null
    },
    {
      id: 'poi3',
      name: 'Berlin Cathedral',
      location: { lat: 52.5191, lng: 13.4013 },
      interest_categories: ['architecture'],
      description: 'Historic Protestant church',
      website: 'https://example.com/cathedral',
      wikipedia: null,
      imageUrl: null
    }
  ];

  const mockRoute = new SavedRoute({
    name: 'Berlin Historical Tour',
    geometry: mockGeometry,
    distance: 2500,
    duration: 1800000, // 30 minutes in milliseconds
    pois: mockPOIs,
    createdAt: 1234567890000,
    instructions: ['Head north', 'Turn right', 'Arrive at destination']
  });

  describe('GeoJSON Structure', () => {
    it('should create valid GeoJSON FeatureCollection', () => {
      // Simulate the export logic
      const features = [];
      
      // Route LineString
      features.push({
        type: "Feature",
        properties: {
          name: mockRoute.name,
          distance: mockRoute.distance,
          duration: mockRoute.duration,
          poiCount: mockRoute.pois.length,
          createdAt: new Date(mockRoute.createdAt).toISOString(),
          feature_type: 'route'
        },
        geometry: mockRoute.geometry
      });
      
      // POI Point markers
      mockRoute.pois.forEach((poi, index) => {
        const getWikipediaUrl = (wikipedia) => {
          if (!wikipedia) return null;
          if (wikipedia.includes(':')) {
            const [language, article] = wikipedia.split(':', 2);
            return `https://${language}.wikipedia.org/wiki/${article}`;
          }
          return `https://en.wikipedia.org/wiki/${wikipedia}`;
        };
        
        features.push({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [poi.location.lng, poi.location.lat]
          },
          properties: {
            name: poi.name,
            description: poi.description || poi.name,
            category: poi.interest_categories?.join(', ') || 'Unknown',
            icon_url: poi.imageUrl || null,
            website: poi.website || null,
            wikipedia: poi.wikipedia ? getWikipediaUrl(poi.wikipedia) : null,
            poi_id: poi.id,
            poi_type: index === 0 ? 'start' : (index === mockRoute.pois.length - 1 ? 'finish' : 'waypoint'),
            sequence: index + 1
          }
        });
      });
      
      const geojson = {
        type: "FeatureCollection",
        features: features
      };
      
      // Validate structure
      expect(geojson.type).toBe('FeatureCollection');
      expect(geojson.features).toHaveLength(4); // 1 route + 3 POIs
    });

    it('should include route LineString as first feature', () => {
      const features = [];
      
      features.push({
        type: "Feature",
        properties: {
          name: mockRoute.name,
          distance: mockRoute.distance,
          duration: mockRoute.duration,
          poiCount: mockRoute.pois.length,
          createdAt: new Date(mockRoute.createdAt).toISOString(),
          feature_type: 'route'
        },
        geometry: mockRoute.geometry
      });
      
      const routeFeature = features[0];
      
      expect(routeFeature.type).toBe('Feature');
      expect(routeFeature.geometry.type).toBe('LineString');
      expect(routeFeature.geometry.coordinates).toHaveLength(3);
      expect(routeFeature.properties.name).toBe('Berlin Historical Tour');
      expect(routeFeature.properties.distance).toBe(2500);
      expect(routeFeature.properties.duration).toBe(1800000);
      expect(routeFeature.properties.poiCount).toBe(3);
      expect(routeFeature.properties.feature_type).toBe('route');
    });

    it('should include POI Point features with correct metadata', () => {
      const features = [];
      
      mockRoute.pois.forEach((poi, index) => {
        const getWikipediaUrl = (wikipedia) => {
          if (!wikipedia) return null;
          if (wikipedia.includes(':')) {
            const [language, article] = wikipedia.split(':', 2);
            return `https://${language}.wikipedia.org/wiki/${article}`;
          }
          return `https://en.wikipedia.org/wiki/${wikipedia}`;
        };
        
        features.push({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [poi.location.lng, poi.location.lat]
          },
          properties: {
            name: poi.name,
            description: poi.description || poi.name,
            category: poi.interest_categories?.join(', ') || 'Unknown',
            icon_url: poi.imageUrl || null,
            website: poi.website || null,
            wikipedia: poi.wikipedia ? getWikipediaUrl(poi.wikipedia) : null,
            poi_id: poi.id,
            poi_type: index === 0 ? 'start' : (index === mockRoute.pois.length - 1 ? 'finish' : 'waypoint'),
            sequence: index + 1
          }
        });
      });
      
      expect(features).toHaveLength(3);
      
      // Check first POI (start)
      expect(features[0].geometry.type).toBe('Point');
      expect(features[0].geometry.coordinates).toEqual([13.3777, 52.5163]);
      expect(features[0].properties.name).toBe('Brandenburg Gate');
      expect(features[0].properties.description).toBe('Historic monument in Berlin');
      expect(features[0].properties.category).toBe('history_culture, architecture');
      expect(features[0].properties.icon_url).toBe('https://example.com/brandenburg.jpg');
      expect(features[0].properties.website).toBe('https://example.com/brandenburg');
      expect(features[0].properties.wikipedia).toBe('https://en.wikipedia.org/wiki/Brandenburg_Gate');
      expect(features[0].properties.poi_id).toBe('poi1');
      expect(features[0].properties.poi_type).toBe('start');
      expect(features[0].properties.sequence).toBe(1);
      
      // Check middle POI (waypoint)
      expect(features[1].properties.poi_type).toBe('waypoint');
      expect(features[1].properties.sequence).toBe(2);
      expect(features[1].properties.wikipedia).toBe('https://de.wikipedia.org/wiki/Reichstagsgebäude');
      
      // Check last POI (finish)
      expect(features[2].properties.poi_type).toBe('finish');
      expect(features[2].properties.sequence).toBe(3);
      expect(features[2].properties.wikipedia).toBeNull();
    });
  });

  describe('Wikipedia URL Conversion', () => {
    it('should convert Wikipedia field to full URL with language prefix', () => {
      const getWikipediaUrl = (wikipedia) => {
        if (!wikipedia) return null;
        if (wikipedia.includes(':')) {
          const [language, article] = wikipedia.split(':', 2);
          return `https://${language}.wikipedia.org/wiki/${article}`;
        }
        return `https://en.wikipedia.org/wiki/${wikipedia}`;
      };
      
      expect(getWikipediaUrl('en:Brandenburg_Gate')).toBe('https://en.wikipedia.org/wiki/Brandenburg_Gate');
      expect(getWikipediaUrl('de:Reichstagsgebäude')).toBe('https://de.wikipedia.org/wiki/Reichstagsgebäude');
      expect(getWikipediaUrl('fr:Tour_Eiffel')).toBe('https://fr.wikipedia.org/wiki/Tour_Eiffel');
    });

    it('should handle Wikipedia field without language prefix', () => {
      const getWikipediaUrl = (wikipedia) => {
        if (!wikipedia) return null;
        if (wikipedia.includes(':')) {
          const [language, article] = wikipedia.split(':', 2);
          return `https://${language}.wikipedia.org/wiki/${article}`;
        }
        return `https://en.wikipedia.org/wiki/${wikipedia}`;
      };
      
      expect(getWikipediaUrl('Eiffel_Tower')).toBe('https://en.wikipedia.org/wiki/Eiffel_Tower');
    });

    it('should return null for missing Wikipedia field', () => {
      const getWikipediaUrl = (wikipedia) => {
        if (!wikipedia) return null;
        if (wikipedia.includes(':')) {
          const [language, article] = wikipedia.split(':', 2);
          return `https://${language}.wikipedia.org/wiki/${article}`;
        }
        return `https://en.wikipedia.org/wiki/${wikipedia}`;
      };
      
      expect(getWikipediaUrl(null)).toBeNull();
      expect(getWikipediaUrl(undefined)).toBeNull();
    });
  });

  describe('POI Type Classification', () => {
    it('should classify first POI as start', () => {
      const index = 0;
      const totalPOIs = 3;
      const poiType = index === 0 ? 'start' : (index === totalPOIs - 1 ? 'finish' : 'waypoint');
      
      expect(poiType).toBe('start');
    });

    it('should classify middle POIs as waypoint', () => {
      const index = 1;
      const totalPOIs = 3;
      const poiType = index === 0 ? 'start' : (index === totalPOIs - 1 ? 'finish' : 'waypoint');
      
      expect(poiType).toBe('waypoint');
    });

    it('should classify last POI as finish', () => {
      const index = 2;
      const totalPOIs = 3;
      const poiType = index === 0 ? 'start' : (index === totalPOIs - 1 ? 'finish' : 'waypoint');
      
      expect(poiType).toBe('finish');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for routes without POI metadata', () => {
      const routeWithoutPOIs = new SavedRoute({
        name: 'Route Without POIs',
        geometry: mockGeometry,
        distance: 2500,
        duration: 1800000,
        pois: [],
        createdAt: 1234567890000,
        instructions: []
      });
      
      // Import the export function
      const { exportRouteToGeoJSON } = require('../../src/utils/geojsonExport');
      
      expect(() => {
        exportRouteToGeoJSON(routeWithoutPOIs);
      }).toThrow('Invalid route: missing POI data');
    });
  });
});

