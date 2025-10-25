import { UserProfile, UNFILLED_MARKERS } from '../models/UserProfile.js';
import {
    createFieldQuestionPrompt,
    createFieldParsingPrompt,
    createFieldResponseConstraint,
    validateFieldData,
    fieldSchemas
} from './UserProfilePromptConfig.js';

/**
 * Service for iterative profile filling using two-step API calls
 */
export class IterativeProfileService {
    constructor(promptAPI) {
        this.promptAPI = promptAPI;
        this.conversationHistory = [];
        this.currentProfile = null;
        this.currentField = null;
        this.isProcessing = false;
    }

    /**
     * Initialize the service with a user profile
     * @param {UserProfile} profile - User profile to fill
     */
    initialize(profile) {
        this.currentProfile = profile;
        this.conversationHistory = [];
        this.currentField = null;
        this.isProcessing = false;
    }

    /**
     * Find the next unfilled field in the profile
     * @returns {string|null} Name of the next field to fill, or null if all fields are filled
     */
    findNextUnfilledField() {
        if (!this.currentProfile) {
            throw new Error('Profile not initialized');
        }

        // Get the main field names from fieldSchemas, not detailed sub-fields
        const allFields = Object.keys(fieldSchemas);
        
        for (const field of allFields) {
            // Special handling for timeWindow - check if both sub-fields are filled
            if (field === 'timeWindow') {
                if (!this.currentProfile.isFieldFilled(this.currentProfile.timeWindow.startHour) ||
                    !this.currentProfile.isFieldFilled(this.currentProfile.timeWindow.endHour)) {
                    return field;
                }
            } else if (field === 'preferredTransport') {
                if (this.currentProfile.preferredTransport === UNFILLED_MARKERS.ARRAY || 
                    this.currentProfile.preferredTransport.length === 0) {
                    return field;
                }
            } else if (field === 'interests' || field === 'dietary') {
                if (this.currentProfile[field] === UNFILLED_MARKERS.OBJECT || 
                    Object.keys(this.currentProfile[field]).length === 0) {
                    return field;
                }
            } else if (!this.currentProfile.isFieldFilled(this.currentProfile[field])) {
                return field;
            }
        }
        
        return null; // All fields filled
    }

    /**
     * Start the iterative filling process
     * @returns {Promise<{question: string, fieldName: string}>} The first question and field name
     */
    async startFilling() {
        if (this.isProcessing) {
            throw new Error('Already processing a field');
        }

        const nextField = this.findNextUnfilledField();
        if (!nextField) {
            return { question: null, fieldName: null, isComplete: true };
        }

        this.currentField = nextField;
        this.isProcessing = true;

        try {
            const question = await this.generateQuestion(nextField);
            return { question, fieldName: nextField, isComplete: false };
        } catch (error) {
            this.isProcessing = false;
            throw error;
        }
    }

    /**
     * Generate a question for a specific field
     * @param {string} fieldName - Name of the field to fill
     * @returns {Promise<string>} Generated question
     */
    async generateQuestion(fieldName) {
        const prompt = createFieldQuestionPrompt(fieldName, this.conversationHistory);
        
        console.log(`🤖 [QUESTION GENERATION] Field: ${fieldName}`);
        console.log(`📤 Sending prompt:`, prompt);
        
        try {
            const response = await this.promptAPI.prompt(prompt, {
                history: this.conversationHistory
            });

            console.log(`📥 Received response:`, response);

            // Add the question to conversation history
            this.conversationHistory.push({ role: 'assistant', content: response });
            
            return response;
        } catch (error) {
            console.error('❌ Error generating question:', error);
            throw new Error(`Failed to generate question for field ${fieldName}: ${error.message}`);
        }
    }

    /**
     * Process user's answer and update the profile
     * @param {string} userAnswer - User's answer to the question
     * @returns {Promise<{success: boolean, nextField: string|null, isComplete: boolean, error?: string}>}
     */
    async processAnswer(userAnswer) {
        if (!this.isProcessing || !this.currentField) {
            throw new Error('No field is currently being processed');
        }

        // Add user's answer to conversation history
        this.conversationHistory.push({ role: 'user', content: userAnswer });

        try {
            // Parse the answer into JSON
            const parsedData = await this.parseAnswer(this.currentField, userAnswer);
            
            // Validate the parsed data
            if (!validateFieldData(this.currentField, parsedData)) {
                throw new Error(`Invalid data for field ${this.currentField}`);
            }

            // Update the profile
            this.updateProfileField(this.currentField, parsedData[this.currentField]);

            // Check if there are more fields to fill
            const nextField = this.findNextUnfilledField();
            const isComplete = !nextField;

            this.isProcessing = false;
            this.currentField = null;

            return {
                success: true,
                nextField,
                isComplete,
                updatedField: this.currentField
            };

        } catch (error) {
            this.isProcessing = false;
            console.error('Error processing answer:', error);
            return {
                success: false,
                error: error.message,
                nextField: this.currentField,
                isComplete: false
            };
        }
    }

    /**
     * Parse user's answer into JSON for a specific field
     * @param {string} fieldName - Name of the field being filled
     * @param {string} userAnswer - User's answer
     * @returns {Promise<Object>} Parsed JSON data
     */
    async parseAnswer(fieldName, userAnswer) {
        const prompt = createFieldParsingPrompt(fieldName, this.conversationHistory);
        const responseConstraint = createFieldResponseConstraint(fieldName);
        
        console.log(`🔍 [ANSWER PARSING] Field: ${fieldName}`);
        console.log(`📤 Sending prompt:`, prompt);
        console.log(`📋 Response constraint:`, responseConstraint);
        console.log(`👤 User answer:`, userAnswer);
        
        const apiOptions = {
            history: this.conversationHistory,
            responseConstraint: responseConstraint
        };
        console.log(`🚀 [API CALL] Options being sent:`, JSON.stringify(apiOptions, null, 2));
        
        try {
            const response = await this.promptAPI.prompt(prompt, apiOptions);

            console.log(`📥 Received response:`, response);

            // Try to parse the JSON response
            const parsedData = JSON.parse(response);
            
            console.log(`✅ Parsed data:`, parsedData);
            
            // Ensure the response contains the expected field
            if (!parsedData.hasOwnProperty(fieldName)) {
                throw new Error(`Response does not contain field ${fieldName}`);
            }

            return parsedData;
        } catch (error) {
            console.error('❌ Error parsing answer:', error);
            throw new Error(`Failed to parse answer for field ${fieldName}: ${error.message}`);
        }
    }

    /**
     * Update a specific field in the profile
     * @param {string} fieldName - Name of the field to update
     * @param {any} value - Value to set
     */
    updateProfileField(fieldName, value) {
        if (!this.currentProfile) {
            throw new Error('Profile not initialized');
        }

        switch (fieldName) {
            case 'mobility':
                this.currentProfile.mobility = value;
                break;
            case 'avoidStairs':
                this.currentProfile.avoidStairs = value;
                break;
            case 'preferredTransport':
                this.currentProfile.preferredTransport = value;
                break;
            case 'interests':
                this.currentProfile.interests = value;
                break;
            case 'budgetLevel':
                this.currentProfile.budgetLevel = value;
                break;
            case 'travelPace':
                this.currentProfile.travelPace = value;
                break;
            case 'dietary':
                this.currentProfile.dietary = value;
                break;
            case 'timeWindow':
                this.currentProfile.timeWindow = value;
                break;
            default:
                throw new Error(`Unknown field: ${fieldName}`);
        }
    }

    /**
     * Get the current profile
     * @returns {UserProfile} Current profile
     */
    getCurrentProfile() {
        return this.currentProfile;
    }

    /**
     * Get conversation history
     * @returns {Array} Conversation history
     */
    getConversationHistory() {
        return [...this.conversationHistory];
    }

    /**
     * Get current field being processed
     * @returns {string|null} Current field name
     */
    getCurrentField() {
        return this.currentField;
    }

    /**
     * Check if currently processing a field
     * @returns {boolean} True if processing
     */
    isCurrentlyProcessing() {
        return this.isProcessing;
    }

    /**
     * Reset the service state
     */
    reset() {
        this.conversationHistory = [];
        this.currentField = null;
        this.isProcessing = false;
    }
}

export default IterativeProfileService;
