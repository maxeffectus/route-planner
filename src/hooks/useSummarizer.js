import { useState, useRef, useCallback } from 'react';

export function useSummarizer() {
  const [status, setStatus] = useState('⚠️ Click "Check API" button below to check availability');
  const [isApiReady, setIsApiReady] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [availability, setAvailability] = useState(null);
  const summarizerRef = useRef(null);

  const checkAvailability = async () => {
    setStatus('Checking availability...');
    try {
      if (!window.Summarizer) {
        setStatus('❌ Summarizer API is not available in this browser');
        setIsApiReady(false);
        setAvailability('unavailable');
        return;
      }

      // Use exact API as provided by user
      const availability = await window.Summarizer.availability();
      console.log('Summarizer availability:', availability);
      
      setAvailability(availability);

      if (availability === 'available') {
        setStatus('✅ Summarizer is ready!');
        setIsApiReady(true);
      } else if (availability === 'downloadable') {
        setStatus('📥 Summarizer model needs to be downloaded (one-time operation)');
        setIsApiReady(false);
      } else if (availability === 'unavailable') {
        setStatus('❌ Summarizer is not available on this device/browser');
        setIsApiReady(false);
      }
    } catch (error) {
      console.error('Availability check error:', error);
      setStatus('Error: ' + error.message);
      setIsApiReady(false);
      setAvailability('unavailable');
    }
  };

  const downloadModel = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);
    setStatus('📥 Downloading summarizer model...');

    try {
      // Proceed to request batch or streaming summarization
      const summarizer = await window.Summarizer.create({
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            console.log(`Downloaded ${e.loaded * 100}%`);
            const progress = e.loaded * 100;
            setDownloadProgress(progress);
            setStatus(`📥 Downloading model: ${progress.toFixed(1)}%`);
          });
        }
      });

      summarizerRef.current = summarizer;
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

  const summarizeText = useCallback(async (longText) => {
    try {
      const summarizer = await window.Summarizer.create({
        type: "key-points",
        format: "markdown",
        length: "medium",
        expectedInputLanguages: ["en"],
        outputLanguage: "en",
        expectedContextLanguages: ["en"],
        sharedContext: `These are requests to summarize the traveler's needs and special requirements \
            in order to create a custom-tailored route. Pay special attention to accessibility requests: \
            our user could be a mother with a stroller, a disabled person in a wheelchair, \
            an elderly person, a colorblind person, a bicycle rider, etc.`
      });
      const stream = summarizer.summarizeStreaming(longText, {
        context: `This article is intended for identifying travelers needs and interests.`,
      });
      return stream;
    } catch (error) {
      throw new Error('Summarization failed: ' + error.message);
    }
  }, []);

  const destroySummarizer = async () => {
    if (summarizerRef.current) {
      try {
        await summarizerRef.current.destroy();
      } catch (error) {
        console.warn('Error destroying summarizer:', error);
      }
      summarizerRef.current = null;
    }
  };

  return {
    status,
    isApiReady,
    isDownloading,
    downloadProgress,
    availability,
    checkAvailability,
    downloadModel,
    summarizeText,
    destroySummarizer
  };
}

