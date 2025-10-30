import React from 'react';
import { calculateRouteDuration } from '../utils/routeDuration';

/**
 * RouteInfoDisplay Component
 * Displays route information and save button
 */
export function RouteInfoDisplay({ routeData, onSaveRoute, poiCount, travelPace }) {
  if (!routeData) {
    return null;
  }

  // Calculate duration breakdown
  const duration = calculateRouteDuration(
    routeData.duration,
    poiCount || 0,
    travelPace
  );

  return (
    <div style={{
      marginBottom: '20px',
      padding: '12px',
      backgroundColor: '#e8f5e9',
      borderRadius: '8px',
      border: '1px solid #c8e6c9'
    }}>
      <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 'bold' }}>
        Route Information
      </h4>
      <div style={{ fontSize: '12px', color: '#333' }}>
        <div style={{ marginBottom: '4px' }}>
          📏 Distance: {(routeData.distance / 1000).toFixed(2)} km
        </div>
        <div style={{ marginBottom: '4px', fontWeight: '600', fontSize: '13px' }}>
          ⏱️ Total Duration: {duration.formatted.total}
        </div>
        <div style={{ marginBottom: '2px', paddingLeft: '20px', fontSize: '11px', color: '#666' }}>
          🚶 Travel time: {duration.formatted.travel}
        </div>
        <div style={{ marginBottom: '8px', paddingLeft: '20px', fontSize: '11px', color: '#666' }}>
          🏛️ Visit time: {duration.formatted.visit} ({poiCount || 0} POI{(poiCount || 0) !== 1 ? 's' : ''})
        </div>
        <button
          onClick={onSaveRoute}
          style={{
            width: '100%',
            padding: '8px',
            fontSize: '13px',
            fontWeight: '500',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#45a049';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#4CAF50';
          }}
        >
          💾 Save Route
        </button>
      </div>
    </div>
  );
}

