/**
 * Route Duration Calculation Utilities
 * Calculates total route duration including travel time and POI visit time
 */

import { TravelPace } from '../models/UserProfile';

/**
 * POI visit duration in hours based on travel pace
 */
const POI_VISIT_DURATION = {
  [TravelPace.LOW]: 2.5,      // 2.5 hours per POI
  [TravelPace.MEDIUM]: 2.0,   // 2 hours per POI
  [TravelPace.HIGH]: 1.5      // 1.5 hours per POI
};

/**
 * Get POI visit duration in hours based on user's travel pace
 * @param {string} travelPace - User's travel pace (TravelPace enum value)
 * @returns {number} Duration in hours per POI
 */
export function getPOIVisitDuration(travelPace) {
  return POI_VISIT_DURATION[travelPace] || POI_VISIT_DURATION[TravelPace.MEDIUM];
}

/**
 * Calculate total POI visit time
 * @param {number} poiCount - Number of POIs (excluding start/finish if they're the same)
 * @param {string} travelPace - User's travel pace
 * @returns {number} Total visit time in milliseconds
 */
export function calculatePOIVisitTime(poiCount, travelPace) {
  if (poiCount <= 0) return 0;
  
  const hoursPerPOI = getPOIVisitDuration(travelPace);
  const totalHours = poiCount * hoursPerPOI;
  
  // Convert hours to milliseconds
  return totalHours * 60 * 60 * 1000;
}

/**
 * Format duration from milliseconds to HH:MM format
 * @param {number} durationMs - Duration in milliseconds
 * @returns {string} Formatted duration (e.g., "02:30", "12:45")
 */
export function formatDuration(durationMs) {
  if (!durationMs || durationMs < 0) return '00:00';
  
  const totalMinutes = Math.round(durationMs / 1000 / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Calculate route duration breakdown
 * @param {number} travelDurationMs - Travel duration from routing API (milliseconds)
 * @param {number} poiCount - Number of POIs to visit
 * @param {string} travelPace - User's travel pace
 * @returns {Object} Duration breakdown { total, travel, visit, formatted }
 */
export function calculateRouteDuration(travelDurationMs, poiCount, travelPace) {
  const travelTime = travelDurationMs || 0;
  const visitTime = calculatePOIVisitTime(poiCount, travelPace);
  const totalTime = travelTime + visitTime;
  
  return {
    total: totalTime,
    travel: travelTime,
    visit: visitTime,
    formatted: {
      total: formatDuration(totalTime),
      travel: formatDuration(travelTime),
      visit: formatDuration(visitTime)
    }
  };
}

