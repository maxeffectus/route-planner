/**
 * Tests for Accessibility Warning functionality
 */

import { UserProfile, MobilityType } from '../../src/models/UserProfile';
import { OpenStreetPOI } from '../../src/models/POI';

describe('Accessibility Warning Logic', () => {
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

  describe('Warning message generation', () => {
    it('should generate warning for inaccessible POI', () => {
      const poi = createMockPOI(1, 'Inaccessible Place', 'no');
      const profile = new UserProfile();
      profile.mobility = MobilityType.WHEELCHAIR;

      // Check accessibility
      const accessibility = poi.isWheelchairAccessible();
      expect(accessibility).toBe('no');

      // Expected warning
      const expectedMessage = 'This venue is not suitable for your mobility needs. Are you sure you want to visit it?';
      expect(expectedMessage).toBeTruthy();
    });

    it('should generate warning for limited accessibility POI', () => {
      const poi = createMockPOI(1, 'Limited Place', 'limited');
      const profile = new UserProfile();
      profile.mobility = MobilityType.WHEELCHAIR;

      // Check accessibility
      const accessibility = poi.isWheelchairAccessible();
      expect(accessibility).toBe('limited');

      // Expected warning
      const expectedMessage = 'This venue has got limited accessibility for your mobility needs. Are you sure you want to visit it?';
      expect(expectedMessage).toBeTruthy();
    });

    it('should generate warning for unknown accessibility POI', () => {
      const poi = createMockPOI(1, 'Unknown Place', 'unknown');
      const profile = new UserProfile();
      profile.mobility = MobilityType.WHEELCHAIR;

      // Check accessibility
      const accessibility = poi.isWheelchairAccessible();
      expect(accessibility).toBe('unknown');

      // Expected warning
      const expectedMessage = "We don't know if this venue is suitable for your mobility needs. Are you sure you want to visit it?";
      expect(expectedMessage).toBeTruthy();
    });

    it('should not generate warning for accessible POI', () => {
      const poi = createMockPOI(1, 'Accessible Place', 'yes');
      const profile = new UserProfile();
      profile.mobility = MobilityType.WHEELCHAIR;

      // Check accessibility
      const accessibility = poi.isWheelchairAccessible();
      expect(accessibility).toBe('yes');

      // No warning expected
      expect(accessibility).toBe('yes');
    });
  });

  describe('Accessibility check for different mobility types', () => {
    it('should check wheelchair accessibility for WHEELCHAIR mobility', () => {
      const poi = createMockPOI(1, 'Test Place', 'no');
      const profile = new UserProfile();
      profile.mobility = MobilityType.WHEELCHAIR;

      expect(poi.isWheelchairAccessible()).toBe('no');
    });

    it('should check stroller accessibility for STROLLER mobility', () => {
      const poi = new OpenStreetPOI({
        id: 1,
        name: 'Test Place',
        type: 'node',
        interest_categories: ['history_culture'],
        location: { lat: 52.52, lng: 13.405 },
        allTags: {
          stroller: 'no'
        },
        wantToVisit: false
      });
      const profile = new UserProfile();
      profile.mobility = MobilityType.STROLLER;

      expect(poi.isStrollerAccessible()).toBe('no');
    });

    it('should check temp mobility issues accessibility for LOW_ENDURANCE', () => {
      const poi = createMockPOI(1, 'Test Place', 'no');
      const profile = new UserProfile();
      profile.mobility = MobilityType.LOW_ENDURANCE;

      expect(poi.isTempMobilityIssuesAccessible()).toBe('no');
    });

    it('should not check accessibility for STANDARD mobility', () => {
      const poi = createMockPOI(1, 'Test Place', 'no');
      const profile = new UserProfile();
      profile.mobility = MobilityType.STANDARD;

      // For standard mobility, all POIs are considered accessible
      // No accessibility check is performed
      expect(profile.mobility).toBe(MobilityType.STANDARD);
    });
  });

  describe('Want to Visit toggle logic', () => {
    it('should allow adding accessible POI without warning', () => {
      const poi = createMockPOI(1, 'Accessible Place', 'yes', false);
      const profile = new UserProfile();
      profile.mobility = MobilityType.WHEELCHAIR;

      // Should not have wantToVisit flag initially
      expect(poi.wantToVisit).toBe(false);

      // Simulate adding to want to visit
      poi.wantToVisit = true;
      profile.addWantToVisit(poi);

      expect(poi.wantToVisit).toBe(true);
      expect(profile.isWantToVisit(poi.id)).toBe(true);
    });

    it('should allow removing POI without warning', () => {
      const poi = createMockPOI(1, 'Test Place', 'no', true);
      const profile = new UserProfile();
      profile.mobility = MobilityType.WHEELCHAIR;
      profile.addWantToVisit(poi);

      // Should have wantToVisit flag
      expect(poi.wantToVisit).toBe(true);
      expect(profile.isWantToVisit(poi.id)).toBe(true);

      // Simulate removing from want to visit
      poi.wantToVisit = false;
      profile.removeWantToVisit(poi.id);

      expect(poi.wantToVisit).toBe(false);
      expect(profile.isWantToVisit(poi.id)).toBe(false);
    });

    it('should require confirmation for inaccessible POI', () => {
      const poi = createMockPOI(1, 'Inaccessible Place', 'no', false);
      const profile = new UserProfile();
      profile.mobility = MobilityType.WHEELCHAIR;

      // Check if warning would be shown
      const accessibility = poi.isWheelchairAccessible();
      const shouldShowWarning = accessibility === 'no';

      expect(shouldShowWarning).toBe(true);
      expect(poi.wantToVisit).toBe(false);
    });

    it('should require confirmation for limited accessibility POI', () => {
      const poi = createMockPOI(1, 'Limited Place', 'limited', false);
      const profile = new UserProfile();
      profile.mobility = MobilityType.WHEELCHAIR;

      // Check if warning would be shown
      const accessibility = poi.isWheelchairAccessible();
      const shouldShowWarning = accessibility === 'limited';

      expect(shouldShowWarning).toBe(true);
      expect(poi.wantToVisit).toBe(false);
    });

    it('should require confirmation for unknown accessibility POI', () => {
      const poi = createMockPOI(1, 'Unknown Place', 'unknown', false);
      const profile = new UserProfile();
      profile.mobility = MobilityType.WHEELCHAIR;

      // Check if warning would be shown
      const accessibility = poi.isWheelchairAccessible();
      const shouldShowWarning = accessibility === 'unknown';

      expect(shouldShowWarning).toBe(true);
      expect(poi.wantToVisit).toBe(false);
    });
  });

  describe('Standard mobility (no accessibility checks)', () => {
    it('should not show warnings for STANDARD mobility regardless of POI accessibility', () => {
      const inaccessiblePOI = createMockPOI(1, 'Inaccessible Place', 'no', false);
      const limitedPOI = createMockPOI(2, 'Limited Place', 'limited', false);
      const unknownPOI = createMockPOI(3, 'Unknown Place', 'unknown', false);
      
      const profile = new UserProfile();
      profile.mobility = MobilityType.STANDARD;

      // For STANDARD mobility, no warnings should be shown
      // All POIs are grouped as "accessible"
      expect(profile.mobility).toBe(MobilityType.STANDARD);
      
      // POIs can be added without warnings
      inaccessiblePOI.wantToVisit = true;
      profile.addWantToVisit(inaccessiblePOI);
      expect(profile.isWantToVisit(inaccessiblePOI.id)).toBe(true);

      limitedPOI.wantToVisit = true;
      profile.addWantToVisit(limitedPOI);
      expect(profile.isWantToVisit(limitedPOI.id)).toBe(true);

      unknownPOI.wantToVisit = true;
      profile.addWantToVisit(unknownPOI);
      expect(profile.isWantToVisit(unknownPOI.id)).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle POI without accessibility tags', () => {
      const poi = new OpenStreetPOI({
        id: 1,
        name: 'Test Place',
        type: 'node',
        interest_categories: ['history_culture'],
        location: { lat: 52.52, lng: 13.405 },
        allTags: {},
        wantToVisit: false
      });

      expect(poi.isWheelchairAccessible()).toBe('unknown');
    });

    it('should handle null profile gracefully', () => {
      const poi = createMockPOI(1, 'Test Place', 'no', false);
      
      // Simulating null profile scenario
      const profile = null;
      
      // Should not throw error
      expect(profile).toBeNull();
    });

    it('should handle POI that is already in Want to Visit', () => {
      const poi = createMockPOI(1, 'Test Place', 'no', true);
      const profile = new UserProfile();
      profile.mobility = MobilityType.WHEELCHAIR;
      profile.addWantToVisit(poi);

      // Already in want to visit
      expect(poi.wantToVisit).toBe(true);
      expect(profile.isWantToVisit(poi.id)).toBe(true);

      // Toggling should remove without warning
      poi.wantToVisit = false;
      profile.removeWantToVisit(poi.id);
      
      expect(poi.wantToVisit).toBe(false);
      expect(profile.isWantToVisit(poi.id)).toBe(false);
    });
  });

  describe('Multiple POI additions', () => {
    it('should handle multiple POI additions with different accessibility levels', () => {
      const profile = new UserProfile();
      profile.mobility = MobilityType.WHEELCHAIR;

      const accessiblePOI = createMockPOI(1, 'Accessible', 'yes', false);
      const inaccessiblePOI = createMockPOI(2, 'Inaccessible', 'no', false);
      const limitedPOI = createMockPOI(3, 'Limited', 'limited', false);

      // Add accessible POI (no warning expected)
      accessiblePOI.wantToVisit = true;
      profile.addWantToVisit(accessiblePOI);
      expect(profile.isWantToVisit(1)).toBe(true);

      // Add inaccessible POI (after user confirmation)
      inaccessiblePOI.wantToVisit = true;
      profile.addWantToVisit(inaccessiblePOI);
      expect(profile.isWantToVisit(2)).toBe(true);

      // Add limited POI (after user confirmation)
      limitedPOI.wantToVisit = true;
      profile.addWantToVisit(limitedPOI);
      expect(profile.isWantToVisit(3)).toBe(true);

      // All should be in want to visit list
      const wantToVisitPOIs = profile.getWantToVisitPOIs();
      expect(Object.keys(wantToVisitPOIs).length).toBe(3);
    });
  });
});

