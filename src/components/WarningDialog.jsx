import React from 'react';

/**
 * Warning Dialog Component
 * Shows a warning message with confirmation buttons
 */
export function WarningDialog({ isOpen, onConfirm, onCancel, title, message, confirmText = "Continue", cancelText = "Go Back" }) {
  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1001,
        padding: '20px'
      }}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          maxWidth: '400px',
          width: '100%',
          padding: '20px'
        }}
      >
        <h3 style={{
          margin: '0 0 15px 0',
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#333'
        }}>
          {title}
        </h3>
        
        <p style={{
          margin: '0 0 20px 0',
          fontSize: '14px',
          color: '#666',
          lineHeight: '1.5'
        }}>
          {message}
        </p>
        
        <div style={{
          display: 'flex',
          gap: '10px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
