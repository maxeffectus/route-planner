/**
 * Central category configuration
 * Single source of truth for POI categories
 */

import { InterestCategory } from '../models/UserProfile';

export const CATEGORY_CONFIG = [
  { value: InterestCategory.HISTORY_CULTURE, label: 'History & Culture' },
  { value: InterestCategory.ART_MUSEUMS, label: 'Art & Museums' },
  { value: InterestCategory.ARCHITECTURE, label: 'Architecture' },
  { value: InterestCategory.NATURE_PARKS, label: 'Nature & Parks' },
  { value: InterestCategory.ENTERTAINMENT, label: 'Entertainment' },
  { value: InterestCategory.GASTRONOMY, label: 'Food & Dining' },
  { value: InterestCategory.SHOPPING, label: 'Shopping' },
  { value: InterestCategory.NIGHTLIFE, label: 'Nightlife' },
  { value: InterestCategory.SPORT_FITNESS, label: 'Sports & Fitness' },
  { value: InterestCategory.TECHNOLOGY, label: 'Technology' }
];

// Create a map for quick lookups
const CATEGORY_LABEL_MAP = CATEGORY_CONFIG.reduce((acc, cat) => {
  acc[cat.value] = cat.label;
  return acc;
}, {});

/**
 * Get display label for a category value
 * @param {string} categoryValue - Category value (e.g., 'history_culture', 'art_museums')
 * @returns {string} Display label (e.g., 'History & Culture', 'Art & Museums')
 */
export function getCategoryLabel(categoryValue) {
  if (!categoryValue) return '';
  
  // Direct match for InterestCategory values
  if (CATEGORY_LABEL_MAP[categoryValue]) {
    return CATEGORY_LABEL_MAP[categoryValue];
  }
  
  // Try to match partial strings for OSM types (legacy support)
  const lowerValue = categoryValue.toLowerCase();
  for (const [value, label] of Object.entries(CATEGORY_LABEL_MAP)) {
    if (lowerValue.includes(value) || value.includes(lowerValue)) {
      return label;
    }
  }
  
  // Fallback: capitalize first letter of each word
  return categoryValue
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get all available categories
 * @returns {Array} Array of category objects with value and label
 */
export function getAllCategories() {
  return CATEGORY_CONFIG;
}

/**
 * Get all category values
 * @returns {Array<string>} Array of category values
 */
export function getAllCategoryValues() {
  return CATEGORY_CONFIG.map(cat => cat.value);
}

