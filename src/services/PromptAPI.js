/**
 * PromptAPI class for working with Gemini Nano Language Model
 * Provides a unified interface for prompt-based interactions
 */
export class PromptAPI {
  constructor() {
    this.session = null;
  }

  /**
   * Check if the Language Model API is available
   * @returns {Promise<string>} 'available' | 'unavailable' | 'downloadable'
   */
  async checkAvailability() {
    try {
      if (!window.LanguageModel) {
        return 'unavailable';
      }
      
      const availability = await window.LanguageModel.availability();
      console.log('Language Model availability:', availability);
      return availability;
    } catch (error) {
      console.error('Error checking Language Model availability:', error);
      return 'unavailable';
    }
  }

  /**
   * Create a new Language Model session
   * @param {Object} options - Configuration options for the session
   * @returns {Promise<void>}
   */
  async createSession(options = {}) {
    try {
      if (await this.checkAvailability() === 'unavailable') {
        throw new Error('Language Model API is not available');
      }

      // Default options for Gemini Nano
      const defaultOptions = {
        // Add any default configuration here if needed
        ...options
      };

      this.session = await window.LanguageModel.create(defaultOptions);
      console.log('Language Model session created successfully');
    } catch (error) {
      console.error('Failed to create Language Model session:', error);
      throw error;
    }
  }

  /**
   * Send a prompt to the Language Model and get a streaming response
   * @param {string} prompt - The prompt text to send
   * @param {Object} options - Additional options for the prompt
   * @returns {Promise<AsyncIterable>} Streaming response
   */
  async promptStreaming(prompt, options = {}) {
    if (!this.session) {
      throw new Error('Language Model session not created. Please create a session first.');
    }

    try {
      const stream = await this.session.promptStreaming(prompt);
      return stream;
    } catch (error) {
      console.error('Error sending prompt:', error);
      throw error;
    }
  }

  /**
   * Destroy the current session
   * @returns {Promise<void>}
   */
  async destroySession() {
    if (this.session) {
      try {
        await this.session.destroy();
        console.log('Language Model session destroyed');
      } catch (error) {
        console.warn('Error destroying Language Model session:', error);
      } finally {
        this.session = null;
      }
    }
  }

  /**
   * Check if there's an active session
   * @returns {boolean}
   */
  hasActiveSession() {
    return this.session !== null;
  }

  /**
   * Get the provider name for display purposes
   * @returns {string}
   */
  getProviderName() {
    return 'Gemini Nano';
  }

  /**
   * Reset the session (destroy and recreate)
   * @param {Object} options - Options for the new session
   * @returns {Promise<void>}
   */
  async resetSession(options = {}) {
    await this.destroySession();
    await this.createSession(options);
  }

  /**
   * Send a prompt with automatic session management
   * Creates session if needed, sends prompt, returns stream
   * @param {string} prompt - The prompt text
   * @param {Object} options - Options for session creation and prompt
   * @returns {Promise<AsyncIterable>} Streaming response
   */
  async promptWithAutoSession(prompt, options = {}) {
    if (!this.hasActiveSession()) {
      await this.createSession(options);
    }
    
    return await this.promptStreaming(prompt, options);
  }
}

// Export default instance for convenience
export default PromptAPI;
