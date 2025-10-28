import { calculateDistance } from '../../src/utils/geography';
import { sortWaypointsByNearestNeighbor } from '../../src/utils/routeOptimization';

describe('Route Optimization', () => {
  describe('calculateDistance', () => {
    test('should calculate distance between two known points', () => {
      // Eiffel Tower, Paris
      const point1 = { lat: 48.8584, lng: 2.2945 };
      // Louvre Museum, Paris
      const point2 = { lat: 48.8606, lng: 2.3376 };
      
      const distance = calculateDistance(point1, point2);
      
      // Expected distance is approximately 3.2 km
      expect(distance).toBeGreaterThan(3000);
      expect(distance).toBeLessThan(3500);
    });

    test('should return 0 for same point', () => {
      const point = { lat: 48.8584, lng: 2.2945 };
      const distance = calculateDistance(point, point);
      expect(distance).toBe(0);
    });

    test('should return small positive value for very close points', () => {
      const point1 = { lat: 48.8584, lng: 2.2945 };
      const point2 = { lat: 48.8585, lng: 2.2946 };
      
      const distance = calculateDistance(point1, point2);
      
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(100); // Less than 100 meters
    });

    test('should calculate distance along same meridian (North-South)', () => {
      // Approximate distance along meridian
      const point1 = { lat: 0, lng: 0 };
      const point2 = { lat: 1, lng: 0 };
      
      const distance = calculateDistance(point1, point2);
      
      // 1 degree of latitude is approximately 111 km
      expect(distance).toBeGreaterThan(110000);
      expect(distance).toBeLessThan(112000);
    });

    test('should calculate distance along same parallel (East-West)', () => {
      // At equator, 1 degree of longitude is approximately 111 km
      const point1 = { lat: 0, lng: 0 };
      const point2 = { lat: 0, lng: 1 };
      
      const distance = calculateDistance(point1, point2);
      
      expect(distance).toBeGreaterThan(110000);
      expect(distance).toBeLessThan(112000);
    });

    test('should always return positive distance', () => {
      const point1 = { lat: 48.8584, lng: 2.2945 };
      const point2 = { lat: 40.7128, lng: -74.0060 }; // New York
      
      const distance = calculateDistance(point1, point2);
      expect(distance).toBeGreaterThan(0);
    });
  });

  describe('sortWaypointsByNearestNeighbor', () => {
    test('should return empty array for empty waypoints', () => {
      const startPOI = { id: 'start', location: { lat: 0, lng: 0 } };
      const finishPOI = { id: 'finish', location: { lat: 1, lng: 1 } };
      
      const sorted = sortWaypointsByNearestNeighbor(startPOI, finishPOI, []);
      
      expect(sorted).toEqual([]);
    });

    test('should return single waypoint as-is', () => {
      const startPOI = { id: 'start', location: { lat: 0, lng: 0 } };
      const finishPOI = { id: 'finish', location: { lat: 1, lng: 1 } };
      const waypoint = { id: 'w1', location: { lat: 0.5, lng: 0.5 } };
      
      const sorted = sortWaypointsByNearestNeighbor(startPOI, finishPOI, [waypoint]);
      
      expect(sorted).toHaveLength(1);
      expect(sorted[0].id).toBe('w1');
    });

    test('should sort 2 waypoints - nearest first', () => {
      const startPOI = { id: 'start', location: { lat: 0, lng: 0 } };
      const finishPOI = { id: 'finish', location: { lat: 10, lng: 10 } };
      
      const waypoint1 = { id: 'w1', location: { lat: 5, lng: 5 } }; // Far from start
      const waypoint2 = { id: 'w2', location: { lat: 0.1, lng: 0.1 } }; // Close to start
      
      const sorted = sortWaypointsByNearestNeighbor(startPOI, finishPOI, [waypoint1, waypoint2]);
      
      expect(sorted).toHaveLength(2);
      // w2 should be first as it's closer to start
      expect(sorted[0].id).toBe('w2');
      expect(sorted[1].id).toBe('w1');
    });

    test('should sort 3+ waypoints - verify optimal order', () => {
      const startPOI = { id: 'start', location: { lat: 0, lng: 0 } };
      const finishPOI = { id: 'finish', location: { lat: 10, lng: 10 } };
      
      // Create waypoints in a line from start to finish
      const waypoint1 = { id: 'w1', location: { lat: 1, lng: 1 } }; // First after start
      const waypoint2 = { id: 'w2', location: { lat: 3, lng: 3 } }; // Second
      const waypoint3 = { id: 'w3', location: { lat: 2, lng: 2 } }; // Between w1 and w2
      
      const sorted = sortWaypointsByNearestNeighbor(startPOI, finishPOI, [waypoint1, waypoint2, waypoint3]);
      
      expect(sorted).toHaveLength(3);
      // Should visit in order: w1 (closest to start), then w3, then w2
      expect(sorted[0].id).toBe('w1');
      expect(sorted[1].id).toBe('w3');
      expect(sorted[2].id).toBe('w2');
    });

    test('should handle waypoints in a line', () => {
      const startPOI = { id: 'start', location: { lat: 0, lng: 0 } };
      const finishPOI = { id: 'finish', location: { lat: 5, lng: 0 } };
      
      // Waypoints along the same line
      const waypoint1 = { id: 'w1', location: { lat: 1, lng: 0 } };
      const waypoint2 = { id: 'w2', location: { lat: 2, lng: 0 } };
      const waypoint3 = { id: 'w3', location: { lat: 3, lng: 0 } };
      const waypoint4 = { id: 'w4', location: { lat: 4, lng: 0 } };
      
      const sorted = sortWaypointsByNearestNeighbor(startPOI, finishPOI, [waypoint4, waypoint2, waypoint3, waypoint1]);
      
      expect(sorted).toHaveLength(4);
      // Should visit sequentially along the line
      expect(sorted[0].id).toBe('w1');
      expect(sorted[1].id).toBe('w2');
      expect(sorted[2].id).toBe('w3');
      expect(sorted[3].id).toBe('w4');
    });

    test('should handle scattered waypoints', () => {
      const startPOI = { id: 'start', location: { lat: 0, lng: 0 } };
      const finishPOI = { id: 'finish', location: { lat: 0, lng: 10 } };
      
      // Scattered waypoints
      const waypoint1 = { id: 'w1', location: { lat: 2, lng: 2 } }; // North-east from start
      const waypoint2 = { id: 'w2', location: { lat: 5, lng: 5 } }; // Far north-east
      const waypoint3 = { id: 'w3', location: { lat: 1, lng: 3 } }; // Between start and others
      
      const sorted = sortWaypointsByNearestNeighbor(startPOI, finishPOI, [waypoint2, waypoint1, waypoint3]);
      
      expect(sorted).toHaveLength(3);
      // Should find nearest neighbor at each step
      // w1 at (2,2) is actually closest to start (0,0) with distance ~314 km
      // w3 at (1,3) has distance ~335 km  
      // w2 at (5,5) has distance ~707 km
      expect(sorted[0].id).toBe('w1'); // Closest to start (at 2,2)
      expect(sorted[1].id).toBe('w3'); // Closest to w1 (at 1,3)
      expect(sorted[2].id).toBe('w2'); // Remaining waypoint
    });

    test('should handle clustered waypoints', () => {
      const startPOI = { id: 'start', location: { lat: 0, lng: 0 } };
      const finishPOI = { id: 'finish', location: { lat: 10, lng: 10 } };
      
      // Two clusters of waypoints
      const waypoint1 = { id: 'w1', location: { lat: 1, lng: 1 } }; // Cluster 1
      const waypoint2 = { id: 'w2', location: { lat: 1.1, lng: 1.1 } }; // Cluster 1 (very close to w1)
      const waypoint3 = { id: 'w3', location: { lat: 5, lng: 5 } }; // Cluster 2
      const waypoint4 = { id: 'w4', location: { lat: 5.1, lng: 5.1 } }; // Cluster 2 (very close to w3)
      
      const sorted = sortWaypointsByNearestNeighbor(startPOI, finishPOI, [waypoint3, waypoint1, waypoint4, waypoint2]);
      
      expect(sorted).toHaveLength(4);
      // Should visit cluster 1 first (w1 and w2 close to start)
      expect(sorted[0].id).toBe('w1');
      expect(sorted[1].id).toBe('w2');
      // Then cluster 2
      expect(sorted[2].id).toBe('w3');
      expect(sorted[3].id).toBe('w4');
    });

    test('should not modify original waypoints array', () => {
      const startPOI = { id: 'start', location: { lat: 0, lng: 0 } };
      const finishPOI = { id: 'finish', location: { lat: 10, lng: 10 } };
      
      const waypoints = [
        { id: 'w1', location: { lat: 2, lng: 2 } },
        { id: 'w2', location: { lat: 1, lng: 1 } }
      ];
      const originalWaypoints = [...waypoints];
      
      const sorted = sortWaypointsByNearestNeighbor(startPOI, finishPOI, waypoints);
      
      expect(waypoints).toEqual(originalWaypoints);
    });
  });
});

