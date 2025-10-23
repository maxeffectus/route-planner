import React, { useState } from 'react';
import { Modal } from './Modal';
import { WarningDialog } from './WarningDialog';
import { ProfileSetupChat } from './ProfileSetupChat';

/**
 * Profile Setup Modal Component
 * Wraps ProfileSetupChat in a modal with "Later" button and warning dialog
 */
export function ProfileSetupModal({ isOpen, onClose, promptAPIRef, promptReady }) {
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
          
          <ProfileSetupChat 
            promptAPIRef={promptAPIRef}
            promptReady={promptReady}
            onProfileComplete={() => {
              // Close modal when profile is completed
              setTimeout(() => onClose(), 1000); // Small delay to show completion
            }}
          />
          
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
