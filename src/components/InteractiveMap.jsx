import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
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

export function InteractiveMap({ bbox }) {
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
    </MapContainer>
  );
}

