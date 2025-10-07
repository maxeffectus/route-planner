import React from 'react';

export function PromptForm({ 
  prompt, 
  onPromptChange, 
  onSubmit, 
  onResetSession,
  isLoading, 
  isApiReady 
}) {
  return (
    <form onSubmit={onSubmit} style={{ marginBottom: '20px' }}>
      <div style={{ marginBottom: '10px' }}>
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
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
          onClick={onResetSession}
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
  );
}

