import React, { useState, useRef, useEffect } from 'react';
import { OpenStreetAPI } from '../services/MapsAPI';
import { Autocomplete } from '../components/Autocomplete';

export function RoutePlanner() {
  const [selectedCity, setSelectedCity] = useState(null);
  const [mapSize, setMapSize] = useState(null);
  const mapContainerRef = useRef(null);
  const mapsAPI = new OpenStreetAPI();

  // Measure the map container size
  useEffect(() => {
    const updateMapSize = () => {
      if (mapContainerRef.current) {
        const { offsetWidth, offsetHeight } = mapContainerRef.current;
        setMapSize({ 
          width: Math.floor(offsetWidth), 
          height: Math.floor(offsetHeight) 
        });
      }
    };

    updateMapSize();
    window.addEventListener('resize', updateMapSize);
    return () => window.removeEventListener('resize', updateMapSize);
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      height: 'calc(100vh - 100px)', // Account for header
      gap: '0'
    }}>
      {/* Left Half - Forms/Controls */}
      <div style={{ 
        flex: '0 0 50%',
        padding: '20px',
        backgroundColor: '#f9f9f9',
        overflowY: 'auto',
        borderRight: '2px solid #e0e0e0'
      }}>
        <h2 style={{ marginTop: 0 }}>🗺️ Route Planner</h2>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: 'bold',
            color: '#333'
          }}>
            Select City:
          </label>
          <Autocomplete
            searchFunction={(query, limit) => mapsAPI.autocompleteCities(query, limit)}
            onSelect={(city) => {
              setSelectedCity(city);
              console.log('City selected:', city);
            }}
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
            placeholder="Start typing city name (min 2 characters)..."
            minChars={2}
            maxResults={5}
            debounceMs={300}
          />
          <small style={{ 
            color: '#666', 
            fontSize: '12px', 
            display: 'block', 
            marginTop: '5px' 
          }}>
            Type at least 2 characters to see suggestions
          </small>
        </div>

        {selectedCity && (
          <div style={{ 
            padding: '15px', 
            backgroundColor: '#e8f0fe', 
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #4285f4'
          }}>
            <div style={{ fontWeight: 'bold', color: '#1a73e8', marginBottom: '5px' }}>
              Selected City
            </div>
            <div style={{ fontSize: '16px', fontWeight: '500', marginBottom: '5px' }}>
              {selectedCity.name}
            </div>
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
              {selectedCity.displayName}
            </div>
            <div style={{ fontSize: '12px', color: '#555' }}>
              📍 Coordinates: {selectedCity.location.lat.toFixed(4)}, {selectedCity.location.lng.toFixed(4)}
            </div>
          </div>
        )}

        {/* Placeholder for more controls */}
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#fff', 
          borderRadius: '8px',
          border: '1px dashed #ccc',
          textAlign: 'center',
          color: '#999'
        }}>
          <p>More controls will be added here...</p>
          <p style={{ fontSize: '12px' }}>Route waypoints, options, etc.</p>
        </div>
      </div>

      {/* Right Half - Map */}
      <div 
        ref={mapContainerRef}
        style={{ 
          flex: '0 0 50%',
          backgroundColor: '#e0e0e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {mapSize ? (
          <img
            src={selectedCity 
              ? mapsAPI.getStaticMapUrl({
                  bbox: selectedCity.boundingbox,
                  size: mapSize,
                  markers: [{ lat: selectedCity.location.lat, lng: selectedCity.location.lng, color: 'f00' }]
                })
              : mapsAPI.getStaticMapUrl({
                  center: { lat: 0, lng: 0 },
                  zoom: 0,
                  size: mapSize
                })
            }
            alt={selectedCity ? `Map of ${selectedCity.name}` : 'World Map'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
            onError={(e) => {
              console.error('Map image failed to load:', e.target.src);
              if (selectedCity) {
                console.log('City data:', selectedCity);
              }
            }}
          />
        ) : (
          <div style={{ textAlign: 'center', color: '#999' }}>
            <div style={{ fontSize: '24px' }}>Loading map...</div>
          </div>
        )}
      </div>
    </div>
  );
}

