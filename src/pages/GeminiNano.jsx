import React, { useState } from 'react';
import { usePromptAPI } from '../hooks/usePromptAPI';
import { useStreamingText } from '../hooks/useStreamingText';
import { StatusBar } from '../components/StatusBar';
import { PromptForm } from '../components/PromptForm';
import { ResponseDisplay } from '../components/ResponseDisplay';

export function GeminiNano() {
  const [prompt, setPrompt] = useState('');
  
  const { 
    status, 
    isApiReady, 
    availability,
    hasSession,
    checkAvailability, 
    createSession,
    resetSession, 
    sendPrompt 
  } = usePromptAPI();

  const { response, isLoading, processStream, resetResponse } = useStreamingText();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    try {
      // Session should already be created after checkAvailability
      if (!hasSession) {
        await createSession();
      }
      
      const stream = await sendPrompt(prompt);
      await processStream(stream, { 
        initialMessage: 'Sending...',
        onComplete: () => setPrompt('')
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleResetSession = async () => {
    await resetSession();
    resetResponse();
    setPrompt('');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>🤖 Gemini Nano</h1>

      <StatusBar 
        status={status} 
        onCheckAvailability={checkAvailability} 
      />

      <PromptForm
        prompt={prompt}
        onPromptChange={setPrompt}
        onSubmit={handleSubmit}
        onResetSession={handleResetSession}
        isLoading={isLoading}
        isApiReady={hasSession}
      />

      <ResponseDisplay response={response} />
    </div>
  );
}

