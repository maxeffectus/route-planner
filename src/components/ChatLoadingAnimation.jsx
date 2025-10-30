import React, { useState, useEffect } from 'react';

/**
 * Chat Loading Animation Component
 */
export function ChatLoadingAnimation() {
  const [currentMessage, setCurrentMessage] = useState(0);
  
  const loadingMessages = [
    "🤖 Preparing my AI brain...",
    "🧠 Loading travel expertise...",
    "🗺️ Mapping your preferences...",
    "✈️ Packing my recommendations...",
    "🎯 Aiming for perfect suggestions...",
    "🌟 Polishing my crystal ball...",
    "🎪 Setting up the magic show...",
    "🎨 Painting your perfect trip...",
    "💭 Thinking of the perfect questions...",
    "🎭 Getting into character as your travel assistant..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage(prev => (prev + 1) % loadingMessages.length);
    }, 1500);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      color: '#666'
    }}>
      <div style={{
        width: '20px',
        height: '20px',
        border: '2px solid #f3f3f3',
        borderTop: '2px solid #28a745',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginRight: '10px'
      }} />
      <span>{loadingMessages[currentMessage]}</span>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

