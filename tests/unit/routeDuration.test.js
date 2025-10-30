/**
 * Tests for route duration calculation utilities
 */

import { 
  getPOIVisitDuration, 
  calculatePOIVisitTime, 
  formatDuration, 
  calculateRouteDuration
} from '../../src/utils/routeDuration';
import { TravelPace } from '../../src/models/UserProfile';

describe('Route Duration Utils', () => {
  describe('getPOIVisitDuration', () => {
    it('should return 2.5 hours for LOW pace', () => {
      expect(getPOIVisitDuration(TravelPace.LOW)).toBe(2.5);
    });

    it('should return 2 hours for MEDIUM pace', () => {
      expect(getPOIVisitDuration(TravelPace.MEDIUM)).toBe(2.0);
    });

    it('should return 1.5 hours for HIGH pace', () => {
      expect(getPOIVisitDuration(TravelPace.HIGH)).toBe(1.5);
    });

    it('should default to MEDIUM pace for unknown value', () => {
      expect(getPOIVisitDuration('unknown')).toBe(2.0);
      expect(getPOIVisitDuration(null)).toBe(2.0);
      expect(getPOIVisitDuration(undefined)).toBe(2.0);
    });
  });

  describe('calculatePOIVisitTime', () => {
    it('should calculate visit time for LOW pace', () => {
      // 3 POIs * 2.5 hours = 7.5 hours = 27,000,000 ms
      expect(calculatePOIVisitTime(3, TravelPace.LOW)).toBe(27000000);
    });

    it('should calculate visit time for MEDIUM pace', () => {
      // 3 POIs * 2 hours = 6 hours = 21,600,000 ms
      expect(calculatePOIVisitTime(3, TravelPace.MEDIUM)).toBe(21600000);
    });

    it('should calculate visit time for HIGH pace', () => {
      // 3 POIs * 1.5 hours = 4.5 hours = 16,200,000 ms
      expect(calculatePOIVisitTime(3, TravelPace.HIGH)).toBe(16200000);
    });

    it('should return 0 for 0 POIs', () => {
      expect(calculatePOIVisitTime(0, TravelPace.MEDIUM)).toBe(0);
    });

    it('should return 0 for negative POI count', () => {
      expect(calculatePOIVisitTime(-5, TravelPace.MEDIUM)).toBe(0);
    });

    it('should handle single POI', () => {
      // 1 POI * 2 hours = 2 hours = 7,200,000 ms
      expect(calculatePOIVisitTime(1, TravelPace.MEDIUM)).toBe(7200000);
    });
  });

  describe('formatDuration', () => {
    it('should format hours and minutes correctly', () => {
      // 2 hours 30 minutes = 9,000,000 ms
      expect(formatDuration(9000000)).toBe('02:30');
    });

    it('should format single digit hours with leading zero', () => {
      // 1 hour 15 minutes = 4,500,000 ms
      expect(formatDuration(4500000)).toBe('01:15');
    });

    it('should format double digit hours', () => {
      // 12 hours 45 minutes = 45,900,000 ms
      expect(formatDuration(45900000)).toBe('12:45');
    });

    it('should format minutes with leading zero', () => {
      // 3 hours 5 minutes = 11,100,000 ms
      expect(formatDuration(11100000)).toBe('03:05');
    });

    it('should handle zero duration', () => {
      expect(formatDuration(0)).toBe('00:00');
    });

    it('should handle null/undefined', () => {
      expect(formatDuration(null)).toBe('00:00');
      expect(formatDuration(undefined)).toBe('00:00');
    });

    it('should handle negative values', () => {
      expect(formatDuration(-1000)).toBe('00:00');
    });

    it('should round to nearest minute', () => {
      // 1 hour 0 min 29 seconds = 3,629,000 ms -> rounds to 1:00
      expect(formatDuration(3629000)).toBe('01:00');
      // 1 hour 0 min 31 seconds = 3,631,000 ms -> rounds to 1:01
      expect(formatDuration(3631000)).toBe('01:01');
      // 1 hour 1 min 29 seconds = 3,689,000 ms -> rounds to 1:01
      expect(formatDuration(3689000)).toBe('01:01');
      // 1 hour 1 min 30 seconds = 3,690,000 ms -> rounds to 1:02
      expect(formatDuration(3690000)).toBe('01:02');
    });

    it('should format long durations correctly', () => {
      // 24 hours = 86,400,000 ms
      expect(formatDuration(86400000)).toBe('24:00');
      // 100 hours 30 minutes = 361,800,000 ms
      expect(formatDuration(361800000)).toBe('100:30');
    });
  });

  describe('calculateRouteDuration', () => {
    it('should calculate total duration with all components', () => {
      // Travel: 1 hour (3,600,000 ms)
      // Visit: 3 POIs * 2 hours = 6 hours (21,600,000 ms)
      // Total: 7 hours (25,200,000 ms)
      const result = calculateRouteDuration(3600000, 3, TravelPace.MEDIUM);
      
      expect(result.total).toBe(25200000);
      expect(result.travel).toBe(3600000);
      expect(result.visit).toBe(21600000);
      expect(result.formatted.total).toBe('07:00');
      expect(result.formatted.travel).toBe('01:00');
      expect(result.formatted.visit).toBe('06:00');
    });

    it('should handle LOW pace', () => {
      // Travel: 30 minutes (1,800,000 ms)
      // Visit: 2 POIs * 2.5 hours = 5 hours (18,000,000 ms)
      // Total: 5.5 hours (19,800,000 ms)
      const result = calculateRouteDuration(1800000, 2, TravelPace.LOW);
      
      expect(result.total).toBe(19800000);
      expect(result.formatted.total).toBe('05:30');
      expect(result.formatted.travel).toBe('00:30');
      expect(result.formatted.visit).toBe('05:00');
    });

    it('should handle HIGH pace', () => {
      // Travel: 45 minutes (2,700,000 ms)
      // Visit: 4 POIs * 1.5 hours = 6 hours (21,600,000 ms)
      // Total: 6.75 hours (24,300,000 ms)
      const result = calculateRouteDuration(2700000, 4, TravelPace.HIGH);
      
      expect(result.total).toBe(24300000);
      expect(result.formatted.total).toBe('06:45');
      expect(result.formatted.travel).toBe('00:45');
      expect(result.formatted.visit).toBe('06:00');
    });

    it('should handle zero POIs', () => {
      // Travel: 2 hours (7,200,000 ms)
      // Visit: 0 POIs = 0
      const result = calculateRouteDuration(7200000, 0, TravelPace.MEDIUM);
      
      expect(result.total).toBe(7200000);
      expect(result.travel).toBe(7200000);
      expect(result.visit).toBe(0);
      expect(result.formatted.total).toBe('02:00');
      expect(result.formatted.travel).toBe('02:00');
      expect(result.formatted.visit).toBe('00:00');
    });

    it('should handle zero travel time', () => {
      // Travel: 0
      // Visit: 3 POIs * 2 hours = 6 hours (21,600,000 ms)
      const result = calculateRouteDuration(0, 3, TravelPace.MEDIUM);
      
      expect(result.total).toBe(21600000);
      expect(result.travel).toBe(0);
      expect(result.visit).toBe(21600000);
      expect(result.formatted.total).toBe('06:00');
      expect(result.formatted.travel).toBe('00:00');
      expect(result.formatted.visit).toBe('06:00');
    });

    it('should handle null travel duration', () => {
      const result = calculateRouteDuration(null, 2, TravelPace.MEDIUM);
      
      expect(result.travel).toBe(0);
      expect(result.visit).toBe(14400000); // 2 * 2 hours
      expect(result.total).toBe(14400000);
    });

    it('should default to MEDIUM pace for unknown pace', () => {
      const result = calculateRouteDuration(3600000, 1, 'unknown');
      
      // 1 POI * 2 hours (MEDIUM) = 2 hours
      expect(result.visit).toBe(7200000);
      expect(result.formatted.visit).toBe('02:00');
    });

    it('should handle realistic route scenario', () => {
      // Realistic: 35 min travel, 5 POIs, MEDIUM pace
      // Travel: 35 minutes (2,100,000 ms)
      // Visit: 5 POIs * 2 hours = 10 hours (36,000,000 ms)
      // Total: 10 hours 35 minutes (38,100,000 ms)
      const result = calculateRouteDuration(2100000, 5, TravelPace.MEDIUM);
      
      expect(result.formatted.total).toBe('10:35');
      expect(result.formatted.travel).toBe('00:35');
      expect(result.formatted.visit).toBe('10:00');
    });
  });
});

