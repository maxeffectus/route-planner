import React from 'react';

export function StatusBar({ status, onCheckAvailability }) {
  return (
    <div style={{ 
      marginBottom: '20px', 
      padding: '10px', 
      backgroundColor: '#f0f0f0', 
      borderRadius: '4px' 
    }}>
      {status}
      <button
        onClick={onCheckAvailability}
        style={{
          marginLeft: '10px',
          padding: '5px 10px',
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        Check API
      </button>
    </div>
  );
}

