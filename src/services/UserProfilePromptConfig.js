import { MobilityType, TransportMode, InterestCategory, UNFILLED_MARKERS } from '../models/UserProfile.js';

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
  "1. **Analyze:** Check the 'profileState' JSON for unfilled fields (fields with values like '__UNFILLED__', -999, '__EMPTY_ARRAY__', '__EMPTY_OBJECT__', or null for boolean fields). These indicate fields that haven't been filled by AI yet.",
  "2. **Question:** Formulate *one* clear, targeted, and conversational question to fill the *most important* unfilled field first. Use the available ENUM values for guidance. Any enums, constants, or other non-textual information should be replaced with their human-readable equivalents.",
  "3. **Update:** Based on the user's 'lastMessage', update the provided 'profileState' JSON object and save the updated JSON object to 'updatedProfile'. Be strict with data types (e.g., use 'WHEELCHAIR' for mobility, numbers for budget, 0.0 to 1.0 for interest weights). If the user lists interests, map them to the closest InterestCategory and set the weight to 1.0. If the user provides a time window, convert it to the startHour and endHour fields in the timeWindow object. For dietary preferences, create a proper DietaryPreference object with boolean flags. ALWAYS include the complete updatedProfile object in your response.",
  "4. **Output:** You MUST respond ONLY with a JSON object that strictly conforms to the provided schema. Do NOT include any commentary or chat text outside the 'nextQuestion' field of the JSON. The response MUST contain BOTH 'updatedProfile' and 'nextQuestion' fields.",
  "",
  "**Current ENUM Values:**",
  `MobilityType: ${Object.values(MobilityType).join(', ')}`,
  `TransportMode: ${Object.values(TransportMode).join(', ')}`,
  `InterestCategory: ${Object.keys(InterestCategory).join(', ')}`,
  "TravelPace: LOW, MEDIUM, HIGH",
  "BudgetLevel: 0 (Free), 1 (Low), 2 (Medium), 3 (High)",
  "",
  "**Unfilled Field Markers:**",
  `String fields: ${UNFILLED_MARKERS.STRING}`,
  `Number fields: ${UNFILLED_MARKERS.NUMBER}`,
  `Boolean fields: ${UNFILLED_MARKERS.BOOLEAN}`,
  `Array fields: ${UNFILLED_MARKERS.ARRAY}`,
  `Object fields: ${UNFILLED_MARKERS.OBJECT}`,
  "",
  "**Important Notes:**",
  "- When filling interests, create an object with InterestCategory keys and weight values (0.0 to 1.0)",
  "- When filling dietary preferences, create a DietaryPreference object with boolean flags for vegan, vegetarian, glutenFree, halal, kosher, and an allergies array",
  "- All fields must be filled for the profile to be considered complete"
].join('\n');


/**
 * Helper function to validate AI response against schema
 * @param {Object} response - AI response to validate
 * @returns {boolean} True if response is valid
 */
export function validateUserProfileResponse(response) {
    try {
        // Basic validation - check required fields
        if (!response.updatedProfile || !response.nextQuestion) {
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
        if (profile.budgetLevel !== null && profile.budgetLevel !== UNFILLED_MARKERS.NUMBER && ![0, 1, 2, 3].includes(profile.budgetLevel)) {
            return false;
        }
        
        // Check travel pace
        if (profile.travelPace && profile.travelPace !== UNFILLED_MARKERS.STRING && !['LOW', 'MEDIUM', 'HIGH'].includes(profile.travelPace)) {
            return false;
        }
        
        // Check time window
        if (profile.timeWindow) {
            const { startHour, endHour } = profile.timeWindow;
            if ((startHour !== null && startHour !== UNFILLED_MARKERS.NUMBER && (startHour < 0 || startHour > 23)) ||
                (endHour !== null && endHour !== UNFILLED_MARKERS.NUMBER && (endHour < 0 || endHour > 23))) {
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
    temperature: 0.0,
    topK: 1,
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
    return `
- profileState: ${JSON.stringify(profileState)}
- lastMessage: "${lastMessage}"
- chatHistory: ${JSON.stringify(chatHistory)}
**GOAL:** Generate the next JSON response according to the response schema.`;
}

/**
 * Create a prompt for generating profile summary
 * @param {Object} profileData - Complete UserProfile data
 * @returns {string} Formatted prompt for summary generation
 */
export function createProfileSummaryPrompt(profileData) {
    return `Please create a brief, human-readable summary of this travel profile:

${JSON.stringify(profileData, null, 2)}

The summary should be:
- Friendly and conversational
- Highlight the key preferences and needs
- Mention any special requirements (mobility, dietary, etc.)
- Be concise but informative
- Written in third person (as if describing the traveler)

Example format: "You are a [mobility] traveler who prefers [transport] and enjoys [interests]. You have [dietary] dietary requirements and typically travel during [time window]. Your budget level is [budget] and you prefer a [pace] travel pace."

Please respond with ONLY the summary text, no additional formatting or commentary. Any enums, constants, or other non-textual information should be replaced with their human-readable equivalents.`;
}

/**
 * Field-specific schemas for individual field processing
 */
export const fieldSchemas = {
    mobility: {
        type: "string",
        enum: Object.values(MobilityType),
        description: "User's mobility type"
    },
    avoidStairs: {
        type: "boolean",
        description: "Whether user wants to avoid stairs"
    },
    preferredTransport: {
        type: "array",
        items: { type: "string", enum: Object.values(TransportMode) },
        description: "Preferred transportation modes"
    },
    interests: {
        type: "object",
        additionalProperties: { type: "number" },
        description: "Map of InterestCategory to weight (0.0 to 1.0)"
    },
    budgetLevel: {
        type: "number",
        enum: [0, 1, 2, 3],
        description: "Budget level: 0=Free, 1=Low, 2=Medium, 3=High"
    },
    travelPace: {
        type: "string",
        enum: ['LOW', 'MEDIUM', 'HIGH'],
        description: "Travel pace preference"
    },
    dietary: {
        type: "object",
        properties: {
            vegan: { type: "boolean" },
            vegetarian: { type: "boolean" },
            glutenFree: { type: "boolean" },
            halal: { type: "boolean" },
            kosher: { type: "boolean" },
            allergies: { type: "array", items: { type: "string" } }
        },
        description: "Dietary preferences and restrictions"
    },
    timeWindow: {
        type: "object",
        properties: {
            startHour: { type: "number" },
            endHour: { type: "number" }
        },
        description: "Preferred time window for activities"
    }
};

/**
 * Create a prompt for generating a question for a specific field
 * @param {string} fieldName - Name of the field to fill
 * @param {Array} conversationHistory - Previous conversation history
 * @returns {string} Formatted prompt for question generation
 */
export function createFieldQuestionPrompt(fieldName, conversationHistory = []) {
    const fieldSchema = fieldSchemas[fieldName];
    if (!fieldSchema) {
        throw new Error(`Unknown field: ${fieldName}`);
    }

    return `You are a travel assistant helping to fill out a user profile.
I need to get information from the user for the field "${fieldName}".
Field schema: ${JSON.stringify(fieldSchema)}.

Please ask the user *one* simple and friendly question to get the needed information.
The question should be clear and specific.

Available values for reference:
${getFieldValueHints(fieldName)}

IMPORTANT: Respond with ONLY the question text, no JSON, no additional comments, no formatting. Just the question itself.`;
}

/**
 * Create a prompt for parsing user's answer into JSON for a specific field
 * @param {string} fieldName - Name of the field being filled
 * @param {Array} conversationHistory - Full conversation history including the question and answer
 * @returns {string} Formatted prompt for answer parsing
 */
export function createFieldParsingPrompt(fieldName, conversationHistory = []) {
    const fieldSchema = fieldSchemas[fieldName];
    if (!fieldSchema) {
        throw new Error(`Unknown field: ${fieldName}`);
    }

    return `Analyze the *last user response* in the conversation history.
The user is answering a question about the field "${fieldName}".

Field schema: ${JSON.stringify(fieldSchema)}

Your task: Return a JSON object containing *only* this field and its value, strictly following the schema.
Your response must be *only* valid JSON and nothing else.

Examples:
- For field 'mobility': { "mobility": "WHEELCHAIR" }
- For field 'avoidStairs': { "avoidStairs": true }
- For field 'budgetLevel': { "budgetLevel": 2 }
- For field 'travelPace': { "travelPace": "MEDIUM" }
- For field 'preferredTransport': { "preferredTransport": ["walk", "public_transit"] }
- For field 'interests': { "interests": { "nature_parks": 1.0, "gastronomy": 0.7 } }
- For field 'dietary': { "dietary": { "vegan": false, "vegetarian": true, "glutenFree": false, "halal": false, "kosher": false, "allergies": [] } }
- For field 'timeWindow': { "timeWindow": { "startHour": 9, "endHour": 18 } }

Respond with ONLY JSON, no additional comments.`;
}

/**
 * Get helpful hints for field values
 * @param {string} fieldName - Name of the field
 * @returns {string} Formatted hints
 */
function getFieldValueHints(fieldName) {
    switch (fieldName) {
        case 'mobility':
            return `MobilityType: ${Object.values(MobilityType).join(', ')}`;
        case 'preferredTransport':
            return `TransportMode: ${Object.values(TransportMode).join(', ')}`;
        case 'interests':
            return `InterestCategory: ${Object.keys(InterestCategory).join(', ')}`;
        case 'budgetLevel':
            return 'BudgetLevel: 0 (Free), 1 (Low), 2 (Medium), 3 (High)';
        case 'travelPace':
            return 'TravelPace: LOW, MEDIUM, HIGH';
        case 'dietary':
            return 'Dietary options: vegan, vegetarian, glutenFree, halal, kosher, allergies';
        case 'timeWindow':
            return 'Time format: hours from 0 to 23 (e.g., 9 for 9:00 AM, 18 for 6:00 PM)';
        default:
            return '';
    }
}

/**
 * Create a response constraint schema for a specific field
 * @param {string} fieldName - Name of the field
 * @returns {Object} Response constraint schema
 */
export function createFieldResponseConstraint(fieldName) {
    const fieldSchema = fieldSchemas[fieldName];
    if (!fieldSchema) {
        throw new Error(`Unknown field: ${fieldName}`);
    }

    return {
        type: "object",
        properties: {
            [fieldName]: fieldSchema
        },
        required: [fieldName],
        additionalProperties: false
    };
}

/**
 * Validate parsed field data against its schema
 * @param {string} fieldName - Name of the field
 * @param {Object} data - Parsed data to validate
 * @returns {boolean} True if data is valid
 */
export function validateFieldData(fieldName, data) {
    const fieldSchema = fieldSchemas[fieldName];
    if (!fieldSchema) {
        return false;
    }

    try {
        // Basic validation based on field type
        switch (fieldName) {
            case 'mobility':
                return Object.values(MobilityType).includes(data[fieldName]);
            case 'avoidStairs':
                return typeof data[fieldName] === 'boolean';
            case 'preferredTransport':
                return Array.isArray(data[fieldName]) && 
                       data[fieldName].every(mode => Object.values(TransportMode).includes(mode));
            case 'budgetLevel':
                return [0, 1, 2, 3].includes(data[fieldName]);
            case 'travelPace':
                return ['LOW', 'MEDIUM', 'HIGH'].includes(data[fieldName]);
            case 'interests':
                return typeof data[fieldName] === 'object' && 
                       Object.values(data[fieldName]).every(weight => 
                           typeof weight === 'number' && weight >= 0 && weight <= 1);
            case 'dietary':
                const dietary = data[fieldName];
                return typeof dietary === 'object' &&
                       typeof dietary.vegan === 'boolean' &&
                       typeof dietary.vegetarian === 'boolean' &&
                       typeof dietary.glutenFree === 'boolean' &&
                       typeof dietary.halal === 'boolean' &&
                       typeof dietary.kosher === 'boolean' &&
                       Array.isArray(dietary.allergies);
            case 'timeWindow':
                const timeWindow = data[fieldName];
                return typeof timeWindow === 'object' &&
                       typeof timeWindow.startHour === 'number' &&
                       typeof timeWindow.endHour === 'number' &&
                       timeWindow.startHour >= 0 && timeWindow.startHour <= 23 &&
                       timeWindow.endHour >= 0 && timeWindow.endHour <= 23;
            default:
                return false;
        }
    } catch (error) {
        console.error('Validation error:', error);
        return false;
    }
}

// Export default configuration
export default {
    responseSchema,
    systemInstruction,
    userProfilePromptOptions,
    createUserProfilePrompt,
    createProfileSummaryPrompt,
    validateUserProfileResponse,
    extractUserProfileData,
    fieldSchemas,
    createFieldQuestionPrompt,
    createFieldParsingPrompt,
    createFieldResponseConstraint,
    validateFieldData
};
