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

    setIsLoading(true);
    setResponse(initialMessage);

    try {
      let result = '';
      let previousChunk = '';

      for await (const chunk of stream) {
        // Handle incremental chunks - extract only the new part
        const newChunk = chunk.startsWith(previousChunk)
          ? chunk.slice(previousChunk.length)
          : chunk;
        
        result += newChunk;
        setResponse(result);
        previousChunk = chunk;
      }

      console.log('Stream complete. Total length:', result.length);
      
      if (onComplete) {
        onComplete(result);
      }

      return result;
    } catch (error) {
      console.error('Stream processing error:', error);
      const errorMessage = 'Error: ' + error.message;
      setResponse(errorMessage);
      
      if (onError) {
        onError(error);
      }
      
      throw error;
    } finally {
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

