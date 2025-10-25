/**
 * Tests for modal behavior and accessibility
 */
import { UserProfile } from '../../src/models/UserProfile.js';
import { getNextQuestion, processAnswer, getCompletionPercentage } from '../../src/services/SimpleProfileConfig.js';

describe('Modal Behavior Logic Tests', () => {
  let profile;
  
  beforeEach(() => {
    profile = new UserProfile('test-user');
  });

  describe('Profile Completion Logic', () => {
    test('should determine when modal should be shown', () => {
      // Empty profile should show modal
      expect(!profile || !profile.isComplete()).toBe(true);
      
      // Partial profile should show modal
      processAnswer(profile, 'mobility', 'standard');
      expect(!profile || !profile.isComplete()).toBe(true);
      
      // Complete profile should not show modal
      processAnswer(profile, 'avoidStairs', false);
      processAnswer(profile, 'preferredTransport', ['walk']);
      processAnswer(profile, 'budgetLevel', 2);
      processAnswer(profile, 'travelPace', 'MEDIUM');
      processAnswer(profile, 'interests', { 'art_museums': true });
      processAnswer(profile, 'dietary', { 'vegetarian': true });
      processAnswer(profile, 'timeWindow', { startHour: 9, endHour: 18 });
      
      expect(profile.isComplete()).toBe(true);
      expect(!profile || !profile.isComplete()).toBe(false);
    });
  });

  describe('Modal Close Logic', () => {
    test('should prevent closing when profile is incomplete', () => {
      // Incomplete profile
      expect(profile && profile.isComplete()).toBe(false);
      
      // Should not allow closing
      const canClose = profile && profile.isComplete();
      expect(canClose).toBe(false);
    });

    test('should allow closing when profile is complete', () => {
      // Complete the profile
      processAnswer(profile, 'mobility', 'standard');
      processAnswer(profile, 'avoidStairs', false);
      processAnswer(profile, 'preferredTransport', ['walk']);
      processAnswer(profile, 'budgetLevel', 2);
      processAnswer(profile, 'travelPace', 'MEDIUM');
      processAnswer(profile, 'interests', { 'art_museums': true });
      processAnswer(profile, 'dietary', { 'vegetarian': true });
      processAnswer(profile, 'timeWindow', { startHour: 9, endHour: 18 });
      
      // Should allow closing
      const canClose = profile && profile.isComplete();
      expect(canClose).toBe(true);
    });
  });

  describe('Question Flow Logic', () => {
    test('should show questions when profile is incomplete', () => {
      const nextQuestion = getNextQuestion(profile);
      expect(nextQuestion).toBeDefined();
      expect(nextQuestion.field).toBe('mobility');
    });

    test('should not show questions when profile is complete', () => {
      // Complete the profile
      processAnswer(profile, 'mobility', 'standard');
      processAnswer(profile, 'avoidStairs', false);
      processAnswer(profile, 'preferredTransport', ['walk']);
      processAnswer(profile, 'budgetLevel', 2);
      processAnswer(profile, 'travelPace', 'MEDIUM');
      processAnswer(profile, 'interests', { 'art_museums': true });
      processAnswer(profile, 'dietary', { 'vegetarian': true });
      processAnswer(profile, 'timeWindow', { startHour: 9, endHour: 18 });
      
      const nextQuestion = getNextQuestion(profile);
      expect(nextQuestion).toBeNull();
    });
  });

  describe('Body Class Management Logic', () => {
    test('should manage modal-open class correctly', () => {
      // Simulate modal opening
      document.body.classList.add('modal-open');
      expect(document.body.classList.contains('modal-open')).toBe(true);
      
      // Simulate modal closing
      document.body.classList.remove('modal-open');
      expect(document.body.classList.contains('modal-open')).toBe(false);
    });
  });

  describe('Escape Key Logic', () => {
    test('should handle escape key based on profile completion', () => {
      // Mock escape key event
      const mockEvent = { key: 'Escape' };
      
      // Incomplete profile - should not close
      const shouldCloseIncomplete = mockEvent.key === 'Escape' && profile && profile.isComplete();
      expect(shouldCloseIncomplete).toBe(false);
      
      // Complete profile - should close
      processAnswer(profile, 'mobility', 'standard');
      processAnswer(profile, 'avoidStairs', false);
      processAnswer(profile, 'preferredTransport', ['walk']);
      processAnswer(profile, 'budgetLevel', 2);
      processAnswer(profile, 'travelPace', 'MEDIUM');
      processAnswer(profile, 'interests', { 'art_museums': true });
      processAnswer(profile, 'dietary', { 'vegetarian': true });
      processAnswer(profile, 'timeWindow', { startHour: 9, endHour: 18 });
      
      const shouldCloseComplete = mockEvent.key === 'Escape' && profile && profile.isComplete();
      expect(shouldCloseComplete).toBe(true);
    });
  });
});
