import React, { useState } from 'react';
import { OpenStreetAPI } from '../services/MapsAPI';
import { Autocomplete } from '../components/Autocomplete';
import { InteractiveMap } from '../components/InteractiveMap';

export function RoutePlanner() {
  const [selectedCity, setSelectedCity] = useState(null);
  const [pois, setPois] = useState([]);
  const [isLoadingPOIs, setIsLoadingPOIs] = useState(false);
  const [poiError, setPoiError] = useState(null);
  const mapsAPI = new OpenStreetAPI();

  const handleFindPOIs = async () => {
    if (!selectedCity?.boundingbox) {
      setPoiError('Please select a city first');
      return;
    }

    setIsLoadingPOIs(true);
    setPoiError(null);
    setPois([]);

    try {
      const results = await mapsAPI.getPOI(selectedCity.boundingbox, 50);
      setPois(results);
      console.log('POIs found:', results.length);
    } catch (error) {
      console.error('Error fetching POIs:', error);
      setPoiError(error.message || 'Failed to fetch points of interest');
    } finally {
      setIsLoadingPOIs(false);
    }
  };

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

        {/* POI Finder */}
        {selectedCity && (
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={handleFindPOIs}
              disabled={isLoadingPOIs}
              style={{
                width: '100%',
                padding: '12px 20px',
                backgroundColor: isLoadingPOIs ? '#ccc' : '#4285f4',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: isLoadingPOIs ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => !isLoadingPOIs && (e.target.style.backgroundColor = '#1a73e8')}
              onMouseOut={(e) => !isLoadingPOIs && (e.target.style.backgroundColor = '#4285f4')}
            >
              {isLoadingPOIs ? '🔄 Loading...' : '🔍 Find points of interest in the area'}
            </button>
          </div>
        )}

        {/* Error Display */}
        {poiError && (
          <div style={{
            padding: '12px',
            backgroundColor: '#fce8e6',
            border: '1px solid #c5221f',
            borderRadius: '8px',
            color: '#c5221f',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            ⚠️ {poiError}
          </div>
        )}

        {/* POI List */}
        {pois.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ 
              marginTop: 0, 
              marginBottom: '12px',
              fontSize: '18px',
              color: '#333'
            }}>
              Points of Interest ({pois.length})
            </h3>
            <div style={{
              maxHeight: '400px',
              overflowY: 'auto',
              backgroundColor: '#fff',
              borderRadius: '8px',
              border: '1px solid #ddd'
            }}>
              {pois.map((poi, index) => (
                <div
                  key={poi.id || index}
                  style={{
                    padding: '12px 16px',
                    borderBottom: index < pois.length - 1 ? '1px solid #eee' : 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ 
                    fontWeight: '600', 
                    color: '#1a73e8',
                    marginBottom: '4px',
                    fontSize: '15px'
                  }}>
                    {poi.name}
                  </div>
                  <div style={{ 
                    fontSize: '13px', 
                    color: '#666',
                    marginBottom: '2px'
                  }}>
                    📍 {poi.type || poi.category}
                  </div>
                  {poi.wikipedia && (
                    <div style={{ fontSize: '12px', color: '#999' }}>
                      📖 Wikipedia
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Half - Interactive Map */}
      <div style={{ 
        flex: '0 0 50%',
        position: 'relative'
      }}>
        <InteractiveMap bbox={selectedCity?.boundingbox} pois={pois} />
      </div>
    </div>
  );
}

