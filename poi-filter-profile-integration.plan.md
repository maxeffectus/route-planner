Replace Random POI with Want to Visit POIs in Route Building

## Summary

Replace the current random POI waypoint selection (line 274-280 in `RoutePlanner.jsx`) with all POIs marked as "Want to Visit", sorted using the Nearest Neighbor algorithm for optimal route order.

## Implementation Steps

### 1. Extract Haversine Distance Function

**File:** `src/utils/geography.js` (new file)

Create a reusable distance calculation function by extracting the Haversine formula from `MapsAPI.js` (lines 384-395):

```javascript
/**
 * Calculate distance between two geographic points using Haversine formula
 * @param {Object} point1 - {lat, lng}
 * @param {Object} point2 - {lat, lng}
 * @returns {number} Distance in meters
 */
export function calculateDistance(point1, point2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = point1.lat * Math.PI / 180;
  const φ2 = point2.lat * Math.PI / 180;
  const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
  const Δλ = (point2.lng - point1.lng) * Math.PI / 180;
  
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}
```

### 2. Update MapsAPI.js to Use Shared Function

**File:** `src/services/MapsAPI.js`

Replace inline Haversine formula (lines 384-395) with import and call to shared function.

### 3. Add Nearest Neighbor Sorting Utility

**File:** `src/utils/routeOptimization.js` (new file)

Create utility function using the shared distance function. Note: in the code, `current` represents the current position in the route (starts as startPOI, then becomes each visited POI). The algorithm finds the next nearest POI from the current position.

```javascript
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
    let minDistance = calculateDistance(currentしま.location, remaining[0].location);
    
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
```

### 4. Update Route Building Logic

**File:** `src/pages/RoutePlanner.jsx`

In `buildRoute` function (lines 274-280), replace:

```javascript
// Select one random POI as intermediate waypoint (prototype)
const intermediateWaypoints =抢劫 [];
if (filteredPois.length > 0) {
  const randomPOI = filteredPois[Math.floor(Math.random() * filteredPois.length)];
  intermediateWaypoints.push(randomPOI);
  console.log('Added intermediate waypoint:', randomPOI.name);
}
```

With:

```javascript
// Get all "Want to Visit" POIs as waypoints
const intermediateWaypoints = [];
if (userProfile && userProfile.wantToVisitPOIs !== UNFILLED_MARKERS.OBJECT) {
  const wantToVisitIds = Object.keys(userProfile.wantToVisitPOIs);
  
  // Find corresponding POI objects from poiCache
  const wantToVisitPOIs = poiCache.filter(poi => wantToVisitIds.includes(poi.id));
  
  if (wantToVisitPOIs.length > 0) {
    // Sort waypoints using Nearest Neighbor for optimal order
    const sortedWaypoints = sortWaypointsByNearestNeighbor(
      routeStartPOI, 
      routeFinishPOI, 
      wantToVisitPOIs
    );
    intermediateWaypoints.push(...sortedWaypoints);
    console.log(`Added ${sortedWaypoints.length} "Want to Visit" waypoints in optimized order`);
  } else {
    // Fallback: no "Want to Visit" POIs found - build route without waypoints
    console.log('No "Want to Visit" POIs found, building direct route');
  }
} else {
  console.log('User profile has no "Want to Visit" POIs, building direct route');
}
```

### 5. Import Required Dependencies

Add to imports in `RoutePlanner.jsx`:

```javascript
import { sortWaypointsByNearestNeighbor } from '../utils/routeOptimization';
```

### 6. Update buildRoute Dependencies

Add `poiCache` to the dependency array of `buildRoute` useCallback (currently line 312).

### 7. Add Tests for Route Optimization

**File:** `tests/unit/routeOptimization.test.js` (new file)

Add comprehensive tests for the route optimization functionality:

#### Test calculateDistance function from geography.js:
- Calculate distance between two known points (e.g., Paris coordinates)
- Test with same point (should return 0)
- Test with very close points (should return small positive value)
- Test with North-South distance (along same meridian)
- Test with East-West distance (along same parallel)

#### Test sortWaypointsByNearestNeighbor function:
- Sort single waypoint (should return it as-is)
- Sort 2 waypoints - verify nearest first
- Sort 3+ waypoints - verify optimal order
- Test with waypoints in a line (should visit them sequentially)
- Test with scattered waypoints (should find nearest neighbor at each step)
- Test with clustered waypoints
- Test with empty waypoints array (should return empty array)
- Verify that each POI in result has `.location` property

#### Test calculateDistance edge cases:
- Test with points at antipodes
- Test with points crossing international date line
- Test with points near poles
- Verify distance is always positive or zero

## Testing Considerations

Manual testing in application:
- Test with 0 "Want to Visit" POIs (should build direct route)
- Test with 1 "Want to Visit" POI
- Test with multiple "Want to Visit" POIs
- Test circular route (start == finish)
- Verify console logs show correct number of waypoints
