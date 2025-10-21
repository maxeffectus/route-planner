import React, { useState } from 'react';
import { OpenStreetAPI, GoogleMapsAPI } from '../services/MapsAPI';
import { Autocomplete } from './Autocomplete';

export function MapsAPITester() {
  const [provider, setProvider] = useState('openstreet');
  const [method, setMethod] = useState('geocodeAddress');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [result, setResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form inputs
  const [address, setAddress] = useState('Berlin, Germany');
  const [lat, setLat] = useState('52.520008');
  const [lng, setLng] = useState('13.404954');
  const [waypoints, setWaypoints] = useState('[{"lat": 52.520008, "lng": 13.404954}, {"lat": 48.856613, "lng": 2.352222}]');
  const [origins, setOrigins] = useState('[{"lat": 52.520008, "lng": 13.404954}]');
  const [destinations, setDestinations] = useState('[{"lat": 48.856613, "lng": 2.352222}]');
  const [searchQuery, setSearchQuery] = useState('restaurant');
  const [searchLocation, setSearchLocation] = useState('{"lat": 52.520008, "lng": 13.404954}');
  const [searchRadius, setSearchRadius] = useState('1000');
  const [selectedCity, setSelectedCity] = useState(null);
  const [poiLimit, setPoiLimit] = useState('20');
  const [poiCategories, setPoiCategories] = useState('["museum", "attraction", "historic", "place_of_worship", "park", "viewpoint"]');

  const methods = [
    { value: 'geocodeAddress', label: 'Geocode Address' },
    { value: 'reverseGeocode', label: 'Reverse Geocode' },
    { value: 'calculateRoute', label: 'Calculate Route' },
    { value: 'getDistanceMatrix', label: 'Get Distance Matrix' },
    { value: 'searchPlaces', label: 'Search Places' },
    { value: 'autocompleteCities', label: 'Autocomplete Cities' },
    { value: 'getPOI', label: 'Get Points of Interest (POI)' },
    { value: 'validateApiKey', label: 'Validate API Key' },
    { value: 'getProviderName', label: 'Get Provider Name' }
  ];

  const getMapsAPI = () => {
    if (provider === 'google') {
      if (!googleApiKey) {
        throw new Error('Google Maps API key is required');
      }
      return new GoogleMapsAPI(googleApiKey);
    }
    return new OpenStreetAPI();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setResult('Processing...');

    try {
      const api = getMapsAPI();
      let response;

      switch (method) {
        case 'geocodeAddress':
          response = await api.geocodeAddress(address);
          break;

        case 'reverseGeocode':
          response = await api.reverseGeocode(parseFloat(lat), parseFloat(lng));
          break;

        case 'calculateRoute':
          const waypointsArray = JSON.parse(waypoints);
          response = await api.calculateRoute(waypointsArray);
          break;

        case 'getDistanceMatrix':
          const originsArray = JSON.parse(origins);f
          const destinationsArray = JSON.parse(destinations);
          response = await api.getDistanceMatrix(originsArray, destinationsArray);
          break;

        case 'searchPlaces':
          const location = JSON.parse(searchLocation);
          response = await api.searchPlaces(searchQuery, location, parseInt(searchRadius));
          break;

        case 'autocompleteCities':
          if (!selectedCity) {
            throw new Error('Please select a city from the autocomplete dropdown');
          }
          response = selectedCity;
          break;

        case 'getPOI':
          if (!selectedCity || !selectedCity.boundingbox) {
            throw new Error('Please select a city first using Autocomplete Cities method');
          }
          const categories = JSON.parse(poiCategories);
          response = await api.getPOI(selectedCity.boundingbox, parseInt(poiLimit), categories);
          break;

        case 'validateApiKey':
          response = await api.validateApiKey();
          break;

        case 'getProviderName':
          response = api.getProviderName();
          break;

        default:
          throw new Error('Unknown method');
      }

      setResult(JSON.stringify(response, null, 2));
    } catch (err) {
      setError(err.message);
      setResult('');
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormFields = () => {
    switch (method) {
      case 'geocodeAddress':
        return (
          <div style={{ marginBottom: '10px' }}>
            <label style={labelStyle}>Address:</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g., Berlin, Germany"
              style={inputStyle}
            />
          </div>
        );

      case 'reverseGeocode':
        return (
          <>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Latitude:</label>
              <input
                type="text"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="e.g., 52.520008"
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Longitude:</label>
              <input
                type="text"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="e.g., 13.404954"
                style={inputStyle}
              />
            </div>
          </>
        );

      case 'calculateRoute':
        return (
          <div style={{ marginBottom: '10px' }}>
            <label style={labelStyle}>Waypoints (JSON array):</label>
            <textarea
              value={waypoints}
              onChange={(e) => setWaypoints(e.target.value)}
              placeholder='[{"lat": 52.52, "lng": 13.40}, {"lat": 48.85, "lng": 2.35}]'
              style={{ ...inputStyle, minHeight: '80px', fontFamily: 'monospace' }}
            />
            <small style={{ color: '#666', fontSize: '12px' }}>
              Format: Array of objects with lat and lng properties
            </small>
          </div>
        );

      case 'getDistanceMatrix':
        return (
          <>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Origins (JSON array):</label>
              <textarea
                value={origins}
                onChange={(e) => setOrigins(e.target.value)}
                placeholder='[{"lat": 52.52, "lng": 13.40}]'
                style={{ ...inputStyle, minHeight: '60px', fontFamily: 'monospace' }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Destinations (JSON array):</label>
              <textarea
                value={destinations}
                onChange={(e) => setDestinations(e.target.value)}
                placeholder='[{"lat": 48.85, "lng": 2.35}]'
                style={{ ...inputStyle, minHeight: '60px', fontFamily: 'monospace' }}
              />
            </div>
          </>
        );

      case 'searchPlaces':
        return (
          <>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Search Query:</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., restaurant"
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Location (JSON):</label>
              <input
                type="text"
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                placeholder='{"lat": 52.52, "lng": 13.40}'
                style={{ ...inputStyle, fontFamily: 'monospace' }}
              />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>Radius (meters):</label>
              <input
                type="number"
                value={searchRadius}
                onChange={(e) => setSearchRadius(e.target.value)}
                placeholder="1000"
                style={inputStyle}
              />
            </div>
          </>
        );

      case 'autocompleteCities':
        return (
          <>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>City Name:</label>
              <Autocomplete
                searchFunction={(query, limit) => getMapsAPI().autocompleteCities(query, limit)}
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
              <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '5px' }}>
                Type at least 2 characters to see suggestions. Use arrow keys or mouse to select.
              </small>
            </div>
            
            {selectedCity && (
              <div style={{ 
                padding: '10px', 
                backgroundColor: '#e8f0fe', 
                borderRadius: '4px',
                marginBottom: '10px'
              }}>
                <strong>Selected City:</strong> {selectedCity.name}
                <br />
                <small>{selectedCity.displayName}</small>
              </div>
            )}
          </>
        );

      case 'getPOI':
        return (
          <>
            <div style={{ marginBottom: '10px' }}>
              <label style={labelStyle}>City Name:</label>
              <Autocomplete
                searchFunction={(query, limit) => getMapsAPI().autocompleteCities(query, limit)}
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
              <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '5px' }}>
                Select a city to search for POIs
              </small>
            </div>
            
            {selectedCity && (
              <>
                <div style={{ 
                  padding: '10px', 
                  backgroundColor: '#e8f0fe', 
                  borderRadius: '4px',
                  marginBottom: '15px'
                }}>
                  <strong>Selected City:</strong> {selectedCity.name}
                  <br />
                  <small style={{ fontSize: '11px', color: '#666' }}>
                    {selectedCity.displayName}
                  </small>
                </div>
                
                <div style={{ marginBottom: '10px' }}>
                  <label style={labelStyle}>Categories (JSON array):</label>
                  <input
                    type="text"
                    value={poiCategories}
                    onChange={(e) => setPoiCategories(e.target.value)}
                    placeholder='["museum", "attraction", "historic", "place_of_worship", "park", "viewpoint"]'
                    style={{ ...inputStyle, fontFamily: 'monospace' }}
                  />
                  <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '5px' }}>
                    Available: museum, attraction, historic, place_of_worship, park, viewpoint
                  </small>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={labelStyle}>Max Results:</label>
                  <input
                    type="number"
                    value={poiLimit}
                    onChange={(e) => setPoiLimit(e.target.value)}
                    placeholder="20"
                    min="1"
                    max="100"
                    style={inputStyle}
                  />
                </div>
              </>
            )}
          </>
        );

      case 'validateApiKey':
      case 'getProviderName':
        return (
          <div style={{ padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px', marginBottom: '10px' }}>
            <small style={{ color: '#666' }}>No parameters required for this method</small>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <h1>🗺️ Maps API Tester</h1>

      {/* Provider Selection */}
      <div style={sectionStyle}>
        <h2>1. Select Provider</h2>
        <div style={{ marginBottom: '10px' }}>
          <label style={labelStyle}>API Provider:</label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            style={selectStyle}
          >
            <option value="openstreet">OpenStreetMap (No API key required)</option>
            <option value="google">Google Maps (Requires API key)</option>
          </select>
        </div>

        {provider === 'google' && (
          <div style={{ marginBottom: '10px' }}>
            <label style={labelStyle}>Google Maps API Key:</label>
            <input
              type="text"
              value={googleApiKey}
              onChange={(e) => setGoogleApiKey(e.target.value)}
              placeholder="Enter your Google Maps API key"
              style={inputStyle}
            />
            <small style={{ color: '#666', fontSize: '12px' }}>
              Get your API key from <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">Google Cloud Console</a>
            </small>
          </div>
        )}
      </div>

      {/* Method Selection */}
      <div style={sectionStyle}>
        <h2>2. Select Method</h2>
        <div style={{ marginBottom: '10px' }}>
          <label style={labelStyle}>API Method:</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            style={selectStyle}
          >
            {methods.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Method Parameters */}
      <div style={sectionStyle}>
        <h2>3. Enter Parameters</h2>
        <form onSubmit={handleSubmit}>
          {renderFormFields()}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              backgroundColor: isLoading ? '#ccc' : '#4285f4',
              color: 'white',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              width: '100%'
            }}
          >
            {isLoading ? 'Processing...' : `Call ${method}()`}
          </button>
        </form>
      </div>

      {/* Results */}
      <div style={sectionStyle}>
        <h2>4. Result</h2>
        {error && (
          <div style={{
            padding: '15px',
            backgroundColor: '#fce8e6',
            border: '1px solid #d93025',
            borderRadius: '4px',
            color: '#d93025',
            marginBottom: '10px'
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}
        
        <pre style={{
          backgroundColor: '#f5f5f5',
          padding: '15px',
          borderRadius: '4px',
          overflow: 'auto',
          maxHeight: '400px',
          border: '1px solid #ddd',
          fontFamily: 'monospace',
          fontSize: '13px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}>
          {result || 'No result yet. Fill in the parameters and click the button above.'}
        </pre>
      </div>
    </div>
  );
}

// Styles
const sectionStyle = {
  backgroundColor: 'white',
  padding: '20px',
  marginBottom: '20px',
  borderRadius: '8px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
};

const labelStyle = {
  display: 'block',
  marginBottom: '5px',
  fontWeight: 'bold',
  color: '#333',
  fontSize: '14px'
};

const inputStyle = {
  width: '100%',
  padding: '10px',
  border: '1px solid #ddd',
  borderRadius: '4px',
  fontSize: '14px',
  boxSizing: 'border-box'
};

const selectStyle = {
  ...inputStyle,
  cursor: 'pointer'
};

