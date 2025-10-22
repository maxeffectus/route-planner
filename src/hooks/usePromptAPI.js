import { useState, useRef, useCallback } from 'react';
import { PromptAPI } from '../services/PromptAPI';

/**
 * Custom hook for managing Gemini Nano Language Model interactions
 * Provides state management and session handling
 */
export function usePromptAPI() {
  const [status, setStatus] = useState('⚠️ Click "Check API" button below to check availability');
  const [isApiReady, setIsApiReady] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [hasSession, setHasSession] = useState(false);
  
  const promptAPIRef = useRef(new PromptAPI());

  /**
   * Check API availability
   */
  const checkAvailability = useCallback(async () => {
    setStatus('Checking availability...');
    try {
      const availability = await promptAPIRef.current.checkAvailability();
      setAvailability(availability);
      
      if (availability === 'available') {
        // Automatically create session when available
        try {
          await promptAPIRef.current.createSession();
          setHasSession(true);
          setStatus('✅ Language Model is ready!');
          setIsApiReady(true);
        } catch (sessionError) {
          console.error('Session creation error:', sessionError);
          setStatus('✅ Language Model available, but session creation failed');
          setIsApiReady(true); // Still ready, user can try reset
        }
      } else if (availability === 'downloadable') {
        setStatus('📥 Language Model can be downloaded');
        setIsApiReady(false);
      } else {
        setStatus('❌ Language Model is not available');
        setIsApiReady(false);
      }
    } catch (error) {
      console.error('Availability check error:', error);
      setStatus('Error: ' + error.message);
      setIsApiReady(false);
    }
  }, []);

  /**
   * Create a new session
   */
  const createSession = useCallback(async (options = {}) => {
    try {
      await promptAPIRef.current.createSession(options);
      setHasSession(true);
      setStatus('✅ Language Model session created! Ready to send prompts.');
    } catch (error) {
      console.error('Session creation error:', error);
      setStatus('Error creating session: ' + error.message);
      throw error;
    }
  }, []);

  /**
   * Send a prompt and get streaming response
   */
  const sendPrompt = useCallback(async (prompt, options = {}) => {
    try {
      const stream = await promptAPIRef.current.sendPrompt(prompt, options);
      return stream;
    } catch (error) {
      console.error('Prompt sending error:', error);
      throw error;
    }
  }, []);

  /**
   * Send prompt with automatic session management
   */
  const promptWithAutoSession = useCallback(async (prompt, options = {}) => {
    try {
      const stream = await promptAPIRef.current.promptWithAutoSession(prompt, options);
      return stream;
    } catch (error) {
      console.error('Auto-session prompt error:', error);
      throw error;
    }
  }, []);

  /**
   * Destroy the current session
   */
  const destroySession = useCallback(async () => {
    try {
      await promptAPIRef.current.destroySession();
      setHasSession(false);
      setStatus('Session destroyed');
    } catch (error) {
      console.error('Session destruction error:', error);
      throw error;
    }
  }, []);

  /**
   * Reset session (destroy and recreate)
   */
  const resetSession = useCallback(async (options = {}) => {
    try {
      await promptAPIRef.current.resetSession(options);
      setHasSession(true);
      setStatus('✅ Language Model session reset!');
    } catch (error) {
      console.error('Session reset error:', error);
      setStatus('Error resetting session: ' + error.message);
      throw error;
    }
  }, []);

  return {
    // State
    status,
    isApiReady,
    availability,
    hasSession,
    
    // Methods
    checkAvailability,
    createSession,
    sendPrompt,
    promptWithAutoSession,
    destroySession,
    resetSession,
    
    // Direct API access
    promptAPI: promptAPIRef.current
  };
}
