import React from 'react';

/**
 * RouteInfoDisplay Component
 * Displays route information and save button
 */
export function RouteInfoDisplay({ routeData, onSaveRoute }) {
  if (!routeData) {
    return null;
  }

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
        <div style={{ marginBottom: '8px' }}>
          ⏱️ Duration: {Math.round(routeData.duration / 1000 / 60)} min
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

