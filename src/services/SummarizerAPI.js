/**
 * Summarizer API wrapper
 * Handles Chrome's Summarizer API interactions
 */
export class SummarizerAPI {
  constructor() {
    this.summarizer = null;
  }

  /**
   * Check if Summarizer API is available
   * @returns {Promise<string>} 'available', 'downloadable', or 'unavailable'
   */
  async checkAvailability() {
    console.log('[SummarizerAPI] Checking availability...');
    try {
      if (!window.Summarizer) {
        console.warn('[SummarizerAPI] Summarizer API is not available in this browser');
        return 'unavailable';
      }

      console.log('[SummarizerAPI] Calling window.Summarizer.availability()...');
      const availability = await window.Summarizer.availability();
      console.log('[SummarizerAPI] Availability check result:', availability);
      return availability;
    } catch (error) {
      console.error('[SummarizerAPI] Availability check error:', error);
      throw new Error('Failed to check Summarizer availability: ' + error.message);
    }
  }

  /**
   * Create a summarizer instance with given options
   * @param {Object} options - Creation options
   * @returns {Promise<Summarizer>} Summarizer instance
   * @private
   */
  async createSummarizer(options = {}) {
    console.log('[SummarizerAPI] Creating summarizer with options:', options);
    try {
        options = {
            sharedContext: `These are requests to summarize the traveler's needs and special requirements \
                in order to create a custom-tailored route. Pay special attention to accessibility requests: \
                our user could be a mother with a stroller, a disabled person in a wheelchair, \
                an elderly person, a colorblind person, a bicycle rider, etc.`,
            type: 'key-points',
            format: 'markdown',
            length: 'medium',
            expectedInputLanguages: ['en'],
            outputLanguage: 'en',
            expectedContextLanguages: ['en'],
            ...options,
        }
        console.log('[SummarizerAPI] Calling window.Summarizer.create()...');
        this.summarizer = await window.Summarizer.create(options);
        console.log('[SummarizerAPI] Summarizer created successfully');
    } catch (error) {
      console.error('[SummarizerAPI] Summarizer creation error:', error);
      throw new Error('Failed to create summarizer: ' + error.message);
    }
  }

  /**
   * Download the summarizer model
   * @param {Function} onProgress - Callback function for progress updates (receives progress value 0-100)
   * @param {Object} options - Creation options for the summarizer
   * @returns {Promise<void>}
   */
  async downloadModel(onProgress, options = {}) {
    console.log('[SummarizerAPI] Downloading model with options:', options);
    try {
      await this.createSummarizer({
        ...options,
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => {
            const progress = e.loaded * 100;
            console.log(`[SummarizerAPI] Downloaded ${progress.toFixed(1)}%`);
            if (onProgress) {
              onProgress(progress);
            }
          });
        }
      });
      console.log('[SummarizerAPI] Summarizer model downloaded successfully');
    } catch (error) {
      console.error('[SummarizerAPI] Model download error:', error);
      throw new Error('Failed to download summarizer model: ' + error.message);
    }
  }

  /**
   * Summarize text using streaming
   * @param {string} text - The text to summarize
   * @param {Object} options - Summarization options
   * @param {string} options.context - Additional context for the summarization
   * @param {string} options.sharedContext - Shared context across summarizations
   * @param {string} options.type - Type of summary (default: "key-points")
   * @param {string} options.format - Output format (default: "markdown")
   * @param {string} options.length - Summary length (default: "medium")
   * @returns {Promise<AsyncIterable>} Streaming summary
   */
  async summarizeText(text, options = {}) {
    console.log('[SummarizerAPI] Summarizing text, length:', text.length);
    if (!this.summarizer) {
      console.error('[SummarizerAPI] No summarizer session, cannot summarize');
      throw new Error('Summarizer session not created. Please create a session first.');
    }
    
    try {
      // Merge with defaults for streaming options
      const streamOptions = {
        context: 'This article is intended for identifying travelers needs and interests.',
        ...options
      };
      console.log('[SummarizerAPI] Calling summarizeStreaming with options:', streamOptions);
      
      const stream = this.summarizer.summarizeStreaming(text, streamOptions);
      console.log('[SummarizerAPI] Stream received, returning...');
      return stream;
    } catch (error) {
      console.error('[SummarizerAPI] Summarization error:', error);
      throw new Error('Summarization failed: ' + error.message);
    }
  }

  /**
   * Check if summarizer session is active
   * @returns {boolean}
   */
  hasActiveSession() {
    return this.summarizer !== null;
  }

  /**
   * Destroy the summarizer instance and free up resources
   * @returns {Promise<void>}
   */
  async destroySummarizer() {
    console.log('[SummarizerAPI] Destroying summarizer...');
    if (this.summarizer) {
      try {
        await this.summarizer.destroy();
        console.log('[SummarizerAPI] Summarizer instance destroyed successfully');
      } catch (error) {
        console.warn('[SummarizerAPI] Error destroying summarizer:', error);
      }
      this.summarizer = null;
    } else {
      console.log('[SummarizerAPI] No summarizer instance to destroy');
    }
  }

  /**
   * Get the provider name
   * @returns {string}
   */
  getProviderName() {
    return 'Chrome Summarizer API';
  }
}

