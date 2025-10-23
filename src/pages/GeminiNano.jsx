import React, { useState } from 'react';
import { usePromptAPI } from '../hooks/usePromptAPI';
import { useStreamingText } from '../hooks/useStreamingText';
import { StatusBar } from '../components/StatusBar';
import { PromptForm } from '../components/PromptForm';
import { ResponseDisplay } from '../components/ResponseDisplay';

export function GeminiNano() {
  const [prompt, setPrompt] = useState('');
  
  // Session options state
  const [sessionOptions, setSessionOptions] = useState({
    temperature: 0.7,
    topK: 40,
    maxOutputTokens: 1000,
    responseConstraint: null,
    initialPrompts: []
  });
  
  // Text states for JSON fields
  const [responseConstraintText, setResponseConstraintText] = useState('');
  const [initialPromptsText, setInitialPromptsText] = useState('[]');
  const [jsonErrors, setJsonErrors] = useState({});
  
  // Prompt options state
  const [promptOptions, setPromptOptions] = useState({
    // Add any prompt-specific options here if needed
  });
  
  const { 
    status, 
    isApiReady, 
    availability,
    hasSession,
    checkAvailability, 
    createSession,
    resetSession, 
    promptStreaming 
  } = usePromptAPI();

  const { response, isLoading, processStream, resetResponse } = useStreamingText();

  // Function to validate JSON and update session options
  const validateAndUpdateJSON = (field, text) => {
    try {
      const parsed = text.trim() ? JSON.parse(text) : null;
      setSessionOptions(prev => ({ ...prev, [field]: parsed }));
      setJsonErrors(prev => ({ ...prev, [field]: null }));
    } catch (error) {
      setJsonErrors(prev => ({ ...prev, [field]: error.message }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    try {
      // Session should already be created after checkAvailability
      if (!hasSession) {
        await createSession(sessionOptions);
      }
      
      const stream = await promptStreaming(prompt, promptOptions);
      await processStream(stream, { 
        initialMessage: 'Sending...',
        onComplete: () => setPrompt('')
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleResetSession = async () => {
    await resetSession(sessionOptions);
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

      {/* Session Options */}
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '16px' }}>⚙️ Session Options</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
              Temperature: {sessionOptions.temperature}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={sessionOptions.temperature}
              onChange={(e) => setSessionOptions(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
              style={{ width: '100%' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
              TopK: {sessionOptions.topK}
            </label>
            <input
              type="range"
              min="1"
              max="100"
              step="1"
              value={sessionOptions.topK}
              onChange={(e) => setSessionOptions(prev => ({ ...prev, topK: parseInt(e.target.value) }))}
              style={{ width: '100%' }}
            />
          </div>
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
            Max Output Tokens: {sessionOptions.maxOutputTokens}
          </label>
          <input
            type="range"
            min="100"
            max="4000"
            step="100"
            value={sessionOptions.maxOutputTokens}
            onChange={(e) => setSessionOptions(prev => ({ ...prev, maxOutputTokens: parseInt(e.target.value) }))}
            style={{ width: '100%' }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
            Response Constraint (JSON Schema):
          </label>
          <textarea
            value={responseConstraintText}
            onChange={(e) => setResponseConstraintText(e.target.value)}
            onBlur={() => validateAndUpdateJSON('responseConstraint', responseConstraintText)}
            placeholder="Enter JSON schema for response constraint (optional)"
            style={{
              width: '100%',
              height: '100px',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px',
              fontFamily: 'monospace',
              borderColor: jsonErrors.responseConstraint ? '#dc3545' : '#ddd'
            }}
          />
          {jsonErrors.responseConstraint && (
            <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '5px' }}>
              JSON Error: {jsonErrors.responseConstraint}
            </div>
          )}
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>
            Initial Prompts (JSON Array):
          </label>
          <textarea
            value={initialPromptsText}
            onChange={(e) => setInitialPromptsText(e.target.value)}
            onBlur={() => validateAndUpdateJSON('initialPrompts', initialPromptsText)}
            placeholder='[{"role": "system", "content": "You are a helpful assistant."}]'
            style={{
              width: '100%',
              height: '80px',
              padding: '8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px',
              fontFamily: 'monospace',
              borderColor: jsonErrors.initialPrompts ? '#dc3545' : '#ddd'
            }}
          />
          {jsonErrors.initialPrompts && (
            <div style={{ color: '#dc3545', fontSize: '12px', marginTop: '5px' }}>
              JSON Error: {jsonErrors.initialPrompts}
            </div>
          )}
        </div>
        
        <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => {
                const newOptions = {
                  temperature: 0.7,
                  topK: 40,
                  maxOutputTokens: 1000,
                  responseConstraint: null,
                  initialPrompts: []
                };
                setSessionOptions(newOptions);
                setResponseConstraintText('');
                setInitialPromptsText('[]');
                setJsonErrors({});
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Reset to Defaults
            </button>
            
            <button
              onClick={() => {
                const newOptions = {
                  temperature: 0.3,
                  topK: 20,
                  maxOutputTokens: 2000,
                  responseConstraint: null,
                  initialPrompts: [{"role": "system", "content": "You are a helpful, precise, and concise assistant."}]
                };
                setSessionOptions(newOptions);
                setResponseConstraintText('');
                setInitialPromptsText(JSON.stringify(newOptions.initialPrompts, null, 2));
                setJsonErrors({});
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Precise Mode
            </button>
            
            <button
              onClick={() => {
                const newOptions = {
                  temperature: 1.2,
                  topK: 60,
                  maxOutputTokens: 1500,
                  responseConstraint: null,
                  initialPrompts: [{"role": "system", "content": "You are a creative and imaginative assistant."}]
                };
                setSessionOptions(newOptions);
                setResponseConstraintText('');
                setInitialPromptsText(JSON.stringify(newOptions.initialPrompts, null, 2));
                setJsonErrors({});
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: '#fd7e14',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Creative Mode
            </button>
          </div>
          
          <button
            onClick={async () => {
              try {
                await resetSession(sessionOptions);
                resetResponse();
                setPrompt('');
              } catch (error) {
                console.error('Error updating session:', error);
              }
            }}
            disabled={!isApiReady}
            style={{
              padding: '8px 16px',
              backgroundColor: isApiReady ? '#007bff' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isApiReady ? 'pointer' : 'not-allowed',
              fontSize: '14px'
            }}
          >
            Update Session with New Options
          </button>
        </div>
      </div>

      {/* Prompt Options (for future use) */}
      <div style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#f0f8ff' }}>
        <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '16px' }}>📝 Prompt Options</h3>
        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
          Additional options for prompt processing (currently not used by the API, but available for future extensions).
        </p>
        <textarea
          value={JSON.stringify(promptOptions, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              setPromptOptions(parsed);
            } catch (error) {
              // Invalid JSON, don't update
            }
          }}
          placeholder='{"customOption": "value"}'
          style={{
            width: '100%',
            height: '60px',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'monospace',
            marginTop: '10px'
          }}
        />
      </div>

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

