/**
 * Test utilities for creating mock data and common test helpers
 */

// Mock UserProfile factory
export function createMockUserProfile(overrides = {}) {
  const defaultProfile = {
    userId: 'test-user-123',
    name: '__UNFILLED__',
    email: '__UNFILLED__',
    mobility: '__UNFILLED__',
    avoidStairs: '__UNFILLED__',
    preferredTransport: '__EMPTY_ARRAY__',
    budgetLevel: '__UNFILLED__',
    travelPace: '__UNFILLED__',
    interests: '__EMPTY_OBJECT__',
    dietary: '__EMPTY_OBJECT__',
    timeWindow: {
      startHour: '__UNFILLED__',
      endHour: '__UNFILLED__'
    }
  };
  
  return { ...defaultProfile, ...overrides };
}

// Mock POI factory
export function createMockPOI(overrides = {}) {
  const defaultPOI = {
    id: 'test-poi-123',
    name: 'Test POI',
    description: 'A test point of interest',
    latitude: 40.7128,
    longitude: -74.0060,
    category: 'attraction',
    rating: 4.5,
    imageUrl: 'https://example.com/image.jpg',
    address: '123 Test Street, Test City',
    openingHours: '9:00 AM - 6:00 PM',
    priceLevel: 2
  };
  
  return { ...defaultPOI, ...overrides };
}

// Mock city factory
export function createMockCity(overrides = {}) {
  const defaultCity = {
    name: 'Test City',
    country: 'Test Country',
    latitude: 40.7128,
    longitude: -74.0060,
    bbox: {
      minLat: 40.7,
      maxLat: 40.8,
      minLng: -74.1,
      maxLng: -73.9
    }
  };
  
  return { ...defaultCity, ...overrides };
}

// Test data generators
export const TestDataGenerators = {
  // Generate multiple POIs
  generatePOIs: (count = 5) => {
    return Array.from({ length: count }, (_, index) => 
      createMockPOI({
        id: `poi-${index}`,
        name: `Test POI ${index + 1}`,
        latitude: 40.7128 + (index * 0.01),
        longitude: -74.0060 + (index * 0.01)
      })
    );
  },
  
  // Generate user profiles with different completion states
  generateProfiles: () => ({
    empty: createMockUserProfile(),
    partial: createMockUserProfile({
      mobility: 'standard',
      budgetLevel: 2
    }),
    complete: createMockUserProfile({
      mobility: 'standard',
      avoidStairs: false,
      preferredTransport: ['walk', 'public_transit'],
      budgetLevel: 2,
      travelPace: 'MEDIUM',
      interests: { 'art_museums': true, 'history_culture': true },
      dietary: { 'vegetarian': true },
      timeWindow: { startHour: 9, endHour: 18 }
    })
  })
};

// Async test helpers
export const AsyncTestHelpers = {
  // Wait for a condition to be true
  waitFor: (condition, timeout = 1000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const check = () => {
        if (condition()) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Condition not met within ${timeout}ms`));
        } else {
          setTimeout(check, 10);
        }
      };
      
      check();
    });
  },
  
  // Wait for next tick
  nextTick: () => new Promise(resolve => setTimeout(resolve, 0))
};

// Mock API responses
export const MockAPIResponses = {
  successfulPOISearch: (pois) => ({
    success: true,
    data: pois,
    message: 'POIs found successfully'
  }),
  
  errorResponse: (message = 'Test error') => ({
    success: false,
    error: message,
    code: 'TEST_ERROR'
  }),
  
  loadingResponse: () => ({
    success: false,
    loading: true,
    message: 'Loading...'
  })
};

// Test assertions helpers
export const TestAssertions = {
  // Check if object has required properties
  hasRequiredProperties: (obj, requiredProps) => {
    const missing = requiredProps.filter(prop => !(prop in obj));
    if (missing.length > 0) {
      throw new Error(`Missing required properties: ${missing.join(', ')}`);
    }
    return true;
  },
  
  // Check if array contains objects with specific structure
  hasValidStructure: (arr, validator) => {
    return arr.every(item => validator(item));
  },
  
  // Check if profile is valid
  isValidProfile: (profile) => {
    const requiredFields = ['userId', 'mobility', 'budgetLevel', 'travelPace'];
    return TestAssertions.hasRequiredProperties(profile, requiredFields);
  }
};
