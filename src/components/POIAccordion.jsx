import React, { useState, useCallback, useMemo } from 'react';
import { MobilityType } from '../models/UserProfile';
import { IsAccessible } from '../models/POI';
import { POIImageThumbnail, POITitle, POIType, POILinks, getPOIAccessibility } from './POIComponents';
import { WANT_TO_VISIT_POI_HIGHLIGHT_COLOR } from '../pages/RoutePlanner';

/**
 * Accordion item component for POI groups
 */
function AccordionItem({ title, count, isOpen, onToggle, children }) {
  return (
    <div style={{ 
      marginBottom: '8px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      overflow: 'hidden',
      backgroundColor: '#fff'
    }}>
      <div
        onClick={onToggle}
        style={{
          padding: '12px 16px',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: isOpen ? '#f5f5f5' : '#fff',
          transition: 'background-color 0.2s',
          userSelect: 'none'
        }}
        onMouseOver={(e) => {
          if (!isOpen) e.currentTarget.style.backgroundColor = '#fafafa';
        }}
        onMouseOut={(e) => {
          if (!isOpen) e.currentTarget.style.backgroundColor = '#fff';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px', fontWeight: '600', color: '#333' }}>
            {title}
          </span>
          <span style={{ 
            fontSize: '12px', 
            color: '#666',
            backgroundColor: '#e0e0e0',
            padding: '2px 8px',
            borderRadius: '12px',
            fontWeight: '500'
          }}>
            {count}
          </span>
        </div>
        <span style={{ fontSize: '18px', color: '#666', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          ▼
        </span>
      </div>
      {isOpen && (
        <div style={{ 
          borderTop: '1px solid #eee'
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Group POIs by accessibility based on user's mobility type
 * @param {Array} pois - Array of POIs to group
 * @param {string} mobilityType - User's mobility type from MobilityType enum
 * @returns {Object} Object with accessibility groups
 */
function groupPOIsByAccessibility(pois, mobilityType) {
  const groups = {
    wantToVisit: [],
    accessible: [],
    limitedAccessibility: [],
    inaccessible: [],
    unknown: []
  };

  // For STANDARD mobility, all POIs go to "accessible" or "wantToVisit"
  if (mobilityType === MobilityType.STANDARD) {
    pois.forEach(poi => {
      if (poi.wantToVisit) {
        groups.wantToVisit.push(poi);
      } else {
        groups.accessible.push(poi);
      }
    });
    return groups;
  }

  // For other mobility types, categorize by accessibility
  pois.forEach(poi => {
    // "Want to Visit" always goes first, regardless of accessibility
    if (poi.wantToVisit) {
      groups.wantToVisit.push(poi);
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
    } else if (accessibilityStatus === IsAccessible.LIMITED) {
      groups.limitedAccessibility.push(poi);
    } else if (accessibilityStatus === IsAccessible.NO) {
      groups.inaccessible.push(poi);
    } else {
      groups.unknown.push(poi);
    }
  });

  return groups;
}

/**
 * POI Accordion component - displays POIs grouped by accessibility
 */
export function POIAccordion({ 
  pois, 
  userProfile,
  categoryColors,
  selectedPoiId,
  onPoiSelect,
  mapsAPI,
  onImageLoaded,
  onToggleWantToVisit
}) {
  // Accordion state for POI groups
  const [openAccordions, setOpenAccordions] = useState({
    wantToVisit: true,
    accessible: true,
    limitedAccessibility: false,
    inaccessible: false,
    unknown: false
  });

  // Group POIs by accessibility
  const groupedPOIs = useMemo(() => {
    const mobilityType = userProfile?.mobility || MobilityType.STANDARD;
    return groupPOIsByAccessibility(pois, mobilityType);
  }, [pois, userProfile?.mobility]);

  // Toggle accordion open/closed
  const toggleAccordion = useCallback((key) => {
    setOpenAccordions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);

  // Render single POI item (reusable component)
  const renderPOIItem = useCallback((poi, index, isLast) => {
    const poiCategories = poi.interest_categories || [];
    const colors = poiCategories.map(cat => categoryColors[cat] || '#999');
    const isSelected = selectedPoiId === poi.id;
    
    return (
      <div
        key={poi.id || index}
        id={`poi-item-${poi.id}`}
        onClick={() => {
          onPoiSelect(prevId => prevId === poi.id ? null : poi.id);
        }}
        onMouseOver={(e) => {
          if (!isSelected && !poi.wantToVisit) e.currentTarget.style.backgroundColor = '#f5f5f5';
        }}
        onMouseOut={(e) => {
          if (!isSelected && !poi.wantToVisit) e.currentTarget.style.backgroundColor = 'transparent';
        }}
        style={{
          padding: '12px 16px',
          borderBottom: !isLast ? '1px solid #eee' : 'none',
          cursor: 'pointer',
          transition: 'all 0.2s',
          position: 'relative',
          backgroundColor: poi.wantToVisit ? WANT_TO_VISIT_POI_HIGHLIGHT_COLOR : (isSelected ? '#e3f2fd' : 'transparent'),
          transform: isSelected ? 'translateX(4px)' : 'translateX(0)',
          boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
          display: 'flex',
          gap: '12px',
          alignItems: 'center'
        }}
      >
        {/* Multi-color category indicator (left border) */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '4px',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {colors.map((color, idx) => (
            <div
              key={idx}
              style={{
                flex: 1,
                backgroundColor: color
              }}
            />
          ))}
        </div>
        
        {/* POI Image */}
        <POIImageThumbnail 
          poi={poi} 
          mapsAPI={mapsAPI} 
          onImageLoaded={onImageLoaded}
          size={80}
          showPreview={true}
        />

        {/* POI Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Want to Visit Checkbox */}
          <div style={{ marginBottom: '4px' }}>
            <label 
              onClick={(e) => e.stopPropagation()}
              style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', fontSize: '12px' }}
            >
              <input
                type="checkbox"
                checked={poi.wantToVisit || false}
                onChange={(e) => {
                  e.stopPropagation();
                  onToggleWantToVisit(poi);
                }}
                style={{ marginRight: '4px' }}
              />
              Want to visit
            </label>
          </div>
          
          <POITitle poi={poi} color={colors[0]} variant="default" />
          <POIType poi={poi} />
          <POILinks poi={poi} fontSize="11px" gap="8px" />
          {getPOIAccessibility({ poi })}
        </div>
      </div>
    );
  }, [selectedPoiId, categoryColors, mapsAPI, onImageLoaded, onToggleWantToVisit, onPoiSelect]);

  return (
    <>
      {/* Want to Visit Group */}
      {groupedPOIs.wantToVisit.length > 0 && (
        <AccordionItem
          title="Want to Visit"
          count={groupedPOIs.wantToVisit.length}
          isOpen={openAccordions.wantToVisit}
          onToggle={() => toggleAccordion('wantToVisit')}
        >
          {groupedPOIs.wantToVisit.map((poi, index) =>
            renderPOIItem(poi, index, index === groupedPOIs.wantToVisit.length - 1)
          )}
        </AccordionItem>
      )}

      {/* Accessible Group */}
      {groupedPOIs.accessible.length > 0 && (
        <AccordionItem
          title="Accessible"
          count={groupedPOIs.accessible.length}
          isOpen={openAccordions.accessible}
          onToggle={() => toggleAccordion('accessible')}
        >
          {groupedPOIs.accessible.map((poi, index) =>
            renderPOIItem(poi, index, index === groupedPOIs.accessible.length - 1)
          )}
        </AccordionItem>
      )}

      {/* Limited Accessibility Group - only show for non-STANDARD mobility */}
      {userProfile?.mobility !== MobilityType.STANDARD && groupedPOIs.limitedAccessibility.length > 0 && (
        <AccordionItem
          title="Limited Accessibility"
          count={groupedPOIs.limitedAccessibility.length}
          isOpen={openAccordions.limitedAccessibility}
          onToggle={() => toggleAccordion('limitedAccessibility')}
        >
          {groupedPOIs.limitedAccessibility.map((poi, index) =>
            renderPOIItem(poi, index, index === groupedPOIs.limitedAccessibility.length - 1)
          )}
        </AccordionItem>
      )}

      {/* Inaccessible Group - only show for non-STANDARD mobility */}
      {userProfile?.mobility !== MobilityType.STANDARD && groupedPOIs.inaccessible.length > 0 && (
        <AccordionItem
          title="Inaccessible"
          count={groupedPOIs.inaccessible.length}
          isOpen={openAccordions.inaccessible}
          onToggle={() => toggleAccordion('inaccessible')}
        >
          {groupedPOIs.inaccessible.map((poi, index) =>
            renderPOIItem(poi, index, index === groupedPOIs.inaccessible.length - 1)
          )}
        </AccordionItem>
      )}

      {/* Accessibility Unknown Group - only show for non-STANDARD mobility */}
      {userProfile?.mobility !== MobilityType.STANDARD && groupedPOIs.unknown.length > 0 && (
        <AccordionItem
          title="Accessibility Unknown"
          count={groupedPOIs.unknown.length}
          isOpen={openAccordions.unknown}
          onToggle={() => toggleAccordion('unknown')}
        >
          {groupedPOIs.unknown.map((poi, index) =>
            renderPOIItem(poi, index, index === groupedPOIs.unknown.length - 1)
          )}
        </AccordionItem>
      )}
    </>
  );
}

