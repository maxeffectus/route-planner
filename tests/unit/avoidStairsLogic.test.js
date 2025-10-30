/**
 * Unit tests for avoidStairs logic in SimpleProfileConfig
 */
import { UserProfile, MobilityType, UNFILLED_MARKERS } from '../../src/models/UserProfile.js';
import { getNextQuestion, processAnswer, getCompletionPercentage } from '../../src/services/SimpleProfileConfig.js';

describe('AvoidStairs Logic Tests', () => {
  let profile;
  
  beforeEach(() => {
    profile = new UserProfile('test-user');
  });
  
  describe('Automatic avoidStairs setting', () => {
    test('should set avoidStairs to true for WHEELCHAIR mobility', () => {
      processAnswer(profile, 'mobility', MobilityType.WHEELCHAIR);
      
      expect(profile.mobility).toBe(MobilityType.WHEELCHAIR);
      expect(profile.avoidStairs).toBe(true);
    });
    
    test('should set avoidStairs to true for STROLLER mobility', () => {
      processAnswer(profile, 'mobility', MobilityType.STROLLER);
      
      expect(profile.mobility).toBe(MobilityType.STROLLER);
      expect(profile.avoidStairs).toBe(true);
    });
    
    test('should set avoidStairs to true for LOW_ENDURANCE mobility', () => {
      processAnswer(profile, 'mobility', MobilityType.LOW_ENDURANCE);
      
      expect(profile.mobility).toBe(MobilityType.LOW_ENDURANCE);
      expect(profile.avoidStairs).toBe(true);
    });
    
    test('should set avoidStairs to false for STANDARD mobility', () => {
      processAnswer(profile, 'mobility', MobilityType.STANDARD);
      
      expect(profile.mobility).toBe(MobilityType.STANDARD);
      expect(profile.avoidStairs).toBe(false);
    });
  });
  
  describe('Question flow logic', () => {
    test('should ask mobility question first', () => {
      const nextQuestion = getNextQuestion(profile);
      
      expect(nextQuestion).toBeDefined();
      expect(nextQuestion.field).toBe('mobility');
    });
    
    test('should skip avoidStairs question for non-standard mobility', () => {
      // Set mobility to wheelchair
      processAnswer(profile, 'mobility', MobilityType.WHEELCHAIR);
      
      const nextQuestion = getNextQuestion(profile);
      
      expect(nextQuestion).toBeDefined();
      expect(nextQuestion.field).toBe('travelPace');
      expect(nextQuestion.field).not.toBe('avoidStairs');
    });
    
    test('should skip avoidStairs question for standard mobility', () => {
      // Set mobility to standard (this sets avoidStairs to false)
      processAnswer(profile, 'mobility', MobilityType.STANDARD);
      
      // The avoidStairs question should be skipped because it's already set to false
      const nextQuestion = getNextQuestion(profile);
      
      expect(nextQuestion).toBeDefined();
      expect(nextQuestion.field).toBe('travelPace');
    });
  });
  
  describe('Profile completion', () => {
    test('should calculate completion correctly with automatic avoidStairs', () => {
      processAnswer(profile, 'mobility', MobilityType.WHEELCHAIR);
      
      const completion = getCompletionPercentage(profile);
      
      // Should be more than 0% since mobility and avoidStairs are both filled
      expect(completion).toBeGreaterThan(0);
    });
    
    test('should handle manual avoidStairs setting for standard mobility', () => {
      processAnswer(profile, 'mobility', MobilityType.STANDARD);
      processAnswer(profile, 'avoidStairs', true);
      
      expect(profile.mobility).toBe(MobilityType.STANDARD);
      expect(profile.avoidStairs).toBe(true);
    });
  });
});
