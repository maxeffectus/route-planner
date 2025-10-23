import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { WarningDialog } from './WarningDialog';
import { ProfileSetupChat } from './ProfileSetupChat';

/**
 * Loading Animation Component with jokes
 */
function LoadingAnimation() {
  const [currentJoke, setCurrentJoke] = useState(0);
  
  const jokes = [
    "🤖 Preparing my AI brain...",
    "🧠 Loading travel expertise...",
    "🗺️ Mapping your preferences...",
    "✈️ Packing my recommendations...",
    "🎯 Aiming for perfect suggestions...",
    "🌟 Polishing my crystal ball...",
    "🎪 Setting up the magic show...",
    "🎨 Painting your perfect trip..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentJoke(prev => (prev + 1) % jokes.length);
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      textAlign: 'center'
    }}>
      <div style={{
        width: '60px',
        height: '60px',
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #28a745',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '20px'
      }} />
      
      <h3 style={{
        margin: '0 0 10px 0',
        fontSize: '18px',
        color: '#333'
      }}>
        {jokes[currentJoke]}
      </h3>
      
      <p style={{
        margin: '0',
        fontSize: '14px',
        color: '#666'
      }}>
        This will only take a moment...
      </p>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/**
 * Profile Setup Modal Component
 * Wraps ProfileSetupChat in a modal with "Later" button and warning dialog
 */
export function ProfileSetupModal({ isOpen, onClose, promptAPIRef, promptReady, promptError, onProfileUpdate }) {
  const [showWarning, setShowWarning] = useState(false);

  const handleLaterClick = () => {
    setShowWarning(true);
  };

  const handleWarningConfirm = () => {
    setShowWarning(false);
    onClose();
  };

  const handleWarningCancel = () => {
    setShowWarning(false);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="🧑‍💼 Travel Profile Setup"
        style={{ maxWidth: '700px' }}
      >
        <div style={{ marginBottom: '20px' }}>
          <p style={{ 
            fontSize: '14px', 
            color: '#666', 
            marginBottom: '15px',
            lineHeight: '1.5'
          }}>
            Let our AI assistant help you create a personalized travel profile. 
            This will enable more relevant recommendations for places to visit, 
            activities, and experiences tailored to your preferences.
          </p>
          
          {promptError ? (
            <div style={{
              padding: '20px',
              backgroundColor: '#f8d7da',
              border: '1px solid #f5c6cb',
              borderRadius: '4px',
              color: '#721c24',
              textAlign: 'center'
            }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>
                ⚠️ AI Assistant Unavailable
              </h4>
              <p style={{ margin: '0 0 15px 0', fontSize: '14px' }}>
                {promptError}
              </p>
              <p style={{ margin: '0', fontSize: '12px', opacity: 0.8 }}>
                You can still use the app, but recommendations may be less personalized.
              </p>
            </div>
          ) : !promptReady ? (
            <LoadingAnimation />
          ) : (
            <ProfileSetupChat 
              promptAPIRef={promptAPIRef}
              promptReady={promptReady}
              onProfileComplete={() => {
                // Close modal when profile is completed
                setTimeout(() => onClose(), 1000); // Small delay to show completion
              }}
              onProfileUpdate={onProfileUpdate}
            />
          )}
          
          {(promptReady || promptError) && (
            <div style={{
              marginTop: '20px',
              paddingTop: '15px',
              borderTop: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <button
                onClick={handleLaterClick}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Set Up Later
              </button>
              
              <div style={{ fontSize: '12px', color: '#999' }}>
                Complete your profile for better recommendations
              </div>
            </div>
          )}
        </div>
      </Modal>

      <WarningDialog
        isOpen={showWarning}
        onConfirm={handleWarningConfirm}
        onCancel={handleWarningCancel}
        title="⚠️ Incomplete Profile"
        message="Your profile doesn't contain all the information needed for our AI assistant to work effectively. Recommendations may be less relevant to your specific needs and preferences. Are you sure you want to continue without completing your profile?"
        confirmText="Continue Anyway"
        cancelText="Complete Profile"
      />
    </>
  );
}
