/**
 * Integration tests for KML export with POI markers
 */

import { SavedRoute } from '../../src/models/SavedRoute';
import { exportRouteToKML } from '../../src/utils/kmlExport';

describe('KML Export Integration', () => {
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

  describe('KML Structure', () => {
    it('should create valid KML document', () => {
      const kml = exportRouteToKML(mockRoute);
      
      expect(kml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(kml).toContain('<kml xmlns="http://www.opengis.net/kml/2.2">');
      expect(kml).toContain('<Document>');
      expect(kml).toContain('</Document>');
      expect(kml).toContain('</kml>');
    });

    it('should include document name and description', () => {
      const kml = exportRouteToKML(mockRoute);
      
      expect(kml).toContain('<name>Berlin Historical Tour</name>');
      expect(kml).toContain('<description>Route exported from Route Planner</description>');
    });

    it('should include styles for markers and route', () => {
      const kml = exportRouteToKML(mockRoute);
      
      expect(kml).toContain('<Style id="routeStyle">');
      expect(kml).toContain('<Style id="startStyle">');
      expect(kml).toContain('<Style id="finishStyle">');
      expect(kml).toContain('<Style id="waypointStyle">');
    });
  });

  describe('Route LineString', () => {
    it('should create Placemark for route with LineString', () => {
      const kml = exportRouteToKML(mockRoute);
      
      expect(kml).toContain('<LineString>');
      expect(kml).toContain('<tessellate>1</tessellate>');
      expect(kml).toContain('<coordinates>');
      expect(kml).toContain('</coordinates>');
      expect(kml).toContain('</LineString>');
    });

    it('should include route metadata in description', () => {
      const kml = exportRouteToKML(mockRoute);
      
      expect(kml).toContain('Distance: 2.50 km');
      expect(kml).toContain('Duration: 30 minutes');
      expect(kml).toContain('POIs: 3 points');
    });

    it('should include route extended data', () => {
      const kml = exportRouteToKML(mockRoute);
      
      expect(kml).toContain('<Data name="distance">');
      expect(kml).toContain('<value>2500</value>');
      expect(kml).toContain('<Data name="duration">');
      expect(kml).toContain('<value>1800000</value>');
      expect(kml).toContain('<Data name="poi_count">');
      expect(kml).toContain('<value>3</value>');
    });

    it('should convert GeoJSON coordinates to KML format', () => {
      const kml = exportRouteToKML(mockRoute);
      
      // KML uses lon,lat,altitude format
      expect(kml).toContain('13.3777,52.5163,0');
      expect(kml).toContain('13.3761,52.5186,0');
      expect(kml).toContain('13.4013,52.5191,0');
    });
  });

  describe('POI Placemarks', () => {
    it('should create Placemark for each POI', () => {
      const kml = exportRouteToKML(mockRoute);
      
      // Count Placemark occurrences (1 for route + 3 for POIs)
      const placemarkCount = (kml.match(/<Placemark>/g) || []).length;
      expect(placemarkCount).toBe(4);
    });

    it('should include POI name and description', () => {
      const kml = exportRouteToKML(mockRoute);
      
      expect(kml).toContain('<name>Brandenburg Gate</name>');
      expect(kml).toContain('<description>Historic monument in Berlin');
      expect(kml).toContain('<name>Reichstag Building</name>');
      expect(kml).toContain('<name>Berlin Cathedral</name>');
    });

    it('should include Point coordinates for POIs', () => {
      const kml = exportRouteToKML(mockRoute);
      
      expect(kml).toContain('<Point>');
      expect(kml).toContain('<coordinates>13.3777,52.5163,0</coordinates>');
      expect(kml).toContain('<coordinates>13.3761,52.5186,0</coordinates>');
      expect(kml).toContain('<coordinates>13.4013,52.5191,0</coordinates>');
    });

    it('should apply correct styles based on POI type', () => {
      const kml = exportRouteToKML(mockRoute);
      
      // First POI should be start
      const startIndex = kml.indexOf('<name>Brandenburg Gate</name>');
      const startStyleIndex = kml.indexOf('<styleUrl>#startStyle</styleUrl>');
      expect(startStyleIndex).toBeGreaterThan(startIndex);
      
      // Last POI should be finish
      const finishIndex = kml.indexOf('<name>Berlin Cathedral</name>');
      const finishStyleIndex = kml.indexOf('<styleUrl>#finishStyle</styleUrl>');
      expect(finishStyleIndex).toBeGreaterThan(finishIndex);
      
      // Middle POI should be waypoint
      expect(kml).toContain('<styleUrl>#waypointStyle</styleUrl>');
    });

    it('should include extended data for POIs', () => {
      const kml = exportRouteToKML(mockRoute);
      
      expect(kml).toContain('<Data name="category">');
      expect(kml).toContain('<value>history_culture, architecture</value>');
      expect(kml).toContain('<Data name="poi_type">');
      expect(kml).toContain('<value>start</value>');
      expect(kml).toContain('<value>finish</value>');
      expect(kml).toContain('<value>waypoint</value>');
      expect(kml).toContain('<Data name="sequence">');
      expect(kml).toContain('<Data name="poi_id">');
    });

    it('should include website URLs in extended data', () => {
      const kml = exportRouteToKML(mockRoute);
      
      expect(kml).toContain('<Data name="website">');
      expect(kml).toContain('<value>https://example.com/brandenburg</value>');
      expect(kml).toContain('<value>https://example.com/cathedral</value>');
    });

    it('should convert Wikipedia references to full URLs', () => {
      const kml = exportRouteToKML(mockRoute);
      
      expect(kml).toContain('<Data name="wikipedia">');
      expect(kml).toContain('<value>https://en.wikipedia.org/wiki/Brandenburg_Gate</value>');
      expect(kml).toContain('<value>https://de.wikipedia.org/wiki/Reichstagsgebäude</value>');
    });

    it('should include icon URLs in extended data', () => {
      const kml = exportRouteToKML(mockRoute);
      
      expect(kml).toContain('<Data name="icon_url">');
      expect(kml).toContain('<value>https://example.com/brandenburg.jpg</value>');
    });
  });

  describe('XML Escaping', () => {
    it('should escape special XML characters in names', () => {
      const routeWithSpecialChars = new SavedRoute({
        name: 'Tour with <special> & "characters"',
        geometry: mockGeometry,
        distance: 2500,
        duration: 1800000,
        pois: [{
          id: 'poi1',
          name: 'Place with & < > " \' characters',
          location: { lat: 52.5163, lng: 13.3777 },
          interest_categories: ['test'],
          description: 'Description with <tags> & "quotes"'
        }, {
          id: 'poi2',
          name: 'Another place',
          location: { lat: 52.5186, lng: 13.3761 },
          interest_categories: [],
          description: 'Test'
        }],
        createdAt: Date.now(),
        instructions: []
      });
      
      const kml = exportRouteToKML(routeWithSpecialChars);
      
      expect(kml).toContain('Tour with &lt;special&gt; &amp; &quot;characters&quot;');
      expect(kml).toContain('Place with &amp; &lt; &gt; &quot; &apos; characters');
      expect(kml).toContain('Description with &lt;tags&gt; &amp; &quot;quotes&quot;');
    });
  });

  describe('Error Handling', () => {
    it('should throw error for routes without geometry', () => {
      const routeWithoutGeometry = new SavedRoute({
        name: 'Invalid Route',
        geometry: null,
        distance: 2500,
        duration: 1800000,
        pois: mockPOIs,
        createdAt: Date.now(),
        instructions: []
      });
      
      expect(() => {
        exportRouteToKML(routeWithoutGeometry);
      }).toThrow('Invalid route: missing geometry');
    });

    it('should throw error for routes without POI metadata', () => {
      const routeWithoutPOIs = new SavedRoute({
        name: 'Route Without POIs',
        geometry: mockGeometry,
        distance: 2500,
        duration: 1800000,
        pois: [],
        createdAt: Date.now(),
        instructions: []
      });
      
      expect(() => {
        exportRouteToKML(routeWithoutPOIs);
      }).toThrow('Invalid route: missing POI data');
    });
  });

  describe('Style Definitions', () => {
    it('should define route line style with correct color and width', () => {
      const kml = exportRouteToKML(mockRoute);
      
      expect(kml).toContain('<Style id="routeStyle">');
      expect(kml).toContain('<LineStyle>');
      expect(kml).toContain('<color>ff0000ff</color>'); // Red line
      expect(kml).toContain('<width>4</width>');
    });

    it('should define start marker style with green color', () => {
      const kml = exportRouteToKML(mockRoute);
      
      expect(kml).toContain('<Style id="startStyle">');
      expect(kml).toContain('<IconStyle>');
      expect(kml).toContain('<color>ff00ff00</color>'); // Green
      expect(kml).toContain('<scale>1.3</scale>');
      expect(kml).toContain('grn-circle.png');
    });

    it('should define finish marker style with red color', () => {
      const kml = exportRouteToKML(mockRoute);
      
      expect(kml).toContain('<Style id="finishStyle">');
      expect(kml).toContain('<color>ff0000ff</color>'); // Red
      expect(kml).toContain('red-circle.png');
    });

    it('should define waypoint marker style with yellow color', () => {
      const kml = exportRouteToKML(mockRoute);
      
      expect(kml).toContain('<Style id="waypointStyle">');
      expect(kml).toContain('<color>ff00ffff</color>'); // Yellow
      expect(kml).toContain('ylw-circle.png');
    });
  });
});

