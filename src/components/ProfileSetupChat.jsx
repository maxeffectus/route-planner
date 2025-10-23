import React, { useState, useCallback, useEffect } from 'react';
import { UserProfile } from '../models/UserProfile';
import { 
  userProfilePromptOptions, 
  createUserProfilePrompt, 
  validateUserProfileResponse, 
  extractUserProfileData,
  responseSchema,
  systemInstruction
} from '../services/UserProfilePromptConfig';

/**
 * Chat Loading Animation Component
 */
function ChatLoadingAnimation() {
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
    }, 1500); // Change message every 1.5 seconds
    
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
 * Profile Setup Chat Component
 * Handles AI-driven user profile creation through conversational interface
 */
export function ProfileSetupChat({ promptAPIRef, promptReady, onProfileComplete, onProfileUpdate, autoStart = false }) {
  // UserProfile and chat state
  const [userProfile, setUserProfile] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [isProfileSetupActive, setIsProfileSetupActive] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Send message to AI for profile setup
  const sendProfileMessage = useCallback(async (userMessage, profileToUse = null) => {
    const currentProfile = profileToUse || userProfile;
    
    if (!currentProfile || !promptReady || isProfileComplete) {
      return;
    }

    try {
      // Set AI thinking state
      setIsAiThinking(true);
      
      // Create structured prompt
      const structuredPrompt = createUserProfilePrompt(
        currentProfile.toJSON(),
        userMessage,
        chatHistory
      );
      
      // Add to chat history only if it's a real user message (not technical initialization)
      if (userMessage !== `Conversation started. currentProfile=${JSON.stringify(currentProfile.toJSON())}`) {
        setChatHistory(prev => [...prev, { role: 'user', message: userMessage }]);
      }

      // Send to AI
      const response = await promptAPIRef.current.prompt(structuredPrompt);
      console.log('AI Response:', response);
      console.log('Response type:', typeof response);
      
      // Parse JSON response
      let aiResponse;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : response;
        console.log('Extracted JSON string:', jsonString);
        aiResponse = JSON.parse(jsonString);
        console.log('Parsed AI response:', aiResponse);
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        console.error('Raw response:', response);
        aiResponse = {
          updatedProfile: currentProfile.toJSON(),
          nextQuestion: "I understand. Could you tell me more about your travel preferences?",
          isComplete: false
        };
      }

      // Validate response
      if (!validateUserProfileResponse(aiResponse)) {
        console.warn('AI response validation failed, using fallback');
        if (!aiResponse.nextQuestion) {
          aiResponse.nextQuestion = "I understand. Could you tell me more about your travel preferences?";
        }
        if (typeof aiResponse.isComplete !== 'boolean') {
          aiResponse.isComplete = false;
        }
        if (!aiResponse.updatedProfile) {
          aiResponse.updatedProfile = currentProfile.toJSON();
        }
      }

      // Update profile with AI response
      try {
        const profileData = extractUserProfileData(aiResponse);
        setUserProfile(prevProfile => {
          const updated = new UserProfile(prevProfile.userId);
          Object.assign(updated, profileData);
          
          // Notify parent component about profile update
          if (onProfileUpdate) {
            onProfileUpdate(updated);
          }
          
          return updated;
        });
      } catch (extractError) {
        console.warn('Failed to extract profile data, keeping current profile:', extractError);
      }

      // Update chat history
      setChatHistory(prev => {
        const newHistory = [...prev, { role: 'ai', message: aiResponse.nextQuestion }];
        console.log('Added AI response to chat:', aiResponse.nextQuestion);
        console.log('AI response object:', aiResponse);
        console.log('Chat history length:', newHistory.length);
        console.log('Full new history:', newHistory);
        return newHistory;
      });
      
      // Check completion status
      setIsProfileComplete(aiResponse.isComplete);

      if (aiResponse.isComplete) {
        setIsProfileSetupActive(false);
        // Call the completion callback if provided
        if (onProfileComplete) {
          onProfileComplete();
        }
      }

    } catch (error) {
      console.error('Profile message error:', error);
      setChatHistory(prev => [...prev, { 
        role: 'ai', 
        message: `Sorry, there was an error processing your response. Please try again. (Error: ${error.message})` 
      }]);
    } finally {
      // Always reset AI thinking state
      setIsAiThinking(false);
    }
  }, [userProfile, promptReady, isProfileComplete, chatHistory, onProfileUpdate]);

  // Initialize UserProfile chat
  const initializeProfileChat = useCallback(async () => {
    try {
      if (!promptReady) {
        throw new Error('Prompt API not ready');
      }

      // Create new UserProfile
      const profile = new UserProfile('user-123');
      setUserProfile(profile);
      setChatHistory([]);
      setIsProfileComplete(false);
      setIsProfileSetupActive(true);

      // Start conversation with initial prompt
      const initialPrompt = `Conversation started. currentProfile=${JSON.stringify(profile.toJSON())}`;
      await sendProfileMessage(initialPrompt, profile);
      
      // Fallback: if no AI response after 3 seconds, add a default question
      setTimeout(() => {
        setChatHistory(prev => {
          if (prev.length === 0) {
            return [{ 
              role: 'ai', 
              message: 'Hello! I\'d be happy to help you set up your travel profile. What type of mobility do you have? (Standard, wheelchair, stroller, or limited endurance?)' 
            }];
          }
          return prev;
        });
      }, 3000);
      
    } catch (error) {
      console.error('Profile chat initialization error:', error);
    }
  }, [promptReady, sendProfileMessage]);

  // Auto-start chat if autoStart is true
  useEffect(() => {
    if (autoStart && promptReady && !isProfileSetupActive && !isProfileComplete) {
      initializeProfileChat();
    }
  }, [autoStart, promptReady, isProfileSetupActive, isProfileComplete, initializeProfileChat]);

  // Handle profile chat input
  const handleProfileChatSubmit = async (e) => {
    e.preventDefault();
    const input = e.target.querySelector('input[type="text"]');
    if (!input || !input.value.trim()) return;

    const message = input.value.trim();
    input.value = '';
    
    await sendProfileMessage(message);
  };

  // Debug logging
  console.log('Profile Setup Debug:', {
    promptReady,
    isProfileSetupActive,
    isProfileComplete,
    chatHistoryLength: chatHistory.length,
    userProfile: !!userProfile
  });

  return (
    <>
      {/* Profile Chat Interface - always show when autoStart is true */}
      {autoStart && (
        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '10px', fontSize: '16px', fontWeight: 'bold' }}>
            💬 Profile Setup Chat
          </h3>
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
                {console.log('Rendering chat history:', chatHistory)}
                {chatHistory.map((msg, index) => (
                  <div key={index} style={{ marginBottom: '10px' }}>
                    <strong style={{ color: msg.role === 'user' ? '#007bff' : '#28a745' }}>
                      {msg.role === 'user' ? 'You:' : 'AI:'}
                    </strong>
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
          
          <button 
            onClick={() => {
              setUserProfile(null);
              setChatHistory([]);
              setIsProfileComplete(false);
              setIsProfileSetupActive(false);
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
