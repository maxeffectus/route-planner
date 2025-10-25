/**
 * Example test file showing how to add new tests
 * This file demonstrates best practices for writing tests
 */
import { UserProfile, MobilityType, TransportMode } from '../../src/models/UserProfile.js';
import { getNextQuestion, processAnswer, getCompletionPercentage } from '../../src/services/SimpleProfileConfig.js';
import { createMockUserProfile, TestDataGenerators } from '../utils/testHelpers.js';

describe('Example: How to Write Tests', () => {
  let profile;
  
  // Setup before each test
  beforeEach(() => {
    profile = new UserProfile('test-user');
  });
  
  // Cleanup after each test
  afterEach(() => {
    // Jest automatically cleans up, but you can add custom cleanup here
  });
  
  describe('Basic Test Structure', () => {
    test('should demonstrate basic assertions', () => {
      // Arrange - Set up test data
      const expectedValue = MobilityType.STANDARD;
      
      // Act - Perform the action being tested
      processAnswer(profile, 'mobility', expectedValue);
      
      // Assert - Verify the results
      expect(profile.mobility).toBe(expectedValue);
      expect(profile.mobility).not.toBe(MobilityType.WHEELCHAIR);
    });
    
    test('should demonstrate array assertions', () => {
      const transportModes = [TransportMode.WALK, TransportMode.BIKE];
      
      processAnswer(profile, 'preferredTransport', transportModes);
      
      expect(profile.preferredTransport).toEqual(transportModes);
      expect(profile.preferredTransport).toHaveLength(2);
      expect(profile.preferredTransport).toContain(TransportMode.WALK);
    });
    
    test('should demonstrate object assertions', () => {
      const interests = {
        [MobilityType.STANDARD]: true,
        [TransportMode.WALK]: false
      };
      
      processAnswer(profile, 'interests', interests);
      
      expect(profile.interests).toEqual(expect.objectContaining(interests));
      expect(profile.interests[MobilityType.STANDARD]).toBe(true);
    });
  });
  
  describe('Using Test Utilities', () => {
    test('should use mock data generators', () => {
      // Use the test data generators
      const mockProfiles = TestDataGenerators.generateProfiles();
      
      expect(mockProfiles.empty).toBeDefined();
      expect(mockProfiles.partial).toBeDefined();
      expect(mockProfiles.complete).toBeDefined();
      
      // Test with mock data
      const emptyProfile = createMockUserProfile();
      expect(emptyProfile.mobility).toBe('__UNFILLED__');
      
      const partialProfile = createMockUserProfile({
        mobility: MobilityType.STANDARD,
        budgetLevel: 2
      });
      expect(partialProfile.mobility).toBe(MobilityType.STANDARD);
      expect(partialProfile.budgetLevel).toBe(2);
    });
  });
  
  describe('Testing Edge Cases', () => {
    test('should handle invalid input gracefully', () => {
      // Test with invalid mobility type
      expect(() => {
        processAnswer(profile, 'mobility', 'invalid_mobility');
      }).not.toThrow();
      
      // Test with null input
      expect(() => {
        processAnswer(profile, 'budgetLevel', null);
      }).not.toThrow();
    });
    
    test('should handle empty arrays', () => {
      processAnswer(profile, 'preferredTransport', []);
      
      expect(profile.preferredTransport).toEqual([]);
      expect(profile.preferredTransport).toHaveLength(0);
    });
    
    test('should handle undefined values', () => {
      processAnswer(profile, 'budgetLevel', undefined);
      
      expect(profile.budgetLevel).toBeUndefined();
    });
  });
  
  describe('Testing Business Logic', () => {
    test('should demonstrate conditional logic testing', () => {
      // Test standard mobility flow
      processAnswer(profile, 'mobility', MobilityType.STANDARD);
      
      let nextQuestion = getNextQuestion(profile);
      expect(nextQuestion.field).toBe('avoidStairs');
      
      // Test wheelchair mobility flow
      const wheelchairProfile = new UserProfile('wheelchair-user');
      processAnswer(wheelchairProfile, 'mobility', MobilityType.WHEELCHAIR);
      
      nextQuestion = getNextQuestion(wheelchairProfile);
      expect(nextQuestion.field).toBe('preferredTransport');
      expect(wheelchairProfile.avoidStairs).toBe(true);
    });
    
    test('should demonstrate completion tracking', () => {
      const initialCompletion = getCompletionPercentage(profile);
      expect(initialCompletion).toBe(0);
      
      processAnswer(profile, 'mobility', MobilityType.STANDARD);
      const afterMobility = getCompletionPercentage(profile);
      expect(afterMobility).toBeGreaterThan(initialCompletion);
      
      // Complete the profile
      processAnswer(profile, 'avoidStairs', false);
      processAnswer(profile, 'preferredTransport', [TransportMode.WALK]);
      processAnswer(profile, 'budgetLevel', 2);
      processAnswer(profile, 'travelPace', 'MEDIUM');
      processAnswer(profile, 'interests', { 'art_museums': true });
      processAnswer(profile, 'dietary', { 'vegetarian': true });
      processAnswer(profile, 'timeWindow', { startHour: 9, endHour: 18 });
      
      const finalCompletion = getCompletionPercentage(profile);
      expect(finalCompletion).toBeGreaterThan(80); // Should be close to 100%
      
      const nextQuestion = getNextQuestion(profile);
      expect(nextQuestion).toBeNull();
    });
  });
  
  describe('Testing Async Operations (Example)', () => {
    test('should demonstrate async testing patterns', async () => {
      // Example of how you might test async operations
      const promise = Promise.resolve('async result');
      
      await expect(promise).resolves.toBe('async result');
      
      // Test async errors
      const errorPromise = Promise.reject(new Error('test error'));
      await expect(errorPromise).rejects.toThrow('test error');
    });
  });
  
  describe('Testing with Mocks (Example)', () => {
    test('should demonstrate mocking patterns', () => {
      // Mock a function
      const mockFunction = jest.fn();
      mockFunction.mockReturnValue('mocked value');
      
      const result = mockFunction();
      
      expect(result).toBe('mocked value');
      expect(mockFunction).toHaveBeenCalledTimes(1);
      
      // Mock with different return values
      mockFunction.mockReturnValueOnce('first call').mockReturnValueOnce('second call');
      
      expect(mockFunction()).toBe('first call');
      expect(mockFunction()).toBe('second call');
    });
  });
});
