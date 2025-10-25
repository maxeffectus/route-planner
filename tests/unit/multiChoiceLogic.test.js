/**
 * Unit tests for multi-choice logic
 */
describe('Multi-Choice Logic Tests', () => {
  // Simulate the handleMultiChoiceToggle function
  function handleMultiChoiceToggle(selectedAnswers, value) {
    if (selectedAnswers.includes(value)) {
      return selectedAnswers.filter(item => item !== value);
    } else {
      return [...selectedAnswers, value];
    }
  }
  
  describe('Toggle functionality', () => {
    test('should add item to empty selection', () => {
      const selectedAnswers = [];
      const result = handleMultiChoiceToggle(selectedAnswers, 'car');
      
      expect(result).toEqual(['car']);
      expect(result).toHaveLength(1);
    });
    
    test('should add multiple items', () => {
      let selectedAnswers = [];
      selectedAnswers = handleMultiChoiceToggle(selectedAnswers, 'car');
      selectedAnswers = handleMultiChoiceToggle(selectedAnswers, 'bicycle');
      
      expect(selectedAnswers).toEqual(['car', 'bicycle']);
      expect(selectedAnswers).toHaveLength(2);
    });
    
    test('should remove item when toggled again', () => {
      let selectedAnswers = ['car', 'bicycle'];
      selectedAnswers = handleMultiChoiceToggle(selectedAnswers, 'car');
      
      expect(selectedAnswers).toEqual(['bicycle']);
      expect(selectedAnswers).toHaveLength(1);
    });
    
    test('should handle complex toggle sequence', () => {
      let selectedAnswers = [];
      
      // Add Car
      selectedAnswers = handleMultiChoiceToggle(selectedAnswers, 'car');
      expect(selectedAnswers).toEqual(['car']);
      
      // Add Bicycle
      selectedAnswers = handleMultiChoiceToggle(selectedAnswers, 'bicycle');
      expect(selectedAnswers).toEqual(['car', 'bicycle']);
      
      // Remove Car
      selectedAnswers = handleMultiChoiceToggle(selectedAnswers, 'car');
      expect(selectedAnswers).toEqual(['bicycle']);
      
      // Add Taxi
      selectedAnswers = handleMultiChoiceToggle(selectedAnswers, 'taxi');
      expect(selectedAnswers).toEqual(['bicycle', 'taxi']);
      
      // Add Car again
      selectedAnswers = handleMultiChoiceToggle(selectedAnswers, 'car');
      expect(selectedAnswers).toEqual(['bicycle', 'taxi', 'car']);
    });
  });
  
  describe('Edge cases', () => {
    test('should handle undefined values gracefully', () => {
      const selectedAnswers = ['car'];
      const result = handleMultiChoiceToggle(selectedAnswers, undefined);
      
      expect(result).toEqual(['car', undefined]);
    });
    
    test('should handle duplicate values', () => {
      let selectedAnswers = ['car', 'car'];
      selectedAnswers = handleMultiChoiceToggle(selectedAnswers, 'car');
      
      // Should remove both instances of 'car'
      expect(selectedAnswers).toEqual([]);
    });
    
    test('should handle empty string values', () => {
      let selectedAnswers = [];
      selectedAnswers = handleMultiChoiceToggle(selectedAnswers, '');
      
      expect(selectedAnswers).toEqual(['']);
    });
  });
  
  describe('Array immutability', () => {
    test('should not mutate original array', () => {
      const originalAnswers = ['car', 'bicycle'];
      const result = handleMultiChoiceToggle(originalAnswers, 'taxi');
      
      expect(originalAnswers).toEqual(['car', 'bicycle']);
      expect(result).toEqual(['car', 'bicycle', 'taxi']);
      expect(result).not.toBe(originalAnswers);
    });
  });
});
