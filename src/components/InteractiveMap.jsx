import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Autocomplete } from './Autocomplete';
import { POIImageThumbnail, POITitle, POIType, POILinks, POIDescription } from './POIComponents';
import { getAllCategories } from '../utils/categoryMapping';

// Fix default marker icon issue in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Shared popup content component using reusable POI components
function PopupContent({ poi, color, onClose, mapsAPI, onImageLoaded, getPoiCategory }) {
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

      <POITitle poi={poi} color={color} variant="popup" />
      <POIType poi={poi} getPoiCategory={getPoiCategory} />
      <POIDescription poi={poi} />
      <POILinks poi={poi} fontSize="12px" gap="12px" />
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

// Component to handle map updates when bbox changes
function MapUpdater({ bbox, onZoomChange }) {
  const map = useMap();

  useEffect(() => {
    if (bbox) {
      const bounds = [
        [bbox.minLat, bbox.minLng],
        [bbox.maxLat, bbox.maxLng]
      ];
      map.fitBounds(bounds, { padding: [50, 50] });
      
      // Manually update zoom after fitBounds (it may not trigger zoomend immediately)
      setTimeout(() => {
        const newZoom = map.getZoom();
        if (onZoomChange) {
          onZoomChange(newZoom);
        }
      }, 100);
    }
  }, [bbox, map, onZoomChange]);

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
  onCitySelect,
  onFindPOIs,
  isLoadingPOIs,
  currentZoom,
  poiError,
  hasPOIsInArea = false,
  selectedCategories = [],
  onCategoriesChange,
  categoryColors = {},
  getPoiCategory,
  selectedPoiId = null,
  onPoiSelect,
  onImageLoaded
}) {
  const defaultCenter = [20, 0];
  const defaultZoom = 2;

  const canSearchPOIs = currentZoom >= 11;
  
  // Track if we're in the middle of an interaction to prevent event conflicts
  const isInteractingRef = React.useRef(false);

  // Category definitions from central config
  const categories = getAllCategories();

  // Create custom colored marker icon
  const createColoredIcon = (color, isSelected = false) => {
    const size = isSelected ? 35 : 25;
    const iconSize = isSelected ? 35 : 25;
    const iconAnchor = isSelected ? [17, 34] : [12, 24];
    
    return L.divIcon({
      className: 'custom-poi-marker',
      html: `<div style="
        background-color: ${color};
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
      
      {bbox && <MapUpdater bbox={bbox} onZoomChange={onZoomChange} />}
      
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
        {/* Location Search with Zoom Level */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          padding: '10px 12px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '6px'
          }}>
            <label style={{
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#555'
            }}>
              📍 Where would you like to go?
            </label>
            <div style={{
              fontSize: '11px',
              color: '#666',
              backgroundColor: '#f0f0f0',
              padding: '3px 8px',
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}>
              Zoom: <strong>{currentZoom}</strong> {currentZoom < 11 && '(need ≥11)'}
            </div>
          </div>
          <Autocomplete
            searchFunction={(query, limit) => mapsAPI.autocompleteCities(query, limit)}
            onSelect={onCitySelect}
            renderSuggestion={(city) => (
              <>
                <div style={{ fontWeight: '500', color: '#333' }}>
                  {city.name}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                  {city.displayName}
                </div>
              </>
            )}
            placeholder="Type city name or use the map to zoom in to your destination..."
            minChars={2}
            maxResults={5}
            debounceMs={300}
          />
        </div>

        {/* POI Category Filter - Compact Single Row */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          padding: '8px 12px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '6px'
          }}>
            <span style={{
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#555',
              marginRight: '4px',
              whiteSpace: 'nowrap'
            }}>
              🏛️ POI:
            </span>
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
        </div>

        {/* Find POIs Button */}
        <button
          onClick={onFindPOIs}
          disabled={!canSearchPOIs || isLoadingPOIs}
          title={!canSearchPOIs ? 'Please zoom in to at least level 11' : 'Search for points of interest in visible area'}
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
           !canSearchPOIs ? '🔍 Zoom in to search (min level 11)' :
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
        
        const poiCategory = getPoiCategory ? getPoiCategory(poi) : null;
        const color = categoryColors[poiCategory] || '#999';
        const isSelected = selectedPoiId === poi.id;
        const customIcon = createColoredIcon(color, isSelected);
        
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
                color={color}
                mapsAPI={mapsAPI}
                onImageLoaded={onImageLoaded}
                getPoiCategory={getPoiCategory}
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
    </MapContainer>
  );
}

