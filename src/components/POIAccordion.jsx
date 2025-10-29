import React, { useState, useCallback } from 'react';
import { POIImageThumbnail, POITitle, POIType, POILinks, getPOIAccessibility } from './POIComponents';
import { WANT_TO_VISIT_POI_HIGHLIGHT_COLOR } from '../pages/RoutePlanner';
import { usePOIGrouping } from '../hooks/usePOIGrouping';

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
 * POI Accordion component - displays POIs grouped by accessibility
 * Uses usePOIGrouping hook to manage grouping logic and metadata
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
  // Use POI grouping hook to manage grouping logic and metadata
  const {
    groups: groupedPOIs,
    poiToGroupMap,
    mobilityType,
    getGroupForPOI,
    isPOIInGroup,
    getGroupInfo,
    getVisibleGroups
  } = usePOIGrouping(pois, userProfile);

  // Accordion state for POI groups
  const [openAccordions, setOpenAccordions] = useState({
    wantToVisit: true,
    accessible: true,
    limitedAccessibility: false,
    inaccessible: false,
    unknown: false
  });

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

  // Get visible groups based on mobility type
  const visibleGroups = getVisibleGroups();

  return (
    <>
      {visibleGroups.map(groupName => {
        const groupInfo = getGroupInfo(groupName);
        
        return (
          <AccordionItem
            key={groupName}
            title={groupInfo.title}
            count={groupInfo.count}
            isOpen={openAccordions[groupName]}
            onToggle={() => toggleAccordion(groupName)}
          >
            {groupInfo.pois.map((poi, index) =>
              renderPOIItem(poi, index, index === groupInfo.pois.length - 1)
            )}
          </AccordionItem>
        );
      })}
    </>
  );
}

