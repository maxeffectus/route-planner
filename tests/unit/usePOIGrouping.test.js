/**
 * Tests for usePOIGrouping hook
 */

import { renderHook } from '@testing-library/react';
import { usePOIGrouping } from '../../src/hooks/usePOIGrouping';
import { UserProfile, MobilityType } from '../../src/models/UserProfile';
import { OpenStreetPOI, IsAccessible } from '../../src/models/POI';

describe('usePOIGrouping Hook', () => {
  // Helper function to create mock POI
  const createMockPOI = (id, name, wheelchairAccessible = 'unknown', wantToVisit = false) => {
    return new OpenStreetPOI({
      id,
      name,
      type: 'node',
      interest_categories: ['history_culture'],
      location: { lat: 52.52, lng: 13.405 },
      allTags: {
        wheelchair: wheelchairAccessible
      },
      wantToVisit
    });
  };

  describe('Grouping for STANDARD mobility', () => {
    it('should group all POIs as accessible for STANDARD mobility', () => {
      const profile = new UserProfile();
      profile.mobility = MobilityType.STANDARD;

      const pois = [
        createMockPOI(1, 'Accessible POI', 'yes'),
        createMockPOI(2, 'Inaccessible POI', 'no'),
        createMockPOI(3, 'Limited POI', 'limited'),
        createMockPOI(4, 'Unknown POI', 'unknown')
      ];

      const { result } = renderHook(() => usePOIGrouping(pois, profile));

      expect(result.current.groups.accessible.length).toBe(4);
      expect(result.current.groups.wantToVisit.length).toBe(0);
      expect(result.current.groups.limitedAccessibility.length).toBe(0);
      expect(result.current.groups.inaccessible.length).toBe(0);
      expect(result.current.groups.unknown.length).toBe(0);
      expect(result.current.mobilityType).toBe(MobilityType.STANDARD);
    });

    it('should separate wantToVisit POIs from accessible for STANDARD mobility', () => {
      const profile = new UserProfile();
      profile.mobility = MobilityType.STANDARD;

      const pois = [
        createMockPOI(1, 'Want to Visit POI', 'no', true),
        createMockPOI(2, 'Regular POI', 'yes', false),
        createMockPOI(3, 'Another Want to Visit', 'yes', true)
      ];

      const { result } = renderHook(() => usePOIGrouping(pois, profile));

      expect(result.current.groups.wantToVisit.length).toBe(2);
      expect(result.current.groups.accessible.length).toBe(1);
      expect(result.current.groups.wantToVisit[0].id).toBe(1);
      expect(result.current.groups.wantToVisit[1].id).toBe(3);
      expect(result.current.groups.accessible[0].id).toBe(2);
    });

    it('should show only non-empty groups for STANDARD mobility', () => {
      const profile = new UserProfile();
      profile.mobility = MobilityType.STANDARD;

      const pois = [
        createMockPOI(1, 'Regular POI', 'yes', false)
      ];

      const { result } = renderHook(() => usePOIGrouping(pois, profile));

      const visibleGroups = result.current.getVisibleGroups();
      
      expect(visibleGroups).toEqual(['accessible']);
    });
  });

  describe('Grouping for WHEELCHAIR mobility', () => {
    it('should separate POIs by accessibility for WHEELCHAIR mobility', () => {
      const profile = new UserProfile();
      profile.mobility = MobilityType.WHEELCHAIR;

      const pois = [
        createMockPOI(1, 'Accessible POI', 'yes'),
        createMockPOI(2, 'Inaccessible POI', 'no'),
        createMockPOI(3, 'Limited POI', 'limited'),
        createMockPOI(4, 'Unknown POI', 'unknown')
      ];

      const { result } = renderHook(() => usePOIGrouping(pois, profile));

      expect(result.current.groups.accessible.length).toBe(1);
      expect(result.current.groups.inaccessible.length).toBe(1);
      expect(result.current.groups.limitedAccessibility.length).toBe(1);
      expect(result.current.groups.unknown.length).toBe(1);
      expect(result.current.groups.accessible[0].id).toBe(1);
      expect(result.current.groups.inaccessible[0].id).toBe(2);
      expect(result.current.groups.limitedAccessibility[0].id).toBe(3);
      expect(result.current.groups.unknown[0].id).toBe(4);
    });

    it('should prioritize wantToVisit regardless of accessibility for WHEELCHAIR', () => {
      const profile = new UserProfile();
      profile.mobility = MobilityType.WHEELCHAIR;

      const pois = [
        createMockPOI(1, 'Want to Visit Inaccessible', 'no', true),
        createMockPOI(2, 'Regular Accessible', 'yes', false),
        createMockPOI(3, 'Regular Inaccessible', 'no', false)
      ];

      const { result } = renderHook(() => usePOIGrouping(pois, profile));

      expect(result.current.groups.wantToVisit.length).toBe(1);
      expect(result.current.groups.accessible.length).toBe(1);
      expect(result.current.groups.inaccessible.length).toBe(1);
      expect(result.current.groups.wantToVisit[0].id).toBe(1);
    });
  });

  describe('Grouping for STROLLER mobility', () => {
    it('should use stroller accessibility checks', () => {
      const profile = new UserProfile();
      profile.mobility = MobilityType.STROLLER;

      const pois = [
        new OpenStreetPOI({
          id: 1,
          name: 'Stroller Accessible',
          type: 'node',
          interest_categories: ['history_culture'],
          location: { lat: 52.52, lng: 13.405 },
          allTags: { stroller: 'yes' },
          wantToVisit: false
        }),
        new OpenStreetPOI({
          id: 2,
          name: 'Stroller Inaccessible',
          type: 'node',
          interest_categories: ['history_culture'],
          location: { lat: 52.52, lng: 13.405 },
          allTags: { stroller: 'no' },
          wantToVisit: false
        })
      ];

      const { result } = renderHook(() => usePOIGrouping(pois, profile));

      expect(result.current.groups.accessible.length).toBe(1);
      expect(result.current.groups.inaccessible.length).toBe(1);
      expect(result.current.groups.accessible[0].id).toBe(1);
      expect(result.current.groups.inaccessible[0].id).toBe(2);
    });
  });

  describe('Grouping for LOW_ENDURANCE mobility', () => {
    it('should use temporary mobility issues accessibility checks', () => {
      const profile = new UserProfile();
      profile.mobility = MobilityType.LOW_ENDURANCE;

      const pois = [
        createMockPOI(1, 'With Ramp', 'yes'),
        createMockPOI(2, 'No Accessibility', 'no'),
        createMockPOI(3, 'Unknown', 'unknown')
      ];

      const { result } = renderHook(() => usePOIGrouping(pois, profile));

      expect(result.current.groups.accessible.length).toBe(1);
      expect(result.current.groups.inaccessible.length).toBe(1);
      expect(result.current.groups.unknown.length).toBe(1);
    });
  });

  describe('poiToGroupMap', () => {
    it('should correctly map POI IDs to group names', () => {
      const profile = new UserProfile();
      profile.mobility = MobilityType.WHEELCHAIR;

      const pois = [
        createMockPOI(1, 'Accessible POI', 'yes'),
        createMockPOI(2, 'Inaccessible POI', 'no'),
        createMockPOI(3, 'Want to Visit', 'no', true)
      ];

      const { result } = renderHook(() => usePOIGrouping(pois, profile));

      expect(result.current.poiToGroupMap.get(1)).toBe('accessible');
      expect(result.current.poiToGroupMap.get(2)).toBe('inaccessible');
      expect(result.current.poiToGroupMap.get(3)).toBe('wantToVisit');
    });

    it('should return correct group names for all POIs', () => {
      const profile = new UserProfile();
      profile.mobility = MobilityType.STANDARD;

      const pois = [
        createMockPOI(1, 'Regular POI', 'yes', false),
        createMockPOI(2, 'Want to Visit', 'yes', true)
      ];

      const { result } = renderHook(() => usePOIGrouping(pois, profile));

      expect(result.current.poiToGroupMap.size).toBe(2);
      expect(result.current.poiToGroupMap.get(1)).toBe('accessible');
      expect(result.current.poiToGroupMap.get(2)).toBe('wantToVisit');
    });
  });

  describe('Helper functions', () => {
    it('getGroupForPOI should return correct group name', () => {
      const profile = new UserProfile();
      profile.mobility = MobilityType.WHEELCHAIR;

      const pois = [
        createMockPOI(1, 'Accessible POI', 'yes'),
        createMockPOI(2, 'Inaccessible POI', 'no')
      ];

      const { result } = renderHook(() => usePOIGrouping(pois, profile));

      expect(result.current.getGroupForPOI(1)).toBe('accessible');
      expect(result.current.getGroupForPOI(2)).toBe('inaccessible');
      expect(result.current.getGroupForPOI(999)).toBeNull();
    });

    it('isPOIInGroup should correctly check group membership', () => {
      const profile = new UserProfile();
      profile.mobility = MobilityType.WHEELCHAIR;

      const pois = [
        createMockPOI(1, 'Accessible POI', 'yes'),
        createMockPOI(2, 'Inaccessible POI', 'no')
      ];

      const { result } = renderHook(() => usePOIGrouping(pois, profile));

      expect(result.current.isPOIInGroup(1, 'accessible')).toBe(true);
      expect(result.current.isPOIInGroup(1, 'inaccessible')).toBe(false);
      expect(result.current.isPOIInGroup(2, 'inaccessible')).toBe(true);
      expect(result.current.isPOIInGroup(2, 'accessible')).toBe(false);
    });

    it('getGroupInfo should return correct information', () => {
      const profile = new UserProfile();
      profile.mobility = MobilityType.WHEELCHAIR;

      const pois = [
        createMockPOI(1, 'Accessible POI', 'yes'),
        createMockPOI(2, 'Another Accessible', 'yes')
      ];

      const { result } = renderHook(() => usePOIGrouping(pois, profile));

      const accessibleInfo = result.current.getGroupInfo('accessible');
      
      expect(accessibleInfo.title).toBe('Accessible');
      expect(accessibleInfo.count).toBe(2);
      expect(accessibleInfo.pois.length).toBe(2);
      expect(accessibleInfo.isEmpty).toBe(false);

      const inaccessibleInfo = result.current.getGroupInfo('inaccessible');
      
      expect(inaccessibleInfo.title).toBe('Inaccessible');
      expect(inaccessibleInfo.count).toBe(0);
      expect(inaccessibleInfo.isEmpty).toBe(true);
    });

    it('getVisibleGroups should return only non-empty groups', () => {
      const profile = new UserProfile();
      profile.mobility = MobilityType.WHEELCHAIR;

      const pois = [
        createMockPOI(1, 'Accessible POI', 'yes'),
        createMockPOI(2, 'Inaccessible POI', 'no'),
        createMockPOI(3, 'Want to Visit', 'yes', true)
      ];

      const { result } = renderHook(() => usePOIGrouping(pois, profile));

      const visibleGroups = result.current.getVisibleGroups();
      
      expect(visibleGroups).toContain('wantToVisit');
      expect(visibleGroups).toContain('accessible');
      expect(visibleGroups).toContain('inaccessible');
      expect(visibleGroups).not.toContain('limitedAccessibility');
      expect(visibleGroups).not.toContain('unknown');
    });
  });

  describe('hasMultipleGroups flag', () => {
    it('should be false when only accessible group exists for STANDARD', () => {
      const profile = new UserProfile();
      profile.mobility = MobilityType.STANDARD;

      const pois = [
        createMockPOI(1, 'Regular POI', 'yes', false)
      ];

      const { result } = renderHook(() => usePOIGrouping(pois, profile));

      expect(result.current.hasMultipleGroups).toBe(false);
    });

    it('should be true when wantToVisit group exists for STANDARD', () => {
      const profile = new UserProfile();
      profile.mobility = MobilityType.STANDARD;

      const pois = [
        createMockPOI(1, 'Want to Visit', 'yes', true),
        createMockPOI(2, 'Regular POI', 'yes', false)
      ];

      const { result } = renderHook(() => usePOIGrouping(pois, profile));

      expect(result.current.hasMultipleGroups).toBe(true);
    });

    it('should be true for non-STANDARD mobility types', () => {
      const profile = new UserProfile();
      profile.mobility = MobilityType.WHEELCHAIR;

      const pois = [
        createMockPOI(1, 'Accessible POI', 'yes')
      ];

      const { result } = renderHook(() => usePOIGrouping(pois, profile));

      expect(result.current.hasMultipleGroups).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty POI array', () => {
      const profile = new UserProfile();
      profile.mobility = MobilityType.STANDARD;

      const { result } = renderHook(() => usePOIGrouping([], profile));

      expect(result.current.groups.accessible.length).toBe(0);
      expect(result.current.groups.wantToVisit.length).toBe(0);
      expect(result.current.poiToGroupMap.size).toBe(0);
      expect(result.current.getVisibleGroups()).toEqual([]);
    });

    it('should handle null userProfile by defaulting to STANDARD', () => {
      const pois = [
        createMockPOI(1, 'POI 1', 'yes'),
        createMockPOI(2, 'POI 2', 'no')
      ];

      const { result } = renderHook(() => usePOIGrouping(pois, null));

      expect(result.current.mobilityType).toBe(MobilityType.STANDARD);
      expect(result.current.groups.accessible.length).toBe(2);
    });

    it('should handle unfilled mobility by defaulting to STANDARD', () => {
      const profile = new UserProfile();
      // mobility is UNFILLED_MARKERS.OBJECT by default

      const pois = [
        createMockPOI(1, 'POI 1', 'yes'),
        createMockPOI(2, 'POI 2', 'no')
      ];

      const { result } = renderHook(() => usePOIGrouping(pois, profile));

      // Hook should default to STANDARD when mobility is unfilled
      expect(result.current.groups.accessible.length).toBe(2);
      expect(result.current.groups.inaccessible.length).toBe(0);
    });

    it('should update groups when pois change', () => {
      const profile = new UserProfile();
      profile.mobility = MobilityType.WHEELCHAIR;

      const initialPois = [
        createMockPOI(1, 'Accessible POI', 'yes')
      ];

      const { result, rerender } = renderHook(
        ({ pois, userProfile }) => usePOIGrouping(pois, userProfile),
        { initialProps: { pois: initialPois, userProfile: profile } }
      );

      expect(result.current.groups.accessible.length).toBe(1);

      const updatedPois = [
        createMockPOI(1, 'Accessible POI', 'yes'),
        createMockPOI(2, 'Inaccessible POI', 'no')
      ];

      rerender({ pois: updatedPois, userProfile: profile });

      expect(result.current.groups.accessible.length).toBe(1);
      expect(result.current.groups.inaccessible.length).toBe(1);
    });

    it('should update groups when mobility type changes', () => {
      const profile = new UserProfile();
      profile.mobility = MobilityType.WHEELCHAIR;

      const pois = [
        createMockPOI(1, 'Accessible POI', 'yes'),
        createMockPOI(2, 'Inaccessible POI', 'no')
      ];

      const { result, rerender } = renderHook(
        ({ pois, userProfile }) => usePOIGrouping(pois, userProfile),
        { initialProps: { pois, userProfile: profile } }
      );

      expect(result.current.groups.accessible.length).toBe(1);
      expect(result.current.groups.inaccessible.length).toBe(1);

      // Change mobility to STANDARD
      const updatedProfile = new UserProfile();
      updatedProfile.mobility = MobilityType.STANDARD;

      rerender({ pois, userProfile: updatedProfile });

      expect(result.current.groups.accessible.length).toBe(2);
      expect(result.current.groups.inaccessible.length).toBe(0);
    });
  });

  describe('Group titles', () => {
    it('should return correct titles for all groups', () => {
      const profile = new UserProfile();
      profile.mobility = MobilityType.WHEELCHAIR;

      const pois = [
        createMockPOI(1, 'POI', 'yes', true)
      ];

      const { result } = renderHook(() => usePOIGrouping(pois, profile));

      expect(result.current.getGroupInfo('wantToVisit').title).toBe('Want to Visit');
      expect(result.current.getGroupInfo('accessible').title).toBe('Accessible');
      expect(result.current.getGroupInfo('limitedAccessibility').title).toBe('Limited Accessibility');
      expect(result.current.getGroupInfo('inaccessible').title).toBe('Inaccessible');
      expect(result.current.getGroupInfo('unknown').title).toBe('Accessibility Unknown');
    });
  });
});

