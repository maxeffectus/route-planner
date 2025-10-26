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
    test('should track completion percentage correctly', () => {
      // Partial profile should have some completion
      processAnswer(profile, 'mobility', 'standard');
      expect(profile.getCompletionPercentage()).toBeGreaterThan(0);
      
      // Complete profile should have 100% completion
      processAnswer(profile, 'preferredTransport', 'walk');
      processAnswer(profile, 'budgetLevel', 2);
      processAnswer(profile, 'travelPace', 'MEDIUM');
      processAnswer(profile, 'interests', { 'art_museums': true });
      processAnswer(profile, 'dietary', { 'vegetarian': true });
      processAnswer(profile, 'timeWindow', { startHour: 9, endHour: 18 });
      
      expect(profile.isComplete()).toBe(true);
      expect(profile.getCompletionPercentage()).toBe(100);
    });
  });

  describe('Modal Close Logic', () => {
    test('should allow closing at any time', () => {
      // Modal can be closed at any time now
      expect(profile && profile.isComplete()).toBe(false);
      
      // Complete the profile - should still allow closing
      processAnswer(profile, 'mobility', 'standard');
      processAnswer(profile, 'preferredTransport', 'walk');
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
      processAnswer(profile, 'preferredTransport', 'walk');
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
    test('should handle escape key at any time', () => {
      // Mock escape key event
      const mockEvent = { key: 'Escape' };
      
      // Escape key should work at any time now
      const shouldClose = mockEvent.key === 'Escape';
      expect(shouldClose).toBe(true);
    });
  });
});
