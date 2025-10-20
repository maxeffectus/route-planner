import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Autocomplete } from './Autocomplete';

// Fix default marker icon issue in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Component to handle map updates when bbox changes
function MapUpdater({ bbox }) {
  const map = useMap();

  useEffect(() => {
    if (bbox) {
      const bounds = [
        [bbox.minLat, bbox.minLng],
        [bbox.maxLat, bbox.maxLng]
      ];
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bbox, map]);

  return null;
}

// Component to track map movement and zoom
function MapEventHandler({ onBoundsChange, onZoomChange }) {
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
    }
  });

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
  getPoiCategory
}) {
  const defaultCenter = [20, 0];
  const defaultZoom = 2;

  const canSearchPOIs = currentZoom >= 11;

  // Category definitions with display names
  const categories = [
    { value: 'museum', label: 'Museum' },
    { value: 'attraction', label: 'Attraction' },
    { value: 'historic', label: 'Historic' },
    { value: 'place_of_worship', label: 'Place Of Worship' },
    { value: 'park', label: 'Park' },
    { value: 'viewpoint', label: 'Viewpoint' }
  ];

  // Create custom colored marker icon
  const createColoredIcon = (color) => {
    return L.divIcon({
      className: 'custom-poi-marker',
      html: `<div style="
        background-color: ${color};
        width: 25px;
        height: 25px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [25, 25],
      iconAnchor: [12, 24]
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
      
      {bbox && <MapUpdater bbox={bbox} />}
      
      <MapEventHandler 
        onBoundsChange={onBoundsChange} 
        onZoomChange={onZoomChange}
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
              📍 Search location
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
            placeholder="Type city name..."
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
        const customIcon = createColoredIcon(color);
        
        return (
          <Marker 
            key={poi.id || index} 
            position={[poi.location.lat, poi.location.lng]}
            icon={customIcon}
          >
            <Popup>
              <div style={{ minWidth: '200px' }}>
                <h3 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: '16px',
                  color: color,
                  borderLeft: `4px solid ${color}`,
                  paddingLeft: '8px'
                }}>
                  {poi.name}
                </h3>
                
                <div style={{ 
                  fontSize: '13px', 
                  color: '#666',
                  marginBottom: '6px' 
                }}>
                  <strong>Type:</strong> {poi.type || poi.category}
                </div>

                {poi.description && (
                  <div style={{ 
                    fontSize: '13px', 
                    marginBottom: '6px' 
                  }}>
                    {poi.description}
                  </div>
                )}

                {poi.wikipedia && (
                  <div style={{ marginTop: '8px' }}>
                    <a 
                      href={`https://en.wikipedia.org/wiki/${poi.wikipedia.split(':')[1] || poi.wikipedia}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#4285f4',
                        textDecoration: 'none',
                        fontSize: '13px'
                      }}
                    >
                      📖 View on Wikipedia →
                    </a>
                  </div>
                )}

                {poi.website && (
                  <div style={{ marginTop: '6px' }}>
                    <a 
                      href={poi.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: '#4285f4',
                        textDecoration: 'none',
                        fontSize: '13px'
                      }}
                    >
                      🌐 Official Website →
                    </a>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

