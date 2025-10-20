/**
 * Central category configuration
 * Single source of truth for POI categories
 */

export const CATEGORY_CONFIG = [
  { value: 'museum', label: 'Museum' },
  { value: 'attraction', label: 'Attraction' },
  { value: 'historic', label: 'Historic' },
  { value: 'place_of_worship', label: 'Place Of Worship' },
  { value: 'park', label: 'Park' },
  { value: 'viewpoint', label: 'Viewpoint' }
];

// Create a map for quick lookups
const CATEGORY_LABEL_MAP = CATEGORY_CONFIG.reduce((acc, cat) => {
  acc[cat.value] = cat.label;
  return acc;
}, {});

/**
 * Get display label for a category value
 * @param {string} categoryValue - Category value (e.g., 'museum', 'place_of_worship')
 * @returns {string} Display label (e.g., 'Museum', 'Place Of Worship')
 */
export function getCategoryLabel(categoryValue) {
  if (!categoryValue) return '';
  
  const lowerValue = categoryValue.toLowerCase();
  
  // Direct match
  if (CATEGORY_LABEL_MAP[lowerValue]) {
    return CATEGORY_LABEL_MAP[lowerValue];
  }
  
  // Try to match partial strings for OSM types
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

