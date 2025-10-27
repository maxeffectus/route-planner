import { UserProfile, InterestCategory, UNFILLED_MARKERS } from '../../src/models/UserProfile';
import { getAllCategoryValues } from '../../src/utils/categoryMapping';

describe('POI Filter Profile Integration', () => {
  describe('Profile Interests to Category Filter', () => {
    test('should extract categories from profile with interests', () => {
      const profile = new UserProfile();
      profile.setInterestWeight(InterestCategory.HISTORY_CULTURE, 0.8);
      profile.setInterestWeight(InterestCategory.ART_MUSEUMS, 0.6);
      profile.setInterestWeight(InterestCategory.GASTRONOMY, 0.4);
      
      const interests = profile.getInterests();
      const categoriesWithWeight = Object.keys(interests).filter(cat => interests[cat] > 0);
      
      expect(categoriesWithWeight).toHaveLength(3);
      expect(categoriesWithWeight).toContain(InterestCategory.HISTORY_CULTURE);
      expect(categoriesWithWeight).toContain(InterestCategory.ART_MUSEUMS);
      expect(categoriesWithWeight).toContain(InterestCategory.GASTRONOMY);
    });
    
    test('should filter out zero-weight interests', () => {
      const profile = new UserProfile();
      profile.setInterestWeight(InterestCategory.HISTORY_CULTURE, 0.8);
      profile.setInterestWeight(InterestCategory.ART_MUSEUMS, 0.0); // Zero weight
      profile.setInterestWeight(InterestCategory.GASTRONOMY, 0.1);
      
      const interests = profile.getInterests();
      const categoriesWithWeight = Object.keys(interests).filter(cat => interests[cat] > 0);
      
      expect(categoriesWithWeight).toHaveLength(2);
      expect(categoriesWithWeight).toContain(InterestCategory.HISTORY_CULTURE);
      expect(categoriesWithWeight).toContain(InterestCategory.GASTRONOMY);
      expect(categoriesWithWeight).not.toContain(InterestCategory.ART_MUSEUMS);
    });
    
    test('should handle empty interests object', () => {
      const profile = new UserProfile();
      profile.setInterestWeight(InterestCategory.HISTORY_CULTURE, 0.8);
      profile.interests = {}; // Clear all interests
      
      const interests = profile.getInterests();
      const categoriesWithWeight = Object.keys(interests).filter(cat => interests[cat] > 0);
      
      expect(categoriesWithWeight).toHaveLength(0);
    });
    
    test('should identify unfilled interests marker', () => {
      const profile = new UserProfile();
      
      expect(profile.interests).toBe(UNFILLED_MARKERS.OBJECT);
      expect(profile.interests === UNFILLED_MARKERS.OBJECT).toBe(true);
    });
  });
  
  describe('Category Filter Initialization Logic', () => {
    test('should select all categories when profile has no interests', () => {
      const allCategories = getAllCategoryValues();
      
      // Simulate empty interests
      const categoriesWithWeight = [];
      const result = categoriesWithWeight.length > 0 
        ? categoriesWithWeight 
        : allCategories;
      
      expect(result).toEqual(allCategories);
      expect(result.length).toBeGreaterThan(0);
    });
    
    test('should select profile categories when interests exist', () => {
      const profileCategories = [
        InterestCategory.HISTORY_CULTURE,
        InterestCategory.ART_MUSEUMS,
        InterestCategory.GASTRONOMY
      ];
      
      const result = profileCategories.length > 0 ? profileCategories : getAllCategoryValues();
      
      expect(result).toEqual(profileCategories);
      expect(result).toHaveLength(3);
    });
    
    test('should handle profile with all category interests', () => {
      const profile = new UserProfile();
      const allCategories = getAllCategoryValues();
      
      // Set interest for all categories
      allCategories.forEach(category => {
        profile.setInterestWeight(category, 0.5);
      });
      
      const interests = profile.getInterests();
      const categoriesWithWeight = Object.keys(interests).filter(cat => interests[cat] > 0);
      
      expect(categoriesWithWeight.length).toBe(allCategories.length);
      expect(categoriesWithWeight.sort()).toEqual(allCategories.sort());
    });
  });
  
  describe('Profile Interest Weight Validation', () => {
    test('should clip weight values to valid range (0-1)', () => {
      const profile = new UserProfile();
      
      // Test values outside valid range
      profile.setInterestWeight(InterestCategory.HISTORY_CULTURE, -0.5);
      expect(profile.interests[InterestCategory.HISTORY_CULTURE]).toBe(0);
      
      profile.setInterestWeight(InterestCategory.ART_MUSEUMS, 1.5);
      expect(profile.interests[InterestCategory.ART_MUSEUMS]).toBe(1);
      
      profile.setInterestWeight(InterestCategory.GASTRONOMY, 0.7);
      expect(profile.interests[InterestCategory.GASTRONOMY]).toBe(0.7);
    });
    
    test('should handle zero weight correctly', () => {
      const profile = new UserProfile();
      profile.setInterestWeight(InterestCategory.HISTORY_CULTURE, 0);
      
      const interests = profile.getInterests();
      const categoriesWithWeight = Object.keys(interests).filter(cat => interests[cat] > 0);
      
      expect(categoriesWithWeight).not.toContain(InterestCategory.HISTORY_CULTURE);
    });
  });
  
  describe('Edge Cases', () => {
    test('should handle null userProfile gracefully', () => {
      const userProfile = null;
      
      // Simulate logic when profile is null
      const shouldSelectAll = !userProfile || userProfile.interests === UNFILLED_MARKERS.OBJECT;
      
      expect(shouldSelectAll).toBe(true);
    });
    
    test('should handle profile with interests but all zero weights', () => {
      const profile = new UserProfile();
      profile.setInterestWeight(InterestCategory.HISTORY_CULTURE, 0);
      profile.setInterestWeight(InterestCategory.ART_MUSEUMS, 0);
      
      const interests = profile.getInterests();
      const categoriesWithWeight = Object.keys(interests).filter(cat => interests[cat] > 0);
      
      expect(categoriesWithWeight).toHaveLength(0);
    });
    
    test('should get all category values correctly', () => {
      const allCategories = getAllCategoryValues();
      
      expect(Array.isArray(allCategories)).toBe(true);
      expect(allCategories.length).toBeGreaterThan(0);
      expect(allCategories).toContain(InterestCategory.HISTORY_CULTURE);
      expect(allCategories).toContain(InterestCategory.ART_MUSEUMS);
      expect(allCategories).toContain(InterestCategory.ARCHITECTURE);
      expect(allCategories).toContain(InterestCategory.NATURE_PARKS);
      expect(allCategories).toContain(InterestCategory.ENTERTAINMENT);
      expect(allCategories).toContain(InterestCategory.GASTRONOMY);
      expect(allCategories).toContain(InterestCategory.NIGHTLIFE);
    });
  });
  
  describe('Category Filter Application Logic', () => {
    test('should correctly apply profile interests to category filter', () => {
      const profile = new UserProfile();
      profile.setInterestWeight(InterestCategory.HISTORY_CULTURE, 0.9);
      profile.setInterestWeight(InterestCategory.ART_MUSEUMS, 0.7);
      profile.setInterestWeight(InterestCategory.NATURE_PARKS, 0.3);
      
      const interests = profile.getInterests();
      const categoriesFromProfile = Object.keys(interests).filter(cat => interests[cat] > 0);
      
      // Simulate setting selected categories
      const selectedCategories = categoriesFromProfile;
      
      expect(selectedCategories).toHaveLength(3);
      expect(selectedCategories).toContain(InterestCategory.HISTORY_CULTURE);
      expect(selectedCategories).toContain(InterestCategory.ART_MUSEUMS);
      expect(selectedCategories).toContain(InterestCategory.NATURE_PARKS);
    });
    
    test('should handle profile with single interest category', () => {
      const profile = new UserProfile();
      profile.setInterestWeight(InterestCategory.GASTRONOMY, 1.0);
      
      const interests = profile.getInterests();
      const categoriesFromProfile = Object.keys(interests).filter(cat => interests[cat] > 0);
      
      expect(categoriesFromProfile).toHaveLength(1);
      expect(categoriesFromProfile).toContain(InterestCategory.GASTRONOMY);
    });
    
    test('should not include categories with zero weight', () => {
      const profile = new UserProfile();
      profile.setInterestWeight(InterestCategory.HISTORY_CULTURE, 0.8);
      profile.setInterestWeight(InterestCategory.ART_MUSEUMS, 0.0); // Explicitly zero
      profile.setInterestWeight(InterestCategory.GASTRONOMY, 0.2);
      
      const interests = profile.getInterests();
      const categoriesFromProfile = Object.keys(interests).filter(cat => interests[cat] > 0);
      
      expect(categoriesFromProfile).toHaveLength(2);
      expect(categoriesFromProfile).toContain(InterestCategory.HISTORY_CULTURE);
      expect(categoriesFromProfile).toContain(InterestCategory.GASTRONOMY);
      expect(categoriesFromProfile).not.toContain(InterestCategory.ART_MUSEUMS);
    });
  });
  
  describe('Profile Interest Updates', () => {
    test('should update interests dynamically', () => {
      const profile = new UserProfile();
      
      // Initial interests
      profile.setInterestWeight(InterestCategory.HISTORY_CULTURE, 0.8);
      let interests = profile.getInterests();
      expect(Object.keys(interests).length).toBe(1);
      
      // Add more interests
      profile.setInterestWeight(InterestCategory.ART_MUSEUMS, 0.6);
      profile.setInterestWeight(InterestCategory.GASTRONOMY, 0.4);
      
      interests = profile.getInterests();
      expect(Object.keys(interests).length).toBe(3);
    });
    
    test('should override existing interest weights', () => {
      const profile = new UserProfile();
      
      profile.setInterestWeight(InterestCategory.HISTORY_CULTURE, 0.5);
      expect(profile.interests[InterestCategory.HISTORY_CULTURE]).toBe(0.5);
      
      profile.setInterestWeight(InterestCategory.HISTORY_CULTURE, 0.9);
      expect(profile.interests[InterestCategory.HISTORY_CULTURE]).toBe(0.9);
    });
  });
});
