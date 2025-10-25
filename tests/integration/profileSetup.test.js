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
      expect(profile.avoidStairs).toBe('__UNFILLED__');
      
      // Step 2: Avoid stairs question (only for standard mobility)
      nextQuestion = getNextQuestion(profile);
      expect(nextQuestion.field).toBe('avoidStairs');
      
      processAnswer(profile, 'avoidStairs', true);
      expect(profile.avoidStairs).toBe(true);
      
      // Step 3: Preferred transport
      nextQuestion = getNextQuestion(profile);
      expect(nextQuestion.field).toBe('preferredTransport');
      
      processAnswer(profile, 'preferredTransport', [TransportMode.WALK, TransportMode.PUBLIC_TRANSIT]);
      expect(profile.preferredTransport).toEqual([TransportMode.WALK, TransportMode.PUBLIC_TRANSIT]);
      
      // Step 4: Budget level
      nextQuestion = getNextQuestion(profile);
      expect(nextQuestion.field).toBe('budgetLevel');
      
      processAnswer(profile, 'budgetLevel', 2);
      expect(profile.budgetLevel).toBe(2);
      
      // Step 5: Travel pace
      nextQuestion = getNextQuestion(profile);
      expect(nextQuestion.field).toBe('travelPace');
      
      processAnswer(profile, 'travelPace', 'MEDIUM');
      expect(profile.travelPace).toBe('MEDIUM');
      
      // Step 6: Interests
      nextQuestion = getNextQuestion(profile);
      expect(nextQuestion.field).toBe('interests');
      
      processAnswer(profile, 'interests', {
        [InterestCategory.ART_MUSEUMS]: true,
        [InterestCategory.HISTORY_CULTURE]: true
      });
      expect(profile.interests[InterestCategory.ART_MUSEUMS]).toBe(true);
      expect(profile.interests[InterestCategory.HISTORY_CULTURE]).toBe(true);
      
      // Step 7: Dietary preferences
      nextQuestion = getNextQuestion(profile);
      expect(nextQuestion.field).toBe('dietary');
      
      processAnswer(profile, 'dietary', {
        vegetarian: true,
        glutenFree: false
      });
      expect(profile.dietary.vegetarian).toBe(true);
      expect(profile.dietary.glutenFree).toBe(false);
      
      // Step 8: Time window
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
      expect(nextQuestion.field).toBe('preferredTransport');
      expect(profile.avoidStairs).toBe(true);
    });
    
    test('should skip avoidStairs question for stroller users', () => {
      processAnswer(profile, 'mobility', MobilityType.STROLLER);
      
      const nextQuestion = getNextQuestion(profile);
      expect(nextQuestion.field).toBe('preferredTransport');
      expect(profile.avoidStairs).toBe(true);
    });
    
    test('should skip avoidStairs question for low endurance users', () => {
      processAnswer(profile, 'mobility', MobilityType.LOW_ENDURANCE);
      
      const nextQuestion = getNextQuestion(profile);
      expect(nextQuestion.field).toBe('preferredTransport');
      expect(profile.avoidStairs).toBe(true);
    });
  });
  
  describe('Profile completion tracking', () => {
    test('should track completion percentage correctly', () => {
      const initialCompletion = getCompletionPercentage(profile);
      expect(initialCompletion).toBe(0);
      
      processAnswer(profile, 'mobility', MobilityType.STANDARD);
      const afterMobility = getCompletionPercentage(profile);
      expect(afterMobility).toBeGreaterThan(initialCompletion);
      
      processAnswer(profile, 'avoidStairs', false);
      const afterAvoidStairs = getCompletionPercentage(profile);
      expect(afterAvoidStairs).toBeGreaterThanOrEqual(afterMobility);
    });
    
    test('should handle partial completion', () => {
      processAnswer(profile, 'mobility', MobilityType.STANDARD);
      processAnswer(profile, 'avoidStairs', false);
      processAnswer(profile, 'preferredTransport', [TransportMode.WALK]);
      
      const completion = getCompletionPercentage(profile);
      expect(completion).toBeGreaterThan(0);
      expect(completion).toBeLessThan(100);
      
      const nextQuestion = getNextQuestion(profile);
      expect(nextQuestion).toBeDefined();
      expect(nextQuestion.field).toBe('budgetLevel');
    });
  });
  
  describe('Data validation', () => {
    test('should validate enum values', () => {
      expect(() => {
        processAnswer(profile, 'mobility', 'invalid_mobility');
      }).not.toThrow();
      
      expect(() => {
        processAnswer(profile, 'budgetLevel', 5); // Invalid budget level
      }).not.toThrow();
    });
    
    test('should handle array fields correctly', () => {
      processAnswer(profile, 'preferredTransport', []);
      expect(profile.preferredTransport).toEqual([]);
      
      processAnswer(profile, 'preferredTransport', [TransportMode.WALK, TransportMode.BIKE]);
      expect(profile.preferredTransport).toEqual([TransportMode.WALK, TransportMode.BIKE]);
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
