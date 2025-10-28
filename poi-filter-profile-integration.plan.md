# Manual Route Calculation Control

## Summary

Add a "Calculate Route" button to the left panel and remove automatic route calculation. Routes should only be calculated when the user explicitly clicks the button.

## Implementation Steps

### 1. Remove Auto-Trigger useEffect

**File:** `src/pages/RoutePlanner.jsx`

Remove or comment out lines 332-339 which automatically trigger `buildRoute()` when start/finish points change.

### 2. Add Calculate Route Button

**File:** `src/pages/RoutePlanner.jsx`

Add a "Calculate Route" button in the left panel after the finish point selection section (after line 651), but before the POI list section.

Button requirements:
- Only enabled when both start and finish points are selected
- Shows loading state while calculating
- Displays error message if calculation fails
- Position it prominently near the route selection UI

### 3. Update buildRoute Dependencies

**File:** `src/pages/RoutePlanner.jsx`

Remove dependencies that might cause unwanted re-calculations. Update the useCallback dependencies on line 330 to remove `poiCache` and `filteredPois.length` if they cause issues.

### 4. Verify No Other Auto-Calculations

Search for any other places that call `buildRoute()`:
- Check if `handleToggleWantToVisit` triggers re-calculation (should NOT)
- Check if `handleFindPOIsiseconds` triggers re-calculation (should NOT)
- Check if map panning/zooming triggers re-calculation (should NOT)
- Ensure route is only calculated when button is clicked

### 5. Optional: Clear Route on Point Changes

When user changes start or finish point, clear the existing route until they click "Calculate Route" again.

### 6. Add Tests

**File:** `tests/integration/manualRouteCalculation.test.js` (new file)

Add integration tests for manual route calculation:

#### Test Manual Route Calculation:
- Route should NOT be calculated when start point is selected
- Route should NOT be calculated when finish point is selected
- Route should only be calculated when "Calculate Route" button is clicked
- Button should be disabled when start OR finish point is missing
- Button should be enabled when both start AND finish points are selected
- Button should show loading state during calculation
- Route should be cleared when start point is changed
- Route should be cleared when finish point is changed

#### Test No Auto-Calculations:
- Route should NOT be recalculated when POIs are fetched
- Route should NOT be recalculated when category filter changes
- Route should NOT be recalculated when "Want to Visit" status is toggled
- Route should NOT be recalculated when map is panned
- Route should NOT be recalculated when map is zoomed
- Route should NOT be recalculated when POI cache is updated

#### Test Route State Management:
- Existing route should be cleared when clicking "Calculate Route" again
- Error state should be displayed if route calculation fails
- Error state should be cleared when successfully calculating a new route
