import React from 'react';

export function PageSwitcher({ currentPage, onPageChange }) {
  const pages = [
    { id: 'gemini', label: '🤖 Gemini Nano', icon: '💬' },
    { id: 'maps', label: '🗺️ Maps API Tester', icon: '📍' }
  ];

  return (
    <div style={{
      backgroundColor: '#fff',
      borderBottom: '2px solid #e0e0e0',
      padding: '10px 20px',
      marginBottom: '20px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        display: 'flex',
        gap: '10px',
        alignItems: 'center'
      }}>
        <span style={{ 
          fontSize: '14px', 
          color: '#666',
          marginRight: '10px',
          fontWeight: '500'
        }}>
          Pages:
        </span>
        
        {pages.map(page => (
          <button
            key={page.id}
            onClick={() => onPageChange(page.id)}
            style={{
              padding: '8px 16px',
              border: currentPage === page.id ? '2px solid #4285f4' : '1px solid #ddd',
              borderRadius: '20px',
              backgroundColor: currentPage === page.id ? '#e8f0fe' : 'white',
              color: currentPage === page.id ? '#4285f4' : '#666',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: currentPage === page.id ? 'bold' : 'normal',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseOver={(e) => {
              if (currentPage !== page.id) {
                e.target.style.backgroundColor = '#f5f5f5';
              }
            }}
            onMouseOut={(e) => {
              if (currentPage !== page.id) {
                e.target.style.backgroundColor = 'white';
              }
            }}
          >
            <span>{page.icon}</span>
            <span>{page.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

