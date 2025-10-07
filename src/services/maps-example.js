/**
 * Example usage of MapsAPI classes
 */

import { OpenStreetAPI, GoogleMapsAPI } from './MapsAPI';

// Example 1: Using OpenStreetMap (no API key required)
async function exampleOpenStreetMap() {
  const osmAPI = new OpenStreetAPI();
  
  console.log('Provider:', osmAPI.getProviderName());
  
  // Geocode an address
  const location = await osmAPI.geocodeAddress('Berlin, Germany');
  console.log('Berlin coordinates:', location);
  
  // Calculate a route
  const waypoints = [
    { lat: 52.520008, lng: 13.404954 }, // Berlin
    { lat: 48.856613, lng: 2.352222 }   // Paris
  ];
  
  const route = await osmAPI.calculateRoute(waypoints);
  console.log('Route distance:', route.distance / 1000, 'km');
  console.log('Route duration:', route.duration / 60, 'minutes');
  
  // Reverse geocode
  const address = await osmAPI.reverseGeocode(52.520008, 13.404954);
  console.log('Address:', address);
  
  // Search places
  const places = await osmAPI.searchPlaces('restaurant', { lat: 52.520008, lng: 13.404954 }, 1000);
  console.log('Found places:', places.length);
}


// Example 2: Using Google Maps (requires API key)
async function exampleGoogleMaps() {
  const googleAPI = new GoogleMapsAPI('YOUR_GOOGLE_API_KEY');
  
  console.log('Provider:', googleAPI.getProviderName());
  
  // Validate API key
  const isValid = await googleAPI.validateApiKey();
  console.log('API key valid:', isValid);
  
  // Geocode an address
  const location = await googleAPI.geocodeAddress('New York, NY');
  console.log('NYC coordinates:', location);
  
  // Calculate a route with waypoints
  const waypoints = [
    { lat: 40.7128, lng: -74.0060 },  // New York
    { lat: 41.8781, lng: -87.6298 },  // Chicago
    { lat: 34.0522, lng: -118.2437 }  // Los Angeles
  ];
  
  const route = await googleAPI.calculateRoute(waypoints);
  console.log('Route distance:', route.distance / 1000, 'km');
  
  // Get distance matrix
  const origins = [{ lat: 40.7128, lng: -74.0060 }];
  const destinations = [
    { lat: 41.8781, lng: -87.6298 },
    { lat: 34.0522, lng: -118.2437 }
  ];
  
  const matrix = await googleAPI.getDistanceMatrix(origins, destinations);
  console.log('Distance matrix:', matrix);
}


// Example 3: Using polymorphism - same interface for both APIs
async function examplePolymorphism(mapsAPI) {
  console.log(`Using ${mapsAPI.getProviderName()}`);
  
  const berlin = await mapsAPI.geocodeAddress('Berlin, Germany');
  const paris = await mapsAPI.geocodeAddress('Paris, France');
  
  const route = await mapsAPI.calculateRoute([berlin, paris]);
  
  console.log(`Route from Berlin to Paris:`);
  console.log(`  Distance: ${(route.distance / 1000).toFixed(2)} km`);
  console.log(`  Duration: ${(route.duration / 60).toFixed(2)} minutes`);
}


// Example 4: Switch between providers
async function exampleSwitchProviders() {
  const providers = [
    new OpenStreetAPI(),
    new GoogleMapsAPI('YOUR_GOOGLE_API_KEY')
  ];
  
  for (const provider of providers) {
    await examplePolymorphism(provider);
  }
}


// Export examples
export {
  exampleOpenStreetMap,
  exampleGoogleMaps,
  examplePolymorphism,
  exampleSwitchProviders
};

