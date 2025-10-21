import React, { useState } from 'react';
import { useSummarizer } from '../hooks/useSummarizer';
import { StatusBar } from '../components/StatusBar';
import { PromptForm } from '../components/PromptForm';
import { ResponseDisplay } from '../components/ResponseDisplay';

export function Summarizer() {
  const [inputText, setInputText] = useState('');
  const [summary, setSummary] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = React.useRef(null);
  
  // Summarizer creation options
  const [summarizerType, setSummarizerType] = useState('key-points');
  const [summarizerFormat, setSummarizerFormat] = useState('markdown');
  const [summarizerLength, setSummarizerLength] = useState('medium');
  const [inputLanguages, setInputLanguages] = useState(['en']);
  const [outputLanguage, setOutputLanguage] = useState('en');
  const [contextLanguages, setContextLanguages] = useState(['en']);
  
  // Summarization options
  const [context, setContext] = useState('This article is intended for identifying travelers needs and interests.');
  
  const { 
    status, 
    isApiReady,
    isDownloading,
    downloadProgress,
    availability,
    hasSession,
    checkAvailability,
    downloadModel,
    createSession,
    summarizeText,
    destroySummarizer
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

  const handleDownloadModel = async () => {
    const options = {
      type: summarizerType,
      format: summarizerFormat,
      length: summarizerLength
    };
    await downloadModel(options);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsLoading(true);
    setSummary('Summarizing...');

    try {
      const options = {
        context,
        type: summarizerType,
        format: summarizerFormat,
        length: summarizerLength
      };
      const stream = await summarizeText(inputText, options);
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

  const handleCreateSession = async () => {
    const options = {
      type: summarizerType,
      format: summarizerFormat,
      length: summarizerLength,
      expectedInputLanguages: inputLanguages,
      outputLanguage: outputLanguage,
      expectedContextLanguages: contextLanguages
    };
    
    try {
      await createSession(options);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleReset = async () => {
    setSummary('');
    setInputText('');
    await destroySummarizer();
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>📝 Summarizer API</h1>

      <StatusBar 
        status={status} 
        onCheckAvailability={checkAvailability} 
      />

      {/* Summarizer Options */}
      <div style={{ 
        marginBottom: '20px', 
        padding: '15px', 
        backgroundColor: '#f5f5f5', 
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px' }}>
          Summarizer Configuration
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '4px' }}>
              Type
            </label>
            <select 
              value={summarizerType} 
              onChange={(e) => setSummarizerType(e.target.value)}
              disabled={hasSession}
              style={{ 
                width: '100%', 
                padding: '6px 8px', 
                borderRadius: '4px', 
                border: '1px solid #ccc',
                fontSize: '14px',
                cursor: hasSession ? 'not-allowed' : 'pointer',
                opacity: hasSession ? 0.6 : 1
              }}
            >
              <option value="key-points">Key Points</option>
              <option value="tl;dr">TL;DR</option>
              <option value="teaser">Teaser</option>
              <option value="headline">Headline</option>
            </select>
          </div>
          
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '4px' }}>
              Format
            </label>
            <select 
              value={summarizerFormat} 
              onChange={(e) => setSummarizerFormat(e.target.value)}
              disabled={hasSession}
              style={{ 
                width: '100%', 
                padding: '6px 8px', 
                borderRadius: '4px', 
                border: '1px solid #ccc',
                fontSize: '14px',
                cursor: hasSession ? 'not-allowed' : 'pointer',
                opacity: hasSession ? 0.6 : 1
              }}
            >
              <option value="markdown">Markdown</option>
              <option value="plain-text">Plain Text</option>
            </select>
          </div>
          
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '4px' }}>
              Length
            </label>
            <select 
              value={summarizerLength} 
              onChange={(e) => setSummarizerLength(e.target.value)}
              disabled={hasSession}
              style={{ 
                width: '100%', 
                padding: '6px 8px', 
                borderRadius: '4px', 
                border: '1px solid #ccc',
                fontSize: '14px',
                cursor: hasSession ? 'not-allowed' : 'pointer',
                opacity: hasSession ? 0.6 : 1
              }}
            >
              <option value="short">Short</option>
              <option value="medium">Medium</option>
              <option value="long">Long</option>
            </select>
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '4px' }}>
              Input Languages
            </label>
            <select 
              value={inputLanguages[0]} 
              onChange={(e) => setInputLanguages([e.target.value])}
              disabled={hasSession}
              style={{ 
                width: '100%', 
                padding: '6px 8px', 
                borderRadius: '4px', 
                border: '1px solid #ccc',
                fontSize: '14px',
                cursor: hasSession ? 'not-allowed' : 'pointer',
                opacity: hasSession ? 0.6 : 1
              }}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="ja">Japanese</option>
            </select>
          </div>
          
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '4px' }}>
              Output Language
            </label>
            <select 
              value={outputLanguage} 
              onChange={(e) => setOutputLanguage(e.target.value)}
              disabled={hasSession}
              style={{ 
                width: '100%', 
                padding: '6px 8px', 
                borderRadius: '4px', 
                border: '1px solid #ccc',
                fontSize: '14px',
                cursor: hasSession ? 'not-allowed' : 'pointer',
                opacity: hasSession ? 0.6 : 1
              }}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="ja">Japanese</option>
            </select>
          </div>
          
          <div>
            <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '4px' }}>
              Context Languages
            </label>
            <select 
              value={contextLanguages[0]} 
              onChange={(e) => setContextLanguages([e.target.value])}
              disabled={hasSession}
              style={{ 
                width: '100%', 
                padding: '6px 8px', 
                borderRadius: '4px', 
                border: '1px solid #ccc',
                fontSize: '14px',
                cursor: hasSession ? 'not-allowed' : 'pointer',
                opacity: hasSession ? 0.6 : 1
              }}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="ja">Japanese</option>
            </select>
          </div>
        </div>
        
        <div style={{ marginTop: '12px' }}>
          <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', display: 'block', marginBottom: '4px' }}>
            Context
          </label>
          <input 
            type="text"
            value={context} 
            onChange={(e) => setContext(e.target.value)}
            placeholder="Additional context for summarization"
            style={{ 
              width: '100%', 
              padding: '6px 8px', 
              borderRadius: '4px', 
              border: '1px solid #ccc',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* Download Button for downloadable models */}
      {availability === 'downloadable' && !isApiReady && (
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={handleDownloadModel}
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

      {/* Create Session Button */}
      {isApiReady && !hasSession && (
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={handleCreateSession}
            style={{
              width: '100%',
              backgroundColor: '#1976D2',
              color: 'white',
              padding: '12px 20px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            ✨ Create Summarizer Session
          </button>
          <small style={{ color: '#666', fontSize: '12px', display: 'block', marginTop: '5px' }}>
            Create a session with the selected configuration to start summarizing
          </small>
        </div>
      )}

      {/* Session Active Indicator */}
      {hasSession && (
        <div style={{
          backgroundColor: '#e8f5e9',
          border: '2px solid #4caf50',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <strong style={{ color: '#2e7d32' }}>✅ Session Active</strong>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              Type: {summarizerType}, Format: {summarizerFormat}, Length: {summarizerLength}
            </div>
            <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
              Languages: {inputLanguages.join(', ')} → {outputLanguage} (context: {contextLanguages.join(', ')})
            </div>
          </div>
          <button
            onClick={handleReset}
            style={{
              backgroundColor: '#f44336',
              color: 'white',
              padding: '6px 12px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold'
            }}
          >
            End Session
          </button>
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
          disabled={!hasSession}
          style={{
            backgroundColor: hasSession ? '#1976D2' : '#ccc',
            color: 'white',
            padding: '10px 20px',
            border: 'none',
            borderRadius: '4px',
            cursor: hasSession ? 'pointer' : 'not-allowed',
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
        isApiReady={hasSession}
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

