import React, { useState } from 'react';
import { useLanguageModel } from '../hooks/useLanguageModel';
import { StatusBar } from '../components/StatusBar';
import { PromptForm } from '../components/PromptForm';
import { ResponseDisplay } from '../components/ResponseDisplay';

export function GeminiNano() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { 
    status, 
    isApiReady, 
    checkAvailability, 
    resetSession, 
    sendPrompt 
  } = useLanguageModel();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setResponse('Sending...');

    try {
      const stream = await sendPrompt(prompt);
      let result = '';
      let previousChunk = '';

      for await (const chunk of stream) {
        const newChunk = chunk.startsWith(previousChunk)
          ? chunk.slice(previousChunk.length) : chunk;
        result += newChunk;
        setResponse(result);
        previousChunk = chunk;
      }

      setPrompt('');
    } catch (error) {
      console.error('Error:', error);
      setResponse('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetSession = async () => {
    await resetSession();
    setResponse('');
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

