import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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
      // Fit map to bounding box
      const bounds = [
        [bbox.minLat, bbox.minLng],
        [bbox.maxLat, bbox.maxLng]
      ];
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bbox, map]);

  return null;
}

export function InteractiveMap({ bbox, pois = [] }) {
  const defaultCenter = [0, 0];
  const defaultZoom = 2;

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
      
      {bbox && (
        <MapUpdater bbox={bbox} />
      )}

      {/* POI Markers */}
      {pois.map((poi, index) => {
        if (!poi.location?.lat || !poi.location?.lng) return null;
        
        return (
          <Marker 
            key={poi.id || index} 
            position={[poi.location.lat, poi.location.lng]}
          >
            <Popup>
              <div style={{ minWidth: '200px' }}>
                <h3 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: '16px',
                  color: '#1a73e8'
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

