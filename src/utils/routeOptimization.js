import { calculateDistance } from './geography.js';

/**
 * Sort waypoints using Nearest Neighbor greedy algorithm for optimal visiting order
 * TODO: Consider using GraphHopper Optimization API or similar TSP solver for better route optimization in future iterations
 * @param {Object} startPOI - Starting point
 * @param {Object} finishPOI - Ending point (or null for circular route)
 * @param {Array} waypoints - Array of POI objects to visit
 * @returns {Array} Sorted waypoints in optimal visiting order
 */
export function sortWaypointsByNearestNeighbor(startPOI, finishPOI, waypoints) {
  if (waypoints.length === 0) return [];
  
  const sorted = [];
  const remaining = [...waypoints];
  let current = startPOI;
  
  while (remaining.length > 0) {
    // Find nearest POI to current position
    let nearestIndex = 0;
    let minDistance = calculateDistance(current.location, remaining[0].location);
    
    for (let i = 1; i < remaining.length; i++) {
      const dist = calculateDistance(current.location, remaining[i].location);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = i;
      }
    }
    
    // Add nearest to result and update current position
    const nearest = remaining.splice(nearestIndex, 1)[0];
    sorted.push(nearest);
    current = nearest; // Move to next position for next iteration
  }
  
  return sorted;
}

