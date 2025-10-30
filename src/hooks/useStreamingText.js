import { useState, useCallback } from 'react';

/**
 * Custom hook for handling streaming text responses
 * Reusable across Gemini Nano, Summarizer API, and any other streaming text API
 */
export function useStreamingText() {
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Process a streaming response
   * @param {AsyncIterable} stream - The streaming response
   * @param {Object} options - Processing options
   * @param {string} options.initialMessage - Message to show while starting (default: 'Processing...')
   * @param {Function} options.onComplete - Callback when streaming completes
   * @param {Function} options.onError - Callback when error occurs
   */
  const processStream = useCallback(async (stream, options = {}) => {
    const {
      initialMessage = 'Processing...',
      onComplete,
      onError
    } = options;

    console.log('[useStreamingText] Starting stream processing, initial message:', initialMessage);
    setIsLoading(true);
    setResponse(initialMessage);

    try {
      let result = '';
      let previousChunk = '';
      let chunkCount = 0;

      console.log('[useStreamingText] Starting to iterate over stream...');
      for await (const chunk of stream) {
        chunkCount++;
        // Handle incremental chunks - extract only the new part
        const newChunk = chunk.startsWith(previousChunk)
          ? chunk.slice(previousChunk.length)
          : chunk;
        
        result += newChunk;
        setResponse(result);
        previousChunk = chunk;
        console.log(`[useStreamingText] Chunk ${chunkCount} received, total length:`, result.length);
      }

      console.log('[useStreamingText] Stream complete. Total chunks:', chunkCount, 'Total length:', result.length);
      
      if (onComplete) {
        console.log('[useStreamingText] Calling onComplete callback');
        onComplete(result);
      }

      return result;
    } catch (error) {
      console.error('[useStreamingText] Stream processing error:', error);
      const errorMessage = 'Error: ' + error.message;
      setResponse(errorMessage);
      
      if (onError) {
        console.log('[useStreamingText] Calling onError callback');
        onError(error);
      }
      
      throw error;
    } finally {
      console.log('[useStreamingText] Stream processing finished, setting isLoading to false');
      setIsLoading(false);
    }
  }, []);

  /**
   * Reset the response state
   */
  const resetResponse = useCallback(() => {
    setResponse('');
    setIsLoading(false);
  }, []);

  return {
    response,
    isLoading,
    processStream,
    resetResponse
  };
}

