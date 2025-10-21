import React, { useState } from 'react';
import { useSummarizer } from '../hooks/useSummarizer';
import { StatusBar } from '../components/StatusBar';
import { PromptForm } from '../components/PromptForm';
import { ResponseDisplay } from '../components/ResponseDisplay';

export function SummarizerPage() {
  const [inputText, setInputText] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = React.useRef(null);
  
  const { 
    status, 
    isApiReady,
    isDownloading,
    downloadProgress,
    availability,
    checkAvailability,
    downloadModel,
    summarizeText
  } = useSummarizer();

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.txt')) {
      alert('Please select a .txt file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      setInputText(text);
    };
    reader.onerror = () => {
      alert('Error reading file');
    };
    reader.readAsText(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsLoading(true);
    setSummary('Summarizing...');

    try {
      const stream = await summarizeText(inputText);
      let result = '';
      let previousChunk = '';

      for await (const chunk of stream) {
        const newChunk = chunk.startsWith(previousChunk)
          ? chunk.slice(previousChunk.length) : chunk;
        result += newChunk;
        setSummary(result);
        previousChunk = chunk;
      }
    } catch (error) {
      console.error('Error:', error);
      setSummary('Error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSummary('');
    setInputText('');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>📝 Summarizer API</h1>

      <StatusBar 
        status={status} 
        onCheckAvailability={checkAvailability} 
      />

      {/* Download Button for downloadable models */}
      {availability === 'downloadable' && !isApiReady && (
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={downloadModel}
            disabled={isDownloading}
            style={{
              width: '100%',
              backgroundColor: isDownloading ? '#ccc' : '#34a853',
              color: 'white',
              padding: '12px 20px',
              border: 'none',
              borderRadius: '4px',
              cursor: isDownloading ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              marginBottom: '10px'
            }}
          >
            {isDownloading ? '📥 Downloading...' : '📥 Download Summarizer Model'}
          </button>

          {/* Progress Bar */}
          {isDownloading && (
            <div style={{
              width: '100%',
              backgroundColor: '#e0e0e0',
              borderRadius: '8px',
              overflow: 'hidden',
              height: '24px',
              position: 'relative'
            }}>
              <div
                style={{
                  width: `${downloadProgress}%`,
                  height: '100%',
                  backgroundColor: '#34a853',
                  transition: 'width 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
              >
                {downloadProgress.toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error message for unavailable API */}
      {availability === 'unavailable' && (
        <div style={{
          backgroundColor: '#fce8e6',
          border: '2px solid #c5221f',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '20px',
          color: '#c5221f'
        }}>
          <strong>⚠️ Summarizer API Not Available</strong>
          <p style={{ margin: '10px 0 0 0', fontSize: '14px' }}>
            The Summarizer API cannot be used on this device or browser. 
            Please try using Chrome Canary or Chrome Dev with the appropriate flags enabled.
          </p>
        </div>
      )}

      {/* File Upload Button */}
      <div style={{ marginBottom: '15px' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        <button
          onClick={handleUploadClick}
          disabled={!isApiReady}
          style={{
            backgroundColor: isApiReady ? '#1976D2' : '#ccc',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: isApiReady ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          📁 Load Text File
        </button>
        <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '5px' }}>
          Load a .txt file to summarize (e.g., from src/static_resources/test_data/)
        </small>
      </div>

      <PromptForm
        prompt={inputText}
        onPromptChange={setInputText}
        onSubmit={handleSubmit}
        onResetSession={handleReset}
        isLoading={isLoading}
        isApiReady={isApiReady}
      />

      {summary && (
        <>
          <h3 style={{ marginTop: '20px', marginBottom: '10px', color: '#333' }}>
            Summary:
          </h3>
          <ResponseDisplay response={summary} />
        </>
      )}
    </div>
  );
}

