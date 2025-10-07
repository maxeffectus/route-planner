import React, { useState, useEffect, useRef } from 'react';

function App() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('⚠️ Click "Check API" button below to enable sending prompts');
  const [isLoading, setIsLoading] = useState(false);
  const [isApiReady, setIsApiReady] = useState(false);
  const sessionRef = useRef(null);

  const renderMarkdown = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n/g, '<br>');
  };

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
      
      // Check for both 'readily' and 'available' status
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
    setResponse('');
    setPrompt('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setResponse('Sending...');

    try {
      // Create session only if it doesn't exist
      if (!sessionRef.current) {
        sessionRef.current = await window.LanguageModel.create();
      }

      const stream = await sessionRef.current.promptStreaming(prompt);
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

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>Gemini Nano</h1>

      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
        {status}
        <button
          onClick={checkAvailability}
          style={{
            marginLeft: '10px',
            padding: '5px 10px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Check API
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <div style={{ marginBottom: '10px' }}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your prompt..."
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
              minHeight: '100px',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="submit"
            disabled={isLoading || !prompt.trim() || !isApiReady}
            style={{
              backgroundColor: isApiReady ? '#4285f4' : '#ccc',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              cursor: (isLoading || !isApiReady) ? 'not-allowed' : 'pointer',
              opacity: (isLoading || !isApiReady) ? 0.6 : 1,
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {isLoading ? 'Sending...' : isApiReady ? 'Send Prompt' : 'Check API First ⬆️'}
          </button>

          <button
            type="button"
            onClick={resetSession}
            disabled={isLoading}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1
            }}
          >
            Reset Session
          </button>
        </div>
      </form>

      <div
        style={{
          whiteSpace: 'pre-wrap',
          fontFamily: 'monospace',
          lineHeight: '1.4',
          padding: '10px',
          border: '1px solid #ccc',
          backgroundColor: '#f9f9f9',
          borderRadius: '4px',
          minHeight: '50px'
        }}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(response) }}
      />
    </div>
  );
}

export default App;
