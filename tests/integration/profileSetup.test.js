/**
 * Integration tests for SimpleProfileConfig and UserProfile interaction
 */
import { UserProfile, MobilityType, TransportMode, InterestCategory, UNFILLED_MARKERS } from '../../src/models/UserProfile.js';
import { getNextQuestion, processAnswer, getCompletionPercentage } from '../../src/services/SimpleProfileConfig.js';
import { createMockUserProfile, TestDataGenerators } from '../utils/testHelpers.js';

describe('Profile Setup Integration Tests', () => {
  let profile;
  
  beforeEach(() => {
    profile = new UserProfile('test-user');
  });
  
  describe('Complete profile flow', () => {
    test('should complete full profile setup flow', () => {
      // Step 1: Mobility question
      let nextQuestion = getNextQuestion(profile);
      expect(nextQuestion.field).toBe('mobility');
      
      processAnswer(profile, 'mobility', MobilityType.STANDARD);
      expect(profile.mobility).toBe(MobilityType.STANDARD);
      expect(profile.avoidStairs).toBe(false);
      
      // Step 2: Avoid stairs question is skipped for standard mobility (auto-set to false)
      // Go directly to travelPace
      nextQuestion = getNextQuestion(profile);
      expect(nextQuestion.field).toBe('travelPace');
      
      processAnswer(profile, 'travelPace', 'MEDIUM');
      expect(profile.travelPace).toBe('MEDIUM');
      
      // Step 4: Preferred Transport
      nextQuestion = getNextQuestion(profile);
      expect(nextQuestion.field).toBe('preferredTransport');
      
      processAnswer(profile, 'preferredTransport', TransportMode.WALK);
      expect(profile.preferredTransport).toBe(TransportMode.WALK);
      
      // Step 5: Interests
      nextQuestion = getNextQuestion(profile);
      expect(nextQuestion.field).toBe('interests');
      
      processAnswer(profile, 'interests', {
        [InterestCategory.ART_MUSEUMS]: true,
        [InterestCategory.HISTORY_CULTURE]: true
      });
      expect(profile.interests[InterestCategory.ART_MUSEUMS]).toBe(true);
      expect(profile.interests[InterestCategory.HISTORY_CULTURE]).toBe(true);
      
      // Step 6: Time window
      nextQuestion = getNextQuestion(profile);
      expect(nextQuestion.field).toBe('timeWindow');
      
      processAnswer(profile, 'timeWindow', { startHour: 9, endHour: 18 });
      expect(profile.timeWindow.startHour).toBe(9);
      expect(profile.timeWindow.endHour).toBe(18);
      
      // Final check: Profile should be complete
      nextQuestion = getNextQuestion(profile);
      expect(nextQuestion).toBeNull();
      
      const completion = getCompletionPercentage(profile);
      expect(completion).toBe(100);
    });
  });
  
  describe('Non-standard mobility flow', () => {
    test('should skip avoidStairs question for wheelchair users', () => {
      processAnswer(profile, 'mobility', MobilityType.WHEELCHAIR);
      
      const nextQuestion = getNextQuestion(profile);
      expect(nextQuestion.field).toBe('travelPace');
      expect(profile.avoidStairs).toBe(true);
    });
    
    test('should skip avoidStairs question for stroller users', () => {
      processAnswer(profile, 'mobility', MobilityType.STROLLER);
      
      const nextQuestion = getNextQuestion(profile);
      expect(nextQuestion.field).toBe('travelPace');
      expect(profile.avoidStairs).toBe(true);
    });
    
    test('should skip avoidStairs question for low endurance users', () => {
      processAnswer(profile, 'mobility', MobilityType.LOW_ENDURANCE);
      
      const nextQuestion = getNextQuestion(profile);
      expect(nextQuestion.field).toBe('travelPace');
      expect(profile.avoidStairs).toBe(true);
    });
  });
  
  describe('Profile completion tracking', () => {
    test('should track completion percentage correctly', () => {
      processAnswer(profile, 'mobility', MobilityType.STANDARD);
      const afterMobility = getCompletionPercentage(profile);
      expect(afterMobility).toBeGreaterThan(0);
    });
    
    test('should handle partial completion', () => {
      processAnswer(profile, 'mobility', MobilityType.STANDARD);
      processAnswer(profile, 'preferredTransport', TransportMode.WALK);
      
      const completion = getCompletionPercentage(profile);
      expect(completion).toBeGreaterThan(0);
      expect(completion).toBeLessThan(100);
      
      const nextQuestion = getNextQuestion(profile);
      expect(nextQuestion).toBeDefined();
      expect(nextQuestion.field).toBe('travelPace');
    });
  });
  
  describe('Data validation', () => {
    test('should validate enum values', () => {
      expect(() => {
        processAnswer(profile, 'mobility', 'invalid_mobility');
      }).not.toThrow();
      
      expect(() => {
        processAnswer(profile, 'travelPace', 'INVALID'); // Invalid travel pace
      }).not.toThrow();
    });
    
    test('should handle array fields correctly', () => {
      // Empty string is not valid - should return false and not update field
      const result = processAnswer(profile, 'preferredTransport', '');
      expect(result).toBe(false);
      expect(profile.preferredTransport).toBe('__UNFILLED__');
      
      // Valid single value should update the field
      processAnswer(profile, 'preferredTransport', TransportMode.WALK);
      expect(profile.preferredTransport).toBe(TransportMode.WALK);
    });
    
    test('should handle object fields correctly', () => {
      processAnswer(profile, 'interests', {});
      expect(profile.interests).toEqual({});
      
      processAnswer(profile, 'interests', {
        [InterestCategory.ART_MUSEUMS]: true,
        [InterestCategory.NATURE_PARKS]: false
      });
      expect(profile.interests[InterestCategory.ART_MUSEUMS]).toBe(true);
      expect(profile.interests[InterestCategory.NATURE_PARKS]).toBe(false);
    });
  });
});
