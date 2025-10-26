import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { POIImageThumbnail, POITitle, POIType, POILinks, POIDescription, getPOIAccessibility } from './POIComponents';
import { getAllCategories } from '../utils/categoryMapping';

// Fix default marker icon issue in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Shared popup content component using reusable POI components
function PopupContent({ poi, colors, onClose, mapsAPI, onImageLoaded }) {
  return (
    <div 
      style={{ minWidth: '240px', position: 'relative' }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Custom close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onClose && onClose();
        }}
        style={{
          position: 'absolute',
          top: '-4px',
          right: '-4px',
          background: '#fff',
          border: '2px solid #ddd',
          borderRadius: '50%',
          width: '24px',
          height: '24px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#666',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          lineHeight: 1,
          transition: 'all 0.2s',
          zIndex: 1000
        }}
        onMouseOver={(e) => {
          e.target.style.backgroundColor = '#f44336';
          e.target.style.color = 'white';
          e.target.style.borderColor = '#f44336';
        }}
        onMouseOut={(e) => {
          e.target.style.backgroundColor = '#fff';
          e.target.style.color = '#666';
          e.target.style.borderColor = '#ddd';
        }}
        title="Close and deselect"
      >
        ×
      </button>

      {/* POI Image - Full width in popup */}
      <div style={{ marginBottom: '12px' }}>
        <POIImageThumbnail 
          poi={poi}
          mapsAPI={mapsAPI}
          onImageLoaded={onImageLoaded}
          size="100%"
          height={120}
          showPreview={false}
        />
      </div>

      <POITitle poi={poi} color={colors && colors.length > 0 ? colors[0] : '#999'} variant="popup" />
      <POIType poi={poi} />
      <POIDescription poi={poi} />
      <POILinks poi={poi} fontSize="12px" gap="12px" />
      {getPOIAccessibility({ poi })}
    </div>
  );
}

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Create start marker icon
const createStartMarkerIcon = () => {
  return L.divIcon({
    className: 'custom-route-marker',
    html: `<div style="
      background-color: #4CAF50;
      width: 30px;
      height: 30px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 3px 8px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <span style="transform: rotate(45deg); font-size: 16px;">📍</span>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30]
  });
};

// Create finish marker icon
const createFinishMarkerIcon = () => {
  return L.divIcon({
    className: 'custom-route-marker',
    html: `<div style="
      background-color: #f44336;
      width: 30px;
      height: 30px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 3px 8px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <span style="transform: rotate(45deg); font-size: 16px;">🏁</span>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30]
  });
};

// Create start/finish combined marker icon
const createStartFinishMarkerIcon = () => {
  return L.divIcon({
    className: 'custom-route-marker',
    html: `<div style="
      background: conic-gradient(from 0deg, #4CAF50 0deg 180deg, #f44336 180deg 360deg);
      width: 30px;
      height: 30px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 3px 8px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <span style="transform: rotate(45deg); font-size: 14px;">↻</span>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30]
  });
};

// Component to handle map updates when bbox changes
function MapUpdater({ bbox, onZoomChange, onBoundsChange }) {
  const map = useMap();

  useEffect(() => {
    if (bbox) {
      const bounds = [
        [bbox.minLat, bbox.minLng],
        [bbox.maxLat, bbox.maxLng]
      ];
      map.fitBounds(bounds, { padding: [50, 50] });
      
      // Manually update zoom and bounds after fitBounds
      setTimeout(() => {
        const newZoom = map.getZoom();
        const newBounds = map.getBounds();
        
        if (onZoomChange) {
          onZoomChange(newZoom);
        }
        
        if (onBoundsChange) {
          onBoundsChange({
            minLat: newBounds.getSouth(),
            maxLat: newBounds.getNorth(),
            minLng: newBounds.getWest(),
            maxLng: newBounds.getEast()
          });
        }
      }, 150); // Slightly longer delay to ensure map has finished animating
    }
  }, [bbox, map, onZoomChange, onBoundsChange]);

  return null;
}

// Component to track map movement and zoom
function MapEventHandler({ onBoundsChange, onZoomChange, onMapClick }) {
  const map = useMap();

  // Initial bounds and zoom
  useEffect(() => {
    const updateBounds = () => {
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      
      onBoundsChange({
        minLat: bounds.getSouth(),
        maxLat: bounds.getNorth(),
        minLng: bounds.getWest(),
        maxLng: bounds.getEast()
      });
      onZoomChange(zoom);
    };

    // Update immediately
    updateBounds();
  }, [map, onBoundsChange, onZoomChange]);

  // Track map events
  useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      onBoundsChange({
        minLat: bounds.getSouth(),
        maxLat: bounds.getNorth(),
        minLng: bounds.getWest(),
        maxLng: bounds.getEast()
      });
    },
    zoomend: () => {
      const zoom = map.getZoom();
      onZoomChange(zoom);
    },
    click: (e) => {
      // When clicking on the map (not on a marker), trigger the callback
      if (onMapClick) {
        onMapClick(e);
      }
    }
  });

  return null;
}

// Component to handle selected POI (open popup and pan to location)
function SelectedPOIHandler({ selectedPoiId, pois }) {
  const map = useMap();
  const timeoutRef = React.useRef(null);
  const currentSelectedIdRef = React.useRef(selectedPoiId);
  const lastCenteredIdRef = React.useRef(null); // Track which POI we last centered on

  // Update ref whenever selectedPoiId changes
  React.useEffect(() => {
    currentSelectedIdRef.current = selectedPoiId;
  }, [selectedPoiId]);

  useEffect(() => {
    // Clear any pending timeout from previous selection
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (selectedPoiId && pois) {
      const selectedPoi = pois.find(poi => poi.id === selectedPoiId);
      if (selectedPoi && selectedPoi.location) {
        // Find the marker for the selected POI
        let selectedMarker = null;
        map.eachLayer((layer) => {
          if (layer instanceof L.Marker) {
            const layerLatLng = layer.getLatLng();
            if (layerLatLng.lat === selectedPoi.location.lat && 
                layerLatLng.lng === selectedPoi.location.lng) {
              selectedMarker = layer;
            }
          }
        });

        // Close all OTHER popups (not the selected one)
        map.eachLayer((layer) => {
          if (layer instanceof L.Marker && layer !== selectedMarker) {
            layer.closePopup();
          }
        });
        
        // Only center the map if we haven't centered on this POI yet
        const shouldCenter = lastCenteredIdRef.current !== selectedPoiId;
        
        if (shouldCenter) {
          // Mark this POI as centered
          lastCenteredIdRef.current = selectedPoiId;
          
          // Check if POI is already in view
          const bounds = map.getBounds();
          const isInView = bounds.contains([selectedPoi.location.lat, selectedPoi.location.lng]);
          const needsZoom = map.getZoom() < 15;
          
          if (isInView && !needsZoom) {
            // POI is already visible and zoomed in - open popup immediately
            if (selectedMarker) {
              selectedMarker.openPopup();
            }
          } else {
            // POI needs panning/zooming - animate then open popup
            map.flyTo([selectedPoi.location.lat, selectedPoi.location.lng], Math.max(map.getZoom(), 15), {
              duration: 0.8
            });

            // Open popup after animation
            if (selectedMarker) {
              const poiIdToOpen = selectedPoi.id;
              timeoutRef.current = setTimeout(() => {
                // Double-check that this POI is still selected before opening (use ref for current value)
                if (currentSelectedIdRef.current === poiIdToOpen) {
                  selectedMarker.openPopup();
                }
                timeoutRef.current = null;
              }, 900); // Wait for flyTo animation
            }
          }
        } else {
          // POI was already centered, just ensure popup is open
          if (selectedMarker && !selectedMarker.isPopupOpen()) {
            selectedMarker.openPopup();
          }
        }
      }
    } else {
      // Close all popups when deselecting (selectedPoiId is null or undefined)
      map.closePopup();
      
      // Reset the centered tracking
      lastCenteredIdRef.current = null;
      
      // Also ensure all marker popups are closed
      map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
          layer.closePopup();
        }
      });
    }

    // Cleanup function to cancel timeout if component unmounts or selectedPoiId changes
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [selectedPoiId, pois, map]);

  return null;
}

export function InteractiveMap({ 
  bbox, 
  pois = [], 
  mapsAPI,
  onBoundsChange,
  onZoomChange,
  onFindPOIs,
  isLoadingPOIs,
  currentZoom,
  minZoomLevel = 11,
  poiError,
  hasPOIsInArea = false,
  selectedCategories = [],
  onCategoriesChange,
  categoryColors = {},
  selectedPoiId = null,
  onPoiSelect,
  onImageLoaded,
  routeStartPOI = null,
  routeFinishPOI = null,
  sameStartFinish = false,
  routeData = null
}) {
  const defaultCenter = [20, 0];
  const defaultZoom = 2;

  const canSearchPOIs = currentZoom >= minZoomLevel;
  
  // Track if we're in the middle of an interaction to prevent event conflicts
  const isInteractingRef = React.useRef(false);

  // Category definitions from central config
  const categories = getAllCategories();

  // Create custom colored marker icon
  // Supports multiple colors - displays each category as a segment
  const createColoredIcon = (colors, isSelected = false) => {
    const size = isSelected ? 35 : 25;
    const iconSize = isSelected ? 35 : 25;
    const iconAnchor = isSelected ? [17, 34] : [12, 24];
    
    // If single color, use simple style
    if (colors.length === 1) {
      return L.divIcon({
        className: 'custom-poi-marker',
        html: `<div style="
          background-color: ${colors[0]};
          width: ${size}px;
          height: ${size}px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid white;
          box-shadow: 0 ${isSelected ? '4px 12px' : '2px 5px'} rgba(0,0,0,${isSelected ? '0.4' : '0.3'});
          transition: all 0.2s;
        "></div>`,
        iconSize: [iconSize, iconSize],
        iconAnchor: iconAnchor
      });
    }
    
    // Multiple colors: create segments using conic gradient with hard stops
    const anglePerSegment = 360 / colors.length;
    let gradientStops = [];
    
    colors.forEach((color, idx) => {
      const startAngle = idx * anglePerSegment;
      const endAngle = (idx + 1) * anglePerSegment;
      // Use hard stops to create clear boundaries between segments
      gradientStops.push(`${color} ${startAngle}deg ${endAngle}deg`);
    });
    
    const gradient = `conic-gradient(from 0deg, ${gradientStops.join(', ')})`;
    
    return L.divIcon({
      className: 'custom-poi-marker',
      html: `<div style="
        background: ${gradient};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 ${isSelected ? '4px 12px' : '2px 5px'} rgba(0,0,0,${isSelected ? '0.4' : '0.3'});
        transition: all 0.2s;
      "></div>`,
      iconSize: [iconSize, iconSize],
      iconAnchor: iconAnchor
    });
  };

  const handleCategoryToggle = (categoryValue) => {
    if (selectedCategories.includes(categoryValue)) {
      // Remove category
      onCategoriesChange(selectedCategories.filter(c => c !== categoryValue));
    } else {
      // Add category
      onCategoriesChange([...selectedCategories, categoryValue]);
    }
  };

  // Decode route geometry to coordinates
  const getRouteCoordinates = (routeData) => {
    if (!routeData || !routeData.geometry) return [];
    
    // GraphHopper returns GeoJSON with coordinates array
    if (routeData.geometry.coordinates) {
      // GeoJSON format: [lng, lat] -> convert to [lat, lng] for Leaflet
      return routeData.geometry.coordinates.map(coord => [coord[1], coord[0]]);
    }
    
    return [];
  };
  
  const routeCoordinates = getRouteCoordinates(routeData);

  return (
    <MapContainer
      center={defaultCenter}
      zoom={defaultZoom}
      style={{ 
        width: '100%', 
        height: '100%' 
      }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
      />
      
      {/* Route polyline - render before markers so it's underneath */}
      {routeCoordinates.length > 0 && (
        <Polyline
          positions={routeCoordinates}
          color="#2196F3"
          weight={5}
          opacity={0.7}
        />
      )}
      
      {bbox && <MapUpdater bbox={bbox} onZoomChange={onZoomChange} onBoundsChange={onBoundsChange} />}
      
      <MapEventHandler 
        onBoundsChange={onBoundsChange} 
        onZoomChange={onZoomChange}
        onMapClick={() => {
          // Deselect any selected POI when clicking on the map background
          if (selectedPoiId) {
            onPoiSelect && onPoiSelect(null);
          }
        }}
      />

      <SelectedPOIHandler 
        selectedPoiId={selectedPoiId}
        pois={pois}
      />

      {/* Overlay Controls */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        width: '95%',
        maxWidth: '800px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {/* POI Category Filter - Compact Single Row */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '6px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '6px',
            flex: 1
          }}>
            {categories.map(category => {
              const color = categoryColors[category.value] || '#999';
              
              return (
                <label 
                  key={category.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '11px',
                    cursor: 'pointer',
                    padding: '3px 6px',
                    borderRadius: '4px',
                    transition: 'background-color 0.2s',
                    backgroundColor: '#f8f8f8',
                    border: '1px solid #e0e0e0',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e8e8e8'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f8f8f8'}
                >
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '2px',
                    backgroundColor: color,
                    marginRight: '4px',
                    border: '1px solid rgba(0,0,0,0.2)',
                    flexShrink: 0
                  }} />
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.value)}
                    onChange={() => handleCategoryToggle(category.value)}
                    style={{
                      marginRight: '4px',
                      cursor: 'pointer',
                      width: '14px',
                      height: '14px'
                    }}
                  />
                  <span>{category.label}</span>
                </label>
              );
            })}
          </div>
          
          {/* Zoom Level Indicator */}
          <div style={{
            fontSize: '11px',
            color: '#666',
            backgroundColor: '#f0f0f0',
            padding: '4px 8px',
            borderRadius: '4px',
            border: '1px solid #ddd',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}>
            Zoom: <strong>{currentZoom}</strong> {currentZoom < minZoomLevel && `(≥${minZoomLevel})`}
          </div>
        </div>

        {/* Find POIs Button */}
        <button
          onClick={onFindPOIs}
          disabled={!canSearchPOIs || isLoadingPOIs}
          title={!canSearchPOIs ? `Please zoom in to at least level ${minZoomLevel}` : 'Search for points of interest in visible area'}
          style={{
            padding: '10px 16px',
            backgroundColor: (!canSearchPOIs || isLoadingPOIs) ? '#ccc' : '#34a853',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: (!canSearchPOIs || isLoadingPOIs) ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            transition: 'all 0.2s',
            position: 'relative'
          }}
          onMouseOver={(e) => {
            if (canSearchPOIs && !isLoadingPOIs) {
              e.target.style.backgroundColor = '#2d8e47';
              e.target.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseOut={(e) => {
            if (canSearchPOIs && !isLoadingPOIs) {
              e.target.style.backgroundColor = '#34a853';
              e.target.style.transform = 'translateY(0)';
            }
          }}
        >
          {isLoadingPOIs ? '🔄 Loading...' : 
           !canSearchPOIs ? `🔍 Zoom in to search (min level ${minZoomLevel})` :
           hasPOIsInArea ? '🔍 Find more points of interest in visible area' :
           '🔍 Find points of interest in visible area'}
        </button>

        {/* Error Display */}
        {poiError && (
          <div style={{
            backgroundColor: '#fce8e6',
            border: '2px solid #c5221f',
            borderRadius: '8px',
            padding: '10px',
            color: '#c5221f',
            fontSize: '13px',
            fontWeight: '500',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
          }}>
            ⚠️ {poiError}
          </div>
        )}
      </div>

      {/* POI Markers */}
      {pois.map((poi, index) => {
        if (!poi.location?.lat || !poi.location?.lng) return null;
        
        // Get categories and colors
        const categories = poi.interest_categories || [];
        
        // Get colors for all categories
        const colors = categories.map(cat => categoryColors[cat] || '#999');
        const isSelected = selectedPoiId === poi.id;
        const customIcon = createColoredIcon(colors, isSelected);
        
        return (
          <Marker 
            key={poi.id || index} 
            position={[poi.location.lat, poi.location.lng]}
            icon={customIcon}
            eventHandlers={{
              click: () => {
                // Prevent action if we're in the middle of another interaction
                if (isInteractingRef.current) {
                  return;
                }
                
                // Toggle selection: if already selected, deselect; otherwise select
                onPoiSelect && onPoiSelect(isSelected ? null : poi.id);
              }
            }}
          >
            <Popup 
              autoClose={false}
              closeButton={false}
            >
              <PopupContent 
                poi={poi} 
                colors={colors}
                mapsAPI={mapsAPI}
                onImageLoaded={onImageLoaded}
                onClose={() => {
                  isInteractingRef.current = true;
                  onPoiSelect && onPoiSelect(null);
                  setTimeout(() => {
                    isInteractingRef.current = false;
                  }, 100);
                }}
              />
            </Popup>
          </Marker>
        );
      })}
      
      {/* Route start marker */}
      {routeStartPOI && !sameStartFinish && (
        <Marker
          position={[routeStartPOI.location.lat, routeStartPOI.location.lng]}
          icon={createStartMarkerIcon()}
        >
          <Popup>
            <div style={{ minWidth: '200px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                📍 Start Point
              </div>
              <div>{routeStartPOI.name}</div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                {routeStartPOI.description || routeStartPOI.name}
              </div>
            </div>
          </Popup>
        </Marker>
      )}
      
      {/* Route finish marker */}
      {routeFinishPOI && !sameStartFinish && (
        <Marker
          position={[routeFinishPOI.location.lat, routeFinishPOI.location.lng]}
          icon={createFinishMarkerIcon()}
        >
          <Popup>
            <div style={{ minWidth: '200px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                🏁 Finish Point
              </div>
              <div>{routeFinishPOI.name}</div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                {routeFinishPOI.description || routeFinishPOI.name}
              </div>
            </div>
          </Popup>
        </Marker>
      )}
      
      {/* Combined start/finish marker */}
      {sameStartFinish && routeStartPOI && (
        <Marker
          position={[routeStartPOI.location.lat, routeStartPOI.location.lng]}
          icon={createStartFinishMarkerIcon()}
        >
          <Popup>
            <div style={{ minWidth: '200px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                ↻ Start & Finish Point
              </div>
              <div>{routeStartPOI.name}</div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                {routeStartPOI.description || routeStartPOI.name}
              </div>
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}

