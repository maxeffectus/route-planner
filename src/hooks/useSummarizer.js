import { useState, useRef, useCallback } from 'react';
import { SummarizerAPI } from '../services/SummarizerAPI';

export function useSummarizer() {
  const [status, setStatus] = useState('⚠️ Click "Check API" button below to check availability');
  const [isApiReady, setIsApiReady] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [availability, setAvailability] = useState(null);
  const [hasSession, setHasSession] = useState(false);
  const summarizerAPIRef = useRef(new SummarizerAPI());

  const checkAvailability = async () => {
    setStatus('Checking availability...');
    try {
      const apiAvailability = await summarizerAPIRef.current.checkAvailability();
      setAvailability(apiAvailability);

      if (apiAvailability === 'available') {
        setStatus('✅ Summarizer is ready!');
        setIsApiReady(true);
      } else if (apiAvailability === 'downloadable') {
        setStatus('📥 Summarizer model needs to be downloaded (one-time operation)');
        setIsApiReady(false);
      } else if (apiAvailability === 'unavailable') {
        setStatus('❌ Summarizer is not available on this device/browser');
        setIsApiReady(false);
      }
    } catch (error) {
      console.error('Availability check error:', error);
      setStatus('❌ Error: ' + error.message);
      setIsApiReady(false);
      setAvailability('unavailable');
    }
  };

  const downloadModel = async (options = {}) => {
    setIsDownloading(true);
    setDownloadProgress(0);
    setStatus('📥 Downloading summarizer model...');

    try {
      await summarizerAPIRef.current.downloadModel((progress) => {
        setDownloadProgress(progress);
        setStatus(`📥 Downloading model: ${progress.toFixed(1)}%`);
      }, options);

      setStatus('✅ Summarizer model downloaded and ready!');
      setIsApiReady(true);
      setIsDownloading(false);
      setDownloadProgress(100);
    } catch (error) {
      console.error('Model download error:', error);
      setStatus('❌ Failed to download model: ' + error.message);
      setIsDownloading(false);
      setIsApiReady(false);
    }
  };

  const summarizeText = useCallback(async (longText, options = {}) => {
    try {
      const stream = await summarizerAPIRef.current.summarizeText(longText, options);
      return stream;
    } catch (error) {
      throw new Error('Summarization failed: ' + error.message);
    }
  }, []);

  const createSession = async (options = {}) => {
    try {
      await summarizerAPIRef.current.createSummarizer(options);
      setHasSession(true);
      setStatus('✅ Summarizer session created! Ready to summarize text.');
    } catch (error) {
      console.error('Session creation error:', error);
      setStatus('❌ Failed to create session: ' + error.message);
      setHasSession(false);
      throw error;
    }
  };

  const destroySummarizer = async () => {
    await summarizerAPIRef.current.destroySummarizer();
    setHasSession(false);
    setStatus('Session destroyed');
  };

  return {
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
    destroySummarizer,
    summarizerAPI: summarizerAPIRef.current // Export the API instance for direct use
  };
}
