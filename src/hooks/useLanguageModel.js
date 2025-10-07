import { useState, useEffect, useRef } from 'react';

export function useLanguageModel() {
  const [status, setStatus] = useState('⚠️ Click "Check API" button below to enable sending prompts');
  const [isApiReady, setIsApiReady] = useState(false);
  const sessionRef = useRef(null);

  // Cleanup session on unmount
  useEffect(() => {
    return () => {
      if (sessionRef.current) {
        sessionRef.current.destroy().catch(console.warn);
      }
    };
  }, []);

  const checkAvailability = async () => {
    setStatus('Checking availability...');
    try {
      const availability = await window.LanguageModel.availability();
      console.log('Availability status:', availability);
      
      if (availability === 'available') {
        setStatus('✅ Language model is ready!');
        setIsApiReady(true);
      } else {
        setStatus(`❌ Language model status: ${availability}`);
        setIsApiReady(false);
      }
    } catch (error) {
      setStatus('Error: ' + error.message);
      setIsApiReady(false);
    }
  };

  const resetSession = async () => {
    if (sessionRef.current) {
      try {
        await sessionRef.current.destroy();
      } catch (error) {
        console.warn('Error destroying session:', error);
      }
      sessionRef.current = null;
    }
  };

  const sendPrompt = async (prompt) => {
    if (!sessionRef.current) {
      sessionRef.current = await window.LanguageModel.create();
    }

    const stream = await sessionRef.current.promptStreaming(prompt);
    return stream;
  };

  return {
    status,
    isApiReady,
    checkAvailability,
    resetSession,
    sendPrompt
  };
}

