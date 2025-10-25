/**
 * Unit tests for enum values used in SimpleProfileConfig
 */
import { MobilityType, TransportMode, InterestCategory } from '../../src/models/UserProfile.js';

describe('Enum Values Tests', () => {
  describe('MobilityType', () => {
    test('should have all required values', () => {
      const expectedValues = [
        MobilityType.STANDARD,
        MobilityType.WHEELCHAIR, 
        MobilityType.STROLLER,
        MobilityType.LOW_ENDURANCE
      ];
      
      expectedValues.forEach(value => {
        expect(value).toBeDefined();
        expect(typeof value).toBe('string');
      });
    });
    
    test('should have unique values', () => {
      const values = Object.values(MobilityType);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });
  
  describe('TransportMode', () => {
    test('should have all required values', () => {
      const expectedValues = [
        TransportMode.WALK,
        TransportMode.BIKE,
        TransportMode.PUBLIC_TRANSIT,
        TransportMode.CAR_TAXI
      ];
      
      expectedValues.forEach(value => {
        expect(value).toBeDefined();
        expect(typeof value).toBe('string');
      });
    });
    
    test('should have unique values', () => {
      const values = Object.values(TransportMode);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });
  
  describe('InterestCategory', () => {
    test('should have all required values', () => {
      const expectedValues = [
        InterestCategory.NATURE_PARKS,
        InterestCategory.ENTERTAINMENT,
        InterestCategory.ART_MUSEUMS,
        InterestCategory.HISTORY_CULTURE,
        InterestCategory.GASTRONOMY,
        InterestCategory.NIGHTLIFE,
        InterestCategory.ARCHITECTURE
      ];
      
      expectedValues.forEach(value => {
        expect(value).toBeDefined();
        expect(typeof value).toBe('string');
      });
    });
    
    test('should have unique values', () => {
      const values = Object.values(InterestCategory);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });
  
  describe('String Constants', () => {
    test('should validate travel pace values', () => {
      const travelPaceValues = ['LOW', 'MEDIUM', 'HIGH'];
      travelPaceValues.forEach(value => {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      });
    });
    
    test('should validate budget level values', () => {
      const budgetLevelValues = [0, 1, 2, 3];
      budgetLevelValues.forEach(value => {
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(3);
      });
    });
  });
});
