import { MobilityType, TransportMode, InterestCategory, UNFILLED_MARKERS } from '../models/UserProfile.js';

/**
 * Configuration for simple profile setup with predefined questions and answers
 */
export const profileQuestions = [
    {
        field: 'mobility',
        question: 'How would you describe your mobility needs for this trip?',
        type: 'single-choice',
        options: [
            { value: MobilityType.STANDARD, label: 'Standard mobility - I can walk normally and climb stairs' },
            { value: MobilityType.WHEELCHAIR, label: 'Wheelchair user - I use a wheelchair for mobility' },
            { value: MobilityType.STROLLER, label: 'Traveling with stroller - I need stroller-accessible routes' },
            { value: MobilityType.LOW_ENDURANCE, label: 'Low endurance - I prefer shorter walks and fewer stairs' }
        ]
    },
    {
        field: 'avoidStairs',
        question: 'Would you prefer to avoid stairs when possible?',
        type: 'single-choice',
        options: [
            { value: true, label: 'Yes, please avoid stairs' },
            { value: false, label: 'No, stairs are fine' }
        ],
        condition: (profile) => profile.mobility === MobilityType.STANDARD
    },
    {
        field: 'preferredTransport',
        question: 'What transportation methods do you prefer? (Select all that apply)',
        type: 'multi-choice',
        options: [
            { value: TransportMode.WALK, label: 'Walking' },
            { value: TransportMode.BIKE, label: 'Bicycle' },
            { value: TransportMode.PUBLIC_TRANSIT, label: 'Public transit (bus, metro, train)' },
            { value: TransportMode.CAR_TAXI, label: 'Car or Taxi' }
        ]
    },
    {
        field: 'budgetLevel',
        question: 'What is your budget level for this trip?',
        type: 'single-choice',
        options: [
            { value: 0, label: 'Free/Low cost - Prefer free activities and budget accommodations' },
            { value: 1, label: 'Low budget - Looking for affordable options' },
            { value: 2, label: 'Medium budget - Comfortable with moderate spending' },
            { value: 3, label: 'High budget - Money is not a major concern' }
        ]
    },
    {
        field: 'travelPace',
        question: 'What pace do you prefer for your travels?',
        type: 'single-choice',
        options: [
            { value: 'LOW', label: 'Relaxed - Take it slow, lots of breaks' },
            { value: 'MEDIUM', label: 'Moderate - Balanced pace with some rest' },
            { value: 'HIGH', label: 'Active - Pack in as much as possible' }
        ]
    },
    {
        field: 'interests',
        question: 'What types of activities interest you most? (Select all that apply)',
        type: 'multi-choice',
        options: [
            { value: InterestCategory.NATURE_PARKS, label: 'Nature & Parks' },
            { value: InterestCategory.ART_MUSEUMS, label: 'Art & Museums' },
            { value: InterestCategory.HISTORY_CULTURE, label: 'History & Culture' },
            { value: InterestCategory.GASTRONOMY, label: 'Food & Dining' },
            { value: InterestCategory.SHOPPING, label: 'Shopping' },
            { value: InterestCategory.NIGHTLIFE, label: 'Nightlife & Entertainment' },
            { value: InterestCategory.SPORT_FITNESS, label: 'Sports & Recreation' },
            { value: InterestCategory.ARCHITECTURE, label: 'Architecture & Landmarks' }
        ]
    },
    {
        field: 'dietary',
        question: 'Do you have any dietary preferences or restrictions?',
        type: 'dietary-form',
        options: [
            { key: 'vegan', label: 'Vegan' },
            { key: 'vegetarian', label: 'Vegetarian' },
            { key: 'glutenFree', label: 'Gluten-free' },
            { key: 'halal', label: 'Halal' },
            { key: 'kosher', label: 'Kosher' }
        ],
        allergiesPrompt: 'Do you have any food allergies? (Enter them separated by commas, or leave blank if none)'
    },
    {
        field: 'timeWindow',
        question: 'What are your preferred hours for activities?',
        type: 'time-range',
        options: {
            startHour: { label: 'Start time (hour)', min: 0, max: 23 },
            endHour: { label: 'End time (hour)', min: 0, max: 23 }
        }
    }
];

/**
 * Get current value for a field from profile
 * @param {UserProfile} profile - User profile
 * @param {string} fieldName - Name of the field
 * @returns {*} Current value of the field
 */
export function getCurrentFieldValue(profile, fieldName) {
    switch (fieldName) {
        case 'mobility':
        case 'avoidStairs':
        case 'budgetLevel':
        case 'travelPace':
            return profile.isFieldFilled(profile[fieldName]) ? profile[fieldName] : null;
            
        case 'preferredTransport':
            return (profile.preferredTransport !== UNFILLED_MARKERS.ARRAY && profile.preferredTransport.length > 0) 
                ? [...profile.preferredTransport] : [];
                   
        case 'interests':
            return (profile.interests !== UNFILLED_MARKERS.OBJECT && Object.keys(profile.interests).length > 0) 
                ? Object.keys(profile.interests) : [];
                   
        case 'dietary':
            if (profile.dietary !== UNFILLED_MARKERS.OBJECT && Object.keys(profile.dietary).length > 0) {
                return {
                    vegan: profile.dietary.vegan || false,
                    vegetarian: profile.dietary.vegetarian || false,
                    glutenFree: profile.dietary.glutenFree || false,
                    halal: profile.dietary.halal || false,
                    kosher: profile.dietary.kosher || false,
                    allergies: profile.dietary.allergies ? profile.dietary.allergies.join(', ') : ''
                };
            }
            return {
                vegan: false,
                vegetarian: false,
                glutenFree: false,
                halal: false,
                kosher: false,
                allergies: ''
            };
                   
        case 'timeWindow':
            if (profile.isFieldFilled(profile.timeWindow.startHour) && profile.isFieldFilled(profile.timeWindow.endHour)) {
                return {
                    startHour: profile.timeWindow.startHour,
                    endHour: profile.timeWindow.endHour
                };
            }
            return { startHour: 9, endHour: 18 };
                   
        default:
            return null;
    }
}

/**
 * Get all questions for profile setup (including filled ones for editing)
 * @param {UserProfile} profile - Current user profile
 * @returns {Array} Array of question configurations
 */
export function getAllQuestions(profile) {
    return profileQuestions.filter(questionConfig => {
        // Always include questions that have conditions (like avoidStairs)
        if (questionConfig.condition) {
            return true;
        }
        
        // For other questions, include them if the field is unfilled OR if we're editing
        return true; // Always include for editing mode
    });
}

/**
 * Get the next question based on current profile state
 * @param {UserProfile} profile - Current user profile
 * @returns {Object|null} Next question configuration or null if all filled
 */
export function getNextQuestion(profile) {
    for (const questionConfig of profileQuestions) {
        const field = questionConfig.field;
        
        // Check if question has a condition and if it's met
        if (questionConfig.condition && !questionConfig.condition(profile)) {
            // Skip this question if condition is not met
            continue;
        }
        
        // Check if field is unfilled
        if (isFieldUnfilled(profile, field)) {
            return questionConfig;
        }
    }
    
    return null; // All fields filled
}

/**
 * Check if a specific field is unfilled
 * @param {UserProfile} profile - User profile to check
 * @param {string} fieldName - Name of the field to check
 * @returns {boolean} True if field is unfilled
 */
function isFieldUnfilled(profile, fieldName) {
    switch (fieldName) {
        case 'mobility':
        case 'avoidStairs':
        case 'budgetLevel':
        case 'travelPace':
            return !profile.isFieldFilled(profile[fieldName]);
            
        case 'preferredTransport':
            return profile.preferredTransport === UNFILLED_MARKERS.ARRAY || 
                   profile.preferredTransport.length === 0;
                   
        case 'interests':
        case 'dietary':
            return profile[fieldName] === UNFILLED_MARKERS.OBJECT || 
                   Object.keys(profile[fieldName]).length === 0;
                   
        case 'timeWindow':
            return !profile.isFieldFilled(profile.timeWindow.startHour) ||
                   !profile.isFieldFilled(profile.timeWindow.endHour);
                   
        default:
            return true;
    }
}

/**
 * Process user's answer and update the profile
 * @param {UserProfile} profile - Profile to update
 * @param {string} fieldName - Field being updated
 * @param {any} answer - User's answer
 * @returns {boolean} True if answer was processed successfully
 */
export function processAnswer(profile, fieldName, answer) {
    try {
        switch (fieldName) {
            case 'mobility':
                profile[fieldName] = answer;
                // Automatically set avoidStairs based on mobility type
                if (answer !== MobilityType.STANDARD) {
                    profile.avoidStairs = true;
                } else {
                    // For standard mobility, set to false by default (user can change later)
                    profile.avoidStairs = false;
                }
                break;
            case 'avoidStairs':
            case 'budgetLevel':
            case 'travelPace':
                profile[fieldName] = answer;
                break;
                
            case 'preferredTransport':
                profile.preferredTransport = Array.isArray(answer) ? answer : [answer];
                break;
                
            case 'interests':
                if (profile.interests === UNFILLED_MARKERS.OBJECT) {
                    profile.interests = {};
                }
                // Clear existing interests first
                profile.interests = {};
                // Handle both array and object answers
                if (Array.isArray(answer)) {
                    answer.forEach(interest => {
                        profile.interests[interest] = 1.0;
                    });
                } else if (typeof answer === 'object') {
                    // Direct object assignment
                    Object.assign(profile.interests, answer);
                }
                break;
                
            case 'dietary':
                if (profile.dietary === UNFILLED_MARKERS.OBJECT) {
                    profile.dietary = {
                        vegan: false,
                        vegetarian: false,
                        glutenFree: false,
                        halal: false,
                        kosher: false,
                        allergies: []
                    };
                }
                
                if (typeof answer === 'object') {
                    Object.assign(profile.dietary, answer);
                }
                break;
                
            case 'timeWindow':
                if (typeof answer === 'object' && answer.startHour !== undefined && answer.endHour !== undefined) {
                    // Validate that endHour > startHour
                    if (answer.endHour <= answer.startHour) {
                        console.warn('Invalid time window: endHour must be greater than startHour');
                        return false;
                    }
                    profile.timeWindow.startHour = answer.startHour;
                    profile.timeWindow.endHour = answer.endHour;
                }
                break;
                
            default:
                console.warn(`Unknown field: ${fieldName}`);
                return false;
        }
        
        return true;
    } catch (error) {
        console.error(`Error processing answer for field ${fieldName}:`, error);
        return false;
    }
}

/**
 * Get completion percentage
 * @param {UserProfile} profile - Profile to check
 * @returns {number} Completion percentage (0-100)
 */
export function getCompletionPercentage(profile) {
    let totalFields = 0;
    let filledFields = 0;
    
    for (const questionConfig of profileQuestions) {
        // Check if question has a condition and if it's met
        if (questionConfig.condition && !questionConfig.condition(profile)) {
            // Skip this question if condition is not met
            continue;
        }
        
        totalFields++;
        
        if (!isFieldUnfilled(profile, questionConfig.field)) {
            filledFields++;
        }
    }
    
    return totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 100;
}
