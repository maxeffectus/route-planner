import { useMemo } from 'react';
import { MobilityType, UNFILLED_MARKERS } from '../models/UserProfile';
import { IsAccessible } from '../models/POI';

/**
 * Custom hook for grouping POIs by accessibility
 * Manages the logic of categorizing POIs based on user's mobility type
 * and maintains knowledge of which POI belongs to which group
 * 
 * @param {Array} pois - Array of POIs to group
 * @param {Object} userProfile - User profile containing mobility information
 * @returns {Object} Grouped POIs and metadata
 */
export function usePOIGrouping(pois, userProfile) {
  // Get mobility type, defaulting to STANDARD if not set or unfilled
  const mobilityType = (userProfile?.mobility && 
                        userProfile.mobility !== UNFILLED_MARKERS.STRING && 
                        userProfile.mobility !== UNFILLED_MARKERS.OBJECT) 
    ? userProfile.mobility 
    : MobilityType.STANDARD;

  // Group POIs and create metadata mapping
  const groupingResult = useMemo(() => {
    const groups = {
      wantToVisit: [],
      accessible: [],
      limitedAccessibility: [],
      inaccessible: [],
      unknown: []
    };

    // Map each POI ID to its group name
    const poiToGroupMap = new Map();

    // For STANDARD mobility, all POIs go to "accessible" or "wantToVisit"
    if (mobilityType === MobilityType.STANDARD) {
      pois.forEach(poi => {
        if (poi.wantToVisit) {
          groups.wantToVisit.push(poi);
          poiToGroupMap.set(poi.id, 'wantToVisit');
        } else {
          groups.accessible.push(poi);
          poiToGroupMap.set(poi.id, 'accessible');
        }
      });

      return {
        groups,
        poiToGroupMap,
        mobilityType,
        hasMultipleGroups: groups.wantToVisit.length > 0
      };
    }

    // For other mobility types, categorize by accessibility
    pois.forEach(poi => {
      // "Want to Visit" always goes first, regardless of accessibility
      if (poi.wantToVisit) {
        groups.wantToVisit.push(poi);
        poiToGroupMap.set(poi.id, 'wantToVisit');
        return;
      }

      let accessibilityStatus;
      
      // Determine accessibility based on mobility type
      if (mobilityType === MobilityType.WHEELCHAIR) {
        accessibilityStatus = poi.isWheelchairAccessible();
      } else if (mobilityType === MobilityType.STROLLER) {
        accessibilityStatus = poi.isStrollerAccessible();
      } else if (mobilityType === MobilityType.LOW_ENDURANCE) {
        accessibilityStatus = poi.isTempMobilityIssuesAccessible();
      } else {
        accessibilityStatus = IsAccessible.UNKNOWN;
      }

      // Categorize by status
      if (accessibilityStatus === IsAccessible.YES) {
        groups.accessible.push(poi);
        poiToGroupMap.set(poi.id, 'accessible');
      } else if (accessibilityStatus === IsAccessible.LIMITED) {
        groups.limitedAccessibility.push(poi);
        poiToGroupMap.set(poi.id, 'limitedAccessibility');
      } else if (accessibilityStatus === IsAccessible.NO) {
        groups.inaccessible.push(poi);
        poiToGroupMap.set(poi.id, 'inaccessible');
      } else {
        groups.unknown.push(poi);
        poiToGroupMap.set(poi.id, 'unknown');
      }
    });

    return {
      groups,
      poiToGroupMap,
      mobilityType,
      hasMultipleGroups: true
    };
  }, [pois, mobilityType]);

  // Helper function to get group name for a specific POI
  const getGroupForPOI = (poiId) => {
    return groupingResult.poiToGroupMap.get(poiId) || null;
  };

  // Helper function to check if a POI is in a specific group
  const isPOIInGroup = (poiId, groupName) => {
    return groupingResult.poiToGroupMap.get(poiId) === groupName;
  };

  // Get group display information
  const getGroupInfo = (groupName) => {
    const groupTitles = {
      wantToVisit: 'Want to Visit',
      accessible: 'Accessible',
      limitedAccessibility: 'Limited Accessibility',
      inaccessible: 'Inaccessible',
      unknown: 'Accessibility Unknown'
    };

    const group = groupingResult.groups[groupName] || [];
    
    return {
      title: groupTitles[groupName] || groupName,
      count: group.length,
      pois: group,
      isEmpty: group.length === 0
    };
  };

  // Determine which groups should be visible based on mobility type
  const getVisibleGroups = () => {
    const allGroups = [
      'wantToVisit',
      'accessible',
      'limitedAccessibility',
      'inaccessible',
      'unknown'
    ];

    if (mobilityType === MobilityType.STANDARD) {
      // For STANDARD mobility, only show wantToVisit and accessible
      return allGroups
        .filter(group => ['wantToVisit', 'accessible'].includes(group))
        .filter(group => !getGroupInfo(group).isEmpty);
    }

    // For other mobility types, show all non-empty groups
    return allGroups.filter(group => !getGroupInfo(group).isEmpty);
  };

  return {
    groups: groupingResult.groups,
    poiToGroupMap: groupingResult.poiToGroupMap,
    mobilityType: groupingResult.mobilityType,
    hasMultipleGroups: groupingResult.hasMultipleGroups,
    getGroupForPOI,
    isPOIInGroup,
    getGroupInfo,
    getVisibleGroups
  };
}

