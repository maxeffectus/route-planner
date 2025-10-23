import { MobilityType, TransportMode, InterestCategory } from '../models/UserProfile';

/**
 * Structured Output Schema for Gemini API
 * Defines the schema for the model's required JSON response
 */
export const responseSchema = {
    type: "OBJECT",
    properties: {
        updatedProfile: {
            type: "OBJECT",
            description: "The complete UserProfile JSON object with the latest changes applied.",
            properties: {
                mobility: { type: "STRING", enum: Object.values(MobilityType) },
                avoidStairs: { type: "BOOLEAN" },
                preferredTransport: { 
                    type: "ARRAY", 
                    items: { type: "STRING", enum: Object.values(TransportMode) }
                },
                interests: { 
                    type: "OBJECT",
                    additionalProperties: { type: "NUMBER" },
                    description: "Map of InterestCategory to weight (0.0 to 1.0)."
                },
                budgetLevel: { type: "NUMBER", enum: [0, 1, 2, 3] },
                travelPace: { type: "STRING", enum: ['LOW', 'MEDIUM', 'HIGH'] },
                dietary: { 
                    type: "OBJECT", 
                    properties: {
                        vegan: { type: "BOOLEAN" },
                        vegetarian: { type: "BOOLEAN" },
                        glutenFree: { type: "BOOLEAN" },
                        halal: { type: "BOOLEAN" },
                        kosher: { type: "BOOLEAN" },
                        allergies: { type: "ARRAY", items: { type: "STRING" } }
                    }
                },
                timeWindow: {
                    type: "OBJECT",
                    properties: {
                        startHour: { type: "NUMBER" },
                        endHour: { type: "NUMBER" }
                    }
                }
            }
        },
        nextQuestion: {
            type: "STRING",
            description: "The next targeted question to ask the user, based on missing data."
        },
        isComplete: {
            type: "BOOLEAN",
            description: "True if all critical fields of the profile have been filled."
        }
    }
};

/**
 * System Instruction for the Model
 * Defines the AI's behavior for filling UserProfile data
 */
export const systemInstruction = [
  "You are an AI travel profile assistant. Your goal is to fill the user's UserProfile data using a friendly, conversational interview process.",
  "",
  "**Your core steps for every turn:**",
  "1. **Analyze:** Check the 'profileState' JSON for missing or default values (especially mobility, transport, pace, timeWindow, and interests).",
  "2. **Question:** Formulate *one* clear, targeted, and conversational question to fill the *most important* missing field first. Use the available ENUM values for guidance.",
  "3. **Update:** Based on the user's 'lastMessage', update the 'updatedProfile' JSON object. Be strict with data types (e.g., use 'WHEELCHAIR' for mobility, numbers for budget, 0.0 to 1.0 for interest weights). If the user lists interests, map them to the closest InterestCategory and set the weight to 1.0.",
  "4. **Completion:** If all critical fields are filled, set 'isComplete' to true and use the 'nextQuestion' field to provide a final polite summary and confirmation.",
  "5. **Output:** You MUST respond ONLY with a JSON object that strictly conforms to the provided schema. Do NOT include any commentary or chat text outside the 'nextQuestion' field of the JSON. DO NOT omit any fields from the JSON including 'isComplete'.",
  "",
  "**Current ENUM Values:**",
  `MobilityType: ${Object.values(MobilityType).join(', ')}`,
  `TransportMode: ${Object.values(TransportMode).join(', ')}`,
  `InterestCategory: ${Object.keys(InterestCategory).join(', ')}`,
  "TravelPace: LOW, MEDIUM, HIGH",
  "BudgetLevel: 0 (Free), 1 (Low), 2 (Medium), 3 (High)"
].join('\n');


/**
 * Helper function to validate AI response against schema
 * @param {Object} response - AI response to validate
 * @returns {boolean} True if response is valid
 */
export function validateUserProfileResponse(response) {
    try {
        // Basic validation - check required fields
        if (!response.updatedProfile || !response.nextQuestion || typeof response.isComplete !== 'boolean') {
            return false;
        }
        
        // Validate updatedProfile structure
        const profile = response.updatedProfile;
        
        // Check mobility enum
        if (profile.mobility && !Object.values(MobilityType).includes(profile.mobility)) {
            return false;
        }
        
        // Check transport modes
        if (profile.preferredTransport && Array.isArray(profile.preferredTransport)) {
            for (const transport of profile.preferredTransport) {
                if (!Object.values(TransportMode).includes(transport)) {
                    return false;
                }
            }
        }
        
        // Check budget level
        if (profile.budgetLevel !== null && ![0, 1, 2, 3].includes(profile.budgetLevel)) {
            return false;
        }
        
        // Check travel pace
        if (profile.travelPace && !['LOW', 'MEDIUM', 'HIGH'].includes(profile.travelPace)) {
            return false;
        }
        
        // Check time window
        if (profile.timeWindow) {
            const { startHour, endHour } = profile.timeWindow;
            if ((startHour !== null && (startHour < 0 || startHour > 23)) ||
                (endHour !== null && (endHour < 0 || endHour > 23))) {
                return false;
            }
        }
        
        return true;
    } catch (error) {
        console.error('Validation error:', error);
        return false;
    }
}

/**
 * Helper function to extract UserProfile data from AI response
 * @param {Object} response - Validated AI response
 * @returns {Object} UserProfile data ready for UserProfile constructor
 */
export function extractUserProfileData(response) {
    if (!validateUserProfileResponse(response)) {
        throw new Error('Invalid AI response format');
    }
    
    return response.updatedProfile;
}

/**
 * Default options for PromptAPI when working with UserProfile
 */
export const userProfilePromptOptions = {
    temperature: 0.7,
    topK: 40,
    maxOutputTokens: 1000
};

/**
 * Create a structured prompt for UserProfile conversation
 * @param {Object} profileState - Current UserProfile state
 * @param {string} lastMessage - User's last message
 * @param {Array} chatHistory - Previous conversation history
 * @returns {string} Formatted prompt
 */
export function createUserProfilePrompt(profileState, lastMessage, chatHistory = []) {
    return `**Context for Model:**
- profileState: ${JSON.stringify(profileState)}
- lastMessage: "${lastMessage}"
- chatHistory: ${JSON.stringify(chatHistory)}
**GOAL:** Generate the next JSON response.`;
}

// Export default configuration
export default {
    responseSchema,
    systemInstruction,
    userProfilePromptOptions,
    createUserProfilePrompt,
    validateUserProfileResponse,
    extractUserProfileData
};
