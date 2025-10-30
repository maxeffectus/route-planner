import React, { useState, useCallback, useEffect } from 'react';
import { UserProfile } from '../models/UserProfile';
import { createProfileSummaryPrompt } from '../services/UserProfilePromptConfig';
import { IterativeProfileService } from '../services/IterativeProfileService';

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

/**
 * Iterative Profile Setup Chat Component
 * Uses the new two-step API approach: generate question -> parse answer
 */
export function ProfileSetupChat({ promptAPIRef, promptReady, onProfileComplete, onProfileUpdate, autoStart = false }) {
  // State management
  const [userProfile, setUserProfile] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [isProfileSetupActive, setIsProfileSetupActive] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [profileSummary, setProfileSummary] = useState(null);
  const [currentField, setCurrentField] = useState(null);
  const [error, setError] = useState(null);
  
  // Iterative profile service
  const [profileService] = useState(() => new IterativeProfileService(promptAPIRef.current));

  // Load profile from localStorage on component mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) {
      try {
        const profileData = JSON.parse(savedProfile);
        const profile = UserProfile.fromJSON(profileData);
        setUserProfile(profile);
        setIsProfileComplete(profile.isComplete());
        
        // Notify parent component about loaded profile
        if (onProfileUpdate) {
          onProfileUpdate(profile);
        }
      } catch (error) {
        console.error('Failed to load profile from localStorage:', error);
        localStorage.removeItem('userProfile');
      }
    }
  }, [onProfileUpdate]);

  // Save profile to localStorage whenever it changes
  useEffect(() => {
    if (userProfile) {
      try {
        localStorage.setItem('userProfile', JSON.stringify(userProfile.toJSON()));
      } catch (error) {
        console.error('Failed to save profile to localStorage:', error);
      }
    }
  }, [userProfile]);

  // Generate profile summary when profile is complete
  const generateProfileSummary = useCallback(async (profile) => {
    try {
      if (!promptReady) return;
      
      const summaryPrompt = createProfileSummaryPrompt(profile.toJSON());
      const summary = await promptAPIRef.current.prompt(summaryPrompt);
      setProfileSummary(summary);
      
      console.log('Generated profile summary:', summary);
    } catch (error) {
      console.error('Failed to generate profile summary:', error);
      setProfileSummary('Profile completed successfully!');
    }
  }, [promptReady, promptAPIRef]);

  // Initialize iterative profile filling
  const initializeProfileFilling = useCallback(async () => {
    try {
      if (!promptReady) {
        throw new Error('Prompt API not ready');
      }

      // Use existing profile or create new one
      let profile = userProfile;
      if (!profile) {
        profile = new UserProfile('user-123');
        setUserProfile(profile);
      }
      
      // Initialize the service
      profileService.initialize(profile);
      
      setChatHistory([]);
      setIsProfileComplete(false);
      setIsProfileSetupActive(true);
      setError(null);

      // Start the iterative filling process
      const result = await profileService.startFilling();
      
      if (result.isComplete) {
        setIsProfileComplete(true);
        setIsProfileSetupActive(false);
        generateProfileSummary(profile);
        if (onProfileComplete) {
          onProfileComplete();
        }
        return;
      }

      // Add the first question to chat history
      setChatHistory(prev => [...prev, { 
        role: 'ai', 
        message: result.question,
        fieldName: result.fieldName 
      }]);
      setCurrentField(result.fieldName);
      
    } catch (error) {
      console.error('Profile filling initialization error:', error);
      setError(`Failed to initialize profile filling: ${error.message}`);
    }
  }, [promptReady, userProfile, profileService, onProfileComplete, generateProfileSummary]);

  // Process user's answer
  const processUserAnswer = useCallback(async (userMessage) => {
    if (!profileService.isCurrentlyProcessing()) {
      setError('No field is currently being processed');
      return;
    }

    try {
      setIsAiThinking(true);
      setError(null);

      // Process the answer
      const result = await profileService.processAnswer(userMessage);
      
      if (!result.success) {
        setError(result.error);
        return;
      }

      // Update the profile
      const updatedProfile = profileService.getCurrentProfile();
      setUserProfile(updatedProfile);
      
      // Notify parent component
      if (onProfileUpdate) {
        onProfileUpdate(updatedProfile);
      }

      // Check if profile is complete
      if (result.isComplete) {
        setIsProfileComplete(true);
        setIsProfileSetupActive(false);
        generateProfileSummary(updatedProfile);
        if (onProfileComplete) {
          onProfileComplete();
        }
        return;
      }

      // Generate next question if there are more fields
      if (result.nextField) {
        const nextResult = await profileService.startFilling();
        
        if (nextResult.isComplete) {
          setIsProfileComplete(true);
          setIsProfileSetupActive(false);
          generateProfileSummary(updatedProfile);
          if (onProfileComplete) {
            onProfileComplete();
          }
          return;
        }

        // Add next question to chat history
        setChatHistory(prev => [...prev, { 
          role: 'ai', 
          message: nextResult.question,
          fieldName: nextResult.fieldName 
        }]);
        setCurrentField(nextResult.fieldName);
      }

    } catch (error) {
      console.error('Error processing user answer:', error);
      setError(`Failed to process answer: ${error.message}`);
    } finally {
      setIsAiThinking(false);
    }
  }, [profileService, onProfileUpdate, onProfileComplete, generateProfileSummary]);

  // Auto-start chat if autoStart is true and profile is not complete
  useEffect(() => {
    if (autoStart && promptReady && !isProfileSetupActive && !isProfileComplete) {
      initializeProfileFilling();
    }
  }, [autoStart, promptReady, isProfileSetupActive, isProfileComplete, initializeProfileFilling]);

  // Handle profile chat input
  const handleProfileChatSubmit = async (e) => {
    e.preventDefault();
    const input = e.target.querySelector('input[type="text"]');
    if (!input || !input.value.trim()) return;

    const message = input.value.trim();
    input.value = '';
    
    // Add user message to chat history
    setChatHistory(prev => [...prev, { 
      role: 'user', 
      message: message 
    }]);
    
    await processUserAnswer(message);
  };

  // Debug logging
  console.log('Iterative Profile Setup Debug:', {
    promptReady,
    isProfileSetupActive,
    isProfileComplete,
    chatHistoryLength: chatHistory.length,
    userProfile: !!userProfile,
    currentField,
    isProcessing: profileService.isCurrentlyProcessing()
  });

  return (
    <>
      {/* Profile Chat Interface - always show when autoStart is true */}
      {autoStart && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '10px', fontSize: '16px', fontWeight: 'bold' }}>
            💬 Profile Setup Chat
            {currentField && (
              <span style={{ fontSize: '12px', color: '#666', marginLeft: '10px' }}>
                (Filling: {currentField})
              </span>
            )}
          </h3>
          
          {error && (
            <div style={{
              backgroundColor: '#f8d7da',
              color: '#721c24',
              padding: '10px',
              borderRadius: '4px',
              marginBottom: '10px',
              fontSize: '14px'
            }}>
              <strong>Error:</strong> {error}
            </div>
          )}
          
          <div style={{ 
            maxHeight: '300px', 
            overflowY: 'auto', 
            border: '1px solid #ddd', 
            borderRadius: '4px', 
            padding: '10px',
            backgroundColor: '#f9f9f9',
            marginBottom: '10px'
          }}>
            {!promptReady ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <ChatLoadingAnimation />
                <p style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                  Initializing AI model...
                </p>
              </div>
            ) : chatHistory.length === 0 ? (
              <ChatLoadingAnimation />
            ) : (
              <>
                {chatHistory.map((msg, index) => (
                  <div key={index} style={{ marginBottom: '10px' }}>
                    <strong style={{ color: msg.role === 'user' ? '#007bff' : '#28a745' }}>
                      {msg.role === 'user' ? 'You:' : 'AI:'}
                    </strong>
                    {msg.fieldName && (
                      <span style={{ fontSize: '10px', color: '#999', marginLeft: '5px' }}>
                        ({msg.fieldName})
                      </span>
                    )}
                    <div style={{ marginTop: '4px', fontSize: '14px' }}>
                      {msg.message}
                    </div>
                  </div>
                ))}
                {isAiThinking && (
                  <div style={{ marginBottom: '10px' }}>
                    <strong style={{ color: '#28a745' }}>AI:</strong>
                    <div style={{ marginTop: '4px', fontSize: '14px' }}>
                      <ChatLoadingAnimation />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
          <form onSubmit={handleProfileChatSubmit}>
            <input
              type="text"
              placeholder={!promptReady ? "AI model is initializing..." : "Type your answer here..."}
              disabled={isProfileComplete || isAiThinking || !promptReady}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </form>
          
          {userProfile && promptReady && (
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
              Profile completion: {userProfile.getCompletionPercentage()}%
              <br />
              <small style={{ color: '#999' }}>
                Missing: {userProfile.getMissingFields().join(', ') || 'None'}
              </small>
            </div>
          )}
        </div>
      )}

      {/* Completed Profile Display */}
      {isProfileComplete && userProfile && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '10px', fontSize: '16px', fontWeight: 'bold' }}>
            ✅ Your Travel Profile
          </h3>
          
          {profileSummary ? (
            <div style={{ 
              border: '1px solid #ddd', 
              borderRadius: '4px', 
              padding: '15px',
              backgroundColor: '#f9f9f9',
              fontSize: '14px',
              marginBottom: '10px',
              lineHeight: '1.5'
            }}>
              <strong>Profile Summary:</strong>
              <p style={{ margin: '10px 0 0 0', fontStyle: 'italic' }}>
                {profileSummary}
              </p>
            </div>
          ) : (
            <div style={{ 
              border: '1px solid #ddd', 
              borderRadius: '4px', 
              padding: '10px',
              backgroundColor: '#f9f9f9',
              fontSize: '14px',
              marginBottom: '10px'
            }}>
              <div><strong>Mobility:</strong> {userProfile.getMobilityDescription()}</div>
              <div><strong>Transport:</strong> {userProfile.getTransportDescription()}</div>
              <div><strong>Budget:</strong> {userProfile.budgetLevel !== null ? `Level ${userProfile.budgetLevel}` : 'Not specified'}</div>
              <div><strong>Pace:</strong> {userProfile.travelPace || 'Not specified'}</div>
              <div><strong>Time Window:</strong> {userProfile.getTimeWindowDescription()}</div>
              <div><strong>Dietary:</strong> {userProfile.getDietaryDescription()}</div>
            </div>
          )}
          
          <button 
            onClick={() => {
              setUserProfile(null);
              setChatHistory([]);
              setIsProfileComplete(false);
              setIsProfileSetupActive(false);
              setProfileSummary(null);
              setCurrentField(null);
              setError(null);
              profileService.reset();
              localStorage.removeItem('userProfile');
              // Notify parent component about profile reset
              if (onProfileUpdate) {
                onProfileUpdate(null);
              }
            }}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Reset Profile
          </button>
        </div>
      )}
    </>
  );
}
