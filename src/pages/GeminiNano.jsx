import React, { useState } from 'react';
import { useLanguageModel } from '../hooks/useLanguageModel';
import { useStreamingText } from '../hooks/useStreamingText';
import { StatusBar } from '../components/StatusBar';
import { PromptForm } from '../components/PromptForm';
import { ResponseDisplay } from '../components/ResponseDisplay';

export function GeminiNano() {
  const [prompt, setPrompt] = useState('');
  
  const { 
    status, 
    isApiReady, 
    checkAvailability, 
    resetSession, 
    sendPrompt 
  } = useLanguageModel();

  const { response, isLoading, processStream, resetResponse } = useStreamingText();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    try {
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
        isApiReady={isApiReady}
      />

      <ResponseDisplay response={response} />
    </div>
  );
}

