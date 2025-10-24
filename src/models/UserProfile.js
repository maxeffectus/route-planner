/**
 * The UserProfile class for structured storage of traveler data.
 * This data is used to create optimal and customized routes.
 */

// --- 1. ENUMS and CONSTANTS for compactness and clarity ---

/**
 * Special marker values that indicate a field has not been filled by AI yet.
 * These values are clearly distinguishable from any valid user data.
 */
export const UNFILLED_MARKERS = {
    // For string fields that can be null or have specific values
    STRING: '__UNFILLED__',
    // For numeric fields (budget level, hours)
    NUMBER: -999,
    // For boolean fields
    BOOLEAN: null, // Keep null for boolean as it's clear enough
    // For array fields
    ARRAY: '__EMPTY_ARRAY__',
    // For object fields
    OBJECT: '__EMPTY_OBJECT__'
};

/**
 * Defines the user's main mobility factor,
 * critical for assessing the accessibility of POIs and routes (e.g., stairs, slopes).
 */
export const MobilityType = {
    // Does not require special conditions (standard mobility).
    STANDARD: 'standard',
    // The user uses a wheelchair or other mobility aids.
    WHEELCHAIR: 'wheelchair',
    // Family with a small child (requires stroller accessibility).
    STROLLER: 'stroller',
    // Elderly person or person with limited stamina (consider short distances, more rest areas).
    LOW_ENDURANCE: 'low_endurance',
};

/**
 * Defines preferred travel modes,
 * which will be used to calculate route segments.
 */
export const TransportMode = {
    // Only on foot (the route must be pedestrian-friendly).
    WALK: 'walk',
    // Bicycle or scooter (requires bike path/safe route).
    BIKE: 'bike',
    // Public transport (bus, subway, tram).
    PUBLIC_TRANSIT: 'public_transit',
    // Taxi or private car (routes between POIs, consider parking).
    CAR_TAXI: 'car_taxi',
};

/**
 * Defines the main interest categories that will be matched with POIs.
 * Used as keys in the map with weights.
 */
export const InterestCategory = {
    HISTORY_CULTURE: 'history_culture',
    ART_MUSEUMS: 'art_museums',
    ARCHITECTURE: 'architecture',
    NATURE_PARKS: 'nature_parks',
    ENTERTAINMENT: 'entertainment', // Entertainment, attractions, cinema
    NIGHTLIFE: 'nightlife',
    GASTRONOMY: 'gastronomy', // Restaurants, cafes, street food
    SHOPPING: 'shopping',
    // Additional interests:
    SPORT_FITNESS: 'sport_fitness',
    TECHNOLOGY: 'technology',
};

/**
 * Interface for dietary preferences (can affect restaurant choices).
 */
export class DietaryPreference {
    constructor() {
        this.vegan = false;
        this.vegetarian = false;
        this.glutenFree = false;
        this.halal = false;
        this.kosher = false;
        this.allergies = []; // List of allergens
    }
}

// --- 2. PROFILE CLASS ---

export class UserProfile {
    /**
     * Unique user identifier (for FireStore/database).
     */
    userId;

    /**
     * Main mobility factor.
     * Defines general route accessibility requirements.
     */
    mobility;

    /**
     * Boolean flag: whether to avoid stairs and steep slopes,
     * even if the main MobilityType is STANDARD (e.g., due to a minor injury).
     */
    avoidStairs;

    /**
     * Suggested travel modes and their priority (in descending order).
     */
    preferredTransport;

    /**
     * Structure for storing interests and their "weight" or "priority" (from 0.0 to 1.0).
     * A higher value means more POIs of this category should be included in the route.
     */
    interests;

    /**
     * Budget constraints for visiting POIs (e.g., entrance ticket costs).
     * 0: Free only, 1: Low, 2: Medium, 3: High
     */
    budgetLevel;

    /**
     * Desired travel pace.
     * HIGH: Many POIs, little time for each.
     * MEDIUM: Optimal number of POIs, comfortable time.
     * LOW: Few POIs, plenty of time for rest and relaxation.
     */
    travelPace;

    /**
     * Dietary preferences.
     */
    dietary;

    /**
     * Time constraints (e.g., "not earlier than 10:00" or "not later than 22:00").
     * Stored in hour format (0-23).
     */
    timeWindow;

    constructor(userId) {
        this.userId = userId;
        this.mobility = UNFILLED_MARKERS.STRING; // Will be determined by AI questions
        this.avoidStairs = UNFILLED_MARKERS.BOOLEAN; // Will be determined by AI questions
        this.preferredTransport = UNFILLED_MARKERS.ARRAY; // Will be filled based on user preferences
        this.interests = UNFILLED_MARKERS.OBJECT; // Will be filled based on user preferences
        this.budgetLevel = UNFILLED_MARKERS.NUMBER; // Will be determined by AI questions
        this.travelPace = UNFILLED_MARKERS.STRING; // Will be determined by AI questions
        this.dietary = UNFILLED_MARKERS.OBJECT; // Will be determined by AI questions
        this.timeWindow = {
            startHour: UNFILLED_MARKERS.NUMBER, // Will be determined by AI questions
            endHour: UNFILLED_MARKERS.NUMBER    // Will be determined by AI questions
        };
    }

    /**
     * Method for setting the interest weight.
     * If interests is still using the unfilled marker, initialize it as an empty object first.
     */
    setInterestWeight(category, weight) {
        if (this.interests === UNFILLED_MARKERS.OBJECT) {
            this.interests = {};
        }
        this.interests[category] = Math.max(0, Math.min(1, weight)); // Restrict weight between 0 and 1
    }

    /**
     * Check if a field has been filled by AI (not using unfilled markers)
     */
    isFieldFilled(value) {
        if (value === UNFILLED_MARKERS.STRING || 
            value === UNFILLED_MARKERS.NUMBER || 
            value === UNFILLED_MARKERS.BOOLEAN || 
            value === UNFILLED_MARKERS.ARRAY || 
            value === UNFILLED_MARKERS.OBJECT) {
            return false;
        }
        return true;
    }

    /**
     * Check if profile is complete (all required fields filled)
     */
    isComplete() {
        return this.isFieldFilled(this.mobility) &&
               this.isFieldFilled(this.budgetLevel) &&
               this.isFieldFilled(this.travelPace) &&
               this.isFieldFilled(this.timeWindow.startHour) &&
               this.isFieldFilled(this.timeWindow.endHour) &&
               this.preferredTransport !== UNFILLED_MARKERS.ARRAY && 
               this.preferredTransport.length > 0 &&
               this.interests !== UNFILLED_MARKERS.OBJECT &&
               this.dietary !== UNFILLED_MARKERS.OBJECT;
    }

    /**
     * Get missing fields that need to be filled
     */
    getMissingFields() {
        const missing = [];
        if (!this.isFieldFilled(this.mobility)) missing.push('mobility');
        if (!this.isFieldFilled(this.budgetLevel)) missing.push('budgetLevel');
        if (!this.isFieldFilled(this.travelPace)) missing.push('travelPace');
        if (!this.isFieldFilled(this.timeWindow.startHour)) missing.push('timeWindow.startHour');
        if (!this.isFieldFilled(this.timeWindow.endHour)) missing.push('timeWindow.endHour');
        if (this.preferredTransport === UNFILLED_MARKERS.ARRAY || this.preferredTransport.length === 0) missing.push('preferredTransport');
        if (this.interests === UNFILLED_MARKERS.OBJECT) missing.push('interests');
        if (this.dietary === UNFILLED_MARKERS.OBJECT) missing.push('dietary');
        return missing;
    }

    /**
     * Get completion percentage (0-100)
     */
    getCompletionPercentage() {
        const totalFields = 8; // mobility, budgetLevel, travelPace, timeWindow.startHour, timeWindow.endHour, preferredTransport, interests, dietary
        const filledFields = totalFields - this.getMissingFields().length;
        return Math.round((filledFields / totalFields) * 100);
    }

    /**
     * Get suggested questions for AI to ask based on missing fields
     */
    getSuggestedQuestions() {
        const questions = [];
        
        if (!this.isFieldFilled(this.mobility)) {
            questions.push({
                field: 'mobility',
                question: 'What is your mobility situation? Do you use a wheelchair, travel with a stroller, have limited endurance, or have standard mobility?',
                options: [
                    { value: MobilityType.STANDARD, label: 'Standard mobility' },
                    { value: MobilityType.WHEELCHAIR, label: 'Wheelchair user' },
                    { value: MobilityType.STROLLER, label: 'Traveling with stroller' },
                    { value: MobilityType.LOW_ENDURANCE, label: 'Limited endurance' }
                ]
            });
        }

        if (!this.isFieldFilled(this.budgetLevel)) {
            questions.push({
                field: 'budgetLevel',
                question: 'What is your budget preference for attractions and activities?',
                options: [
                    { value: 0, label: 'Free only' },
                    { value: 1, label: 'Low budget' },
                    { value: 2, label: 'Medium budget' },
                    { value: 3, label: 'High budget' }
                ]
            });
        }

        if (!this.isFieldFilled(this.travelPace)) {
            questions.push({
                field: 'travelPace',
                question: 'What pace do you prefer for your trip?',
                options: [
                    { value: 'LOW', label: 'Relaxed - few places, plenty of time' },
                    { value: 'MEDIUM', label: 'Balanced - moderate number of places' },
                    { value: 'HIGH', label: 'Intensive - many places, packed schedule' }
                ]
            });
        }

        if (this.preferredTransport === UNFILLED_MARKERS.ARRAY || this.preferredTransport.length === 0) {
            questions.push({
                field: 'preferredTransport',
                question: 'How do you prefer to get around? (You can select multiple options)',
                options: [
                    { value: TransportMode.WALK, label: 'Walking' },
                    { value: TransportMode.BIKE, label: 'Cycling' },
                    { value: TransportMode.PUBLIC_TRANSIT, label: 'Public transport' },
                    { value: TransportMode.CAR_TAXI, label: 'Car/Taxi' }
                ],
                multiple: true
            });
        }

        if (!this.isFieldFilled(this.timeWindow.startHour) || !this.isFieldFilled(this.timeWindow.endHour)) {
            questions.push({
                field: 'timeWindow',
                question: 'What time do you prefer to start and end your daily activities?',
                options: [
                    { value: 'morning', label: 'Early bird (7 AM - 6 PM)' },
                    { value: 'standard', label: 'Standard (9 AM - 8 PM)' },
                    { value: 'late', label: 'Night owl (11 AM - 10 PM)' }
                ]
            });
        }

        if (this.interests === UNFILLED_MARKERS.OBJECT) {
            questions.push({
                field: 'interests',
                question: 'What types of activities and attractions interest you most? (You can select multiple categories)',
                options: [
                    { value: InterestCategory.HISTORY_CULTURE, label: 'History & Culture' },
                    { value: InterestCategory.ART_MUSEUMS, label: 'Art & Museums' },
                    { value: InterestCategory.ARCHITECTURE, label: 'Architecture' },
                    { value: InterestCategory.NATURE_PARKS, label: 'Nature & Parks' },
                    { value: InterestCategory.ENTERTAINMENT, label: 'Entertainment' },
                    { value: InterestCategory.NIGHTLIFE, label: 'Nightlife' },
                    { value: InterestCategory.GASTRONOMY, label: 'Food & Dining' },
                    { value: InterestCategory.SHOPPING, label: 'Shopping' },
                    { value: InterestCategory.SPORT_FITNESS, label: 'Sports & Fitness' },
                    { value: InterestCategory.TECHNOLOGY, label: 'Technology' }
                ],
                multiple: true
            });
        }

        if (this.dietary === UNFILLED_MARKERS.OBJECT) {
            questions.push({
                field: 'dietary',
                question: 'Do you have any dietary preferences or restrictions?',
                options: [
                    { value: 'none', label: 'No dietary restrictions' },
                    { value: 'vegetarian', label: 'Vegetarian' },
                    { value: 'vegan', label: 'Vegan' },
                    { value: 'gluten_free', label: 'Gluten-free' },
                    { value: 'halal', label: 'Halal' },
                    { value: 'kosher', label: 'Kosher' },
                    { value: 'allergies', label: 'Food allergies' }
                ],
                multiple: true
            });
        }

        return questions;
    }

    /**
     * Get all interest categories with their weights
     */
    getInterests() {
        if (this.interests === UNFILLED_MARKERS.OBJECT) {
            return {};
        }
        return { ...this.interests };
    }

    /**
     * Get mobility requirements as a readable string
     */
    getMobilityDescription() {
        if (!this.isFieldFilled(this.mobility)) return 'Not specified';
        const descriptions = {
            [MobilityType.STANDARD]: 'Standard mobility',
            [MobilityType.WHEELCHAIR]: 'Wheelchair accessible',
            [MobilityType.STROLLER]: 'Stroller friendly',
            [MobilityType.LOW_ENDURANCE]: 'Limited endurance'
        };
        return descriptions[this.mobility] || 'Unknown mobility type';
    }

    /**
     * Get transport preferences as readable strings
     */
    getTransportDescription() {
        if (this.preferredTransport === UNFILLED_MARKERS.ARRAY || this.preferredTransport.length === 0) return 'Not specified';
        const descriptions = {
            [TransportMode.WALK]: 'Walking',
            [TransportMode.BIKE]: 'Cycling',
            [TransportMode.PUBLIC_TRANSIT]: 'Public transport',
            [TransportMode.CAR_TAXI]: 'Car/Taxi'
        };
        return this.preferredTransport.map(mode => descriptions[mode] || mode).join(', ');
    }

    /**
     * Check if user has any dietary restrictions
     */
    hasDietaryRestrictions() {
        if (this.dietary === UNFILLED_MARKERS.OBJECT) {
            return false;
        }
        return this.dietary.vegan || 
               this.dietary.vegetarian || 
               this.dietary.glutenFree || 
               this.dietary.halal || 
               this.dietary.kosher || 
               this.dietary.allergies.length > 0;
    }

    /**
     * Get dietary restrictions as a readable string
     */
    getDietaryDescription() {
        if (this.dietary === UNFILLED_MARKERS.OBJECT) {
            return 'Not specified';
        }
        const restrictions = [];
        if (this.dietary.vegan) restrictions.push('Vegan');
        if (this.dietary.vegetarian) restrictions.push('Vegetarian');
        if (this.dietary.glutenFree) restrictions.push('Gluten-free');
        if (this.dietary.halal) restrictions.push('Halal');
        if (this.dietary.kosher) restrictions.push('Kosher');
        if (this.dietary.allergies.length > 0) {
            restrictions.push(`Allergies: ${this.dietary.allergies.join(', ')}`);
        }
        return restrictions.length > 0 ? restrictions.join(', ') : 'No dietary restrictions';
    }

    /**
     * Get time window as a readable string
     */
    getTimeWindowDescription() {
        if (!this.isFieldFilled(this.timeWindow.startHour) || !this.isFieldFilled(this.timeWindow.endHour)) {
            return 'Not specified';
        }
        const formatHour = (hour) => {
            if (hour === 0) return '12:00 AM';
            if (hour < 12) return `${hour}:00 AM`;
            if (hour === 12) return '12:00 PM';
            return `${hour - 12}:00 PM`;
        };
        return `${formatHour(this.timeWindow.startHour)} - ${formatHour(this.timeWindow.endHour)}`;
    }

    /**
     * Convert profile to JSON for storage/transmission
     * Note: Unfilled markers are preserved in JSON to maintain state
     */
    toJSON() {
        return {
            userId: this.userId,
            mobility: this.mobility,
            avoidStairs: this.avoidStairs,
            preferredTransport: this.preferredTransport,
            interests: this.interests,
            budgetLevel: this.budgetLevel,
            travelPace: this.travelPace,
            dietary: this.dietary === UNFILLED_MARKERS.OBJECT ? UNFILLED_MARKERS.OBJECT : {
                vegan: this.dietary.vegan,
                vegetarian: this.dietary.vegetarian,
                glutenFree: this.dietary.glutenFree,
                halal: this.dietary.halal,
                kosher: this.dietary.kosher,
                allergies: [...this.dietary.allergies]
            },
            timeWindow: {
                startHour: this.timeWindow.startHour,
                endHour: this.timeWindow.endHour
            }
        };
    }

    /**
     * Create UserProfile from JSON data
     * Note: Unfilled markers are preserved when loading from JSON
     */
    static fromJSON(data) {
        const profile = new UserProfile(data.userId);
        profile.mobility = data.mobility;
        profile.avoidStairs = data.avoidStairs;
        profile.preferredTransport = data.preferredTransport;
        profile.interests = data.interests;
        profile.budgetLevel = data.budgetLevel;
        profile.travelPace = data.travelPace;
        
        // Handle dietary field - if it's the unfilled marker, keep it; otherwise create DietaryPreference
        if (data.dietary === UNFILLED_MARKERS.OBJECT) {
            profile.dietary = UNFILLED_MARKERS.OBJECT;
        } else {
            profile.dietary = new DietaryPreference();
            Object.assign(profile.dietary, data.dietary);
        }
        
        profile.timeWindow = data.timeWindow;
        return profile;
    }
}

// --- Example usage ---
export function createExampleProfile() {
    const travellerProfile = new UserProfile('user-42');

    // Profile starts empty - AI will ask questions to fill it
    console.log('Profile completion:', travellerProfile.getCompletionPercentage() + '%');
    console.log('Missing fields:', travellerProfile.getMissingFields());
    console.log('Suggested questions:', travellerProfile.getSuggestedQuestions());

    // AI fills the profile based on user responses
    travellerProfile.mobility = MobilityType.STROLLER; // Travels with a baby stroller
    travellerProfile.avoidStairs = true; // Avoids stairs
    travellerProfile.preferredTransport = [TransportMode.PUBLIC_TRANSIT, TransportMode.WALK];
    travellerProfile.travelPace = 'LOW';
    travellerProfile.budgetLevel = 1; // Low budget

    // Setting interests with weights
    travellerProfile.setInterestWeight(InterestCategory.NATURE_PARKS, 1.0);     // High priority
    travellerProfile.setInterestWeight(InterestCategory.GASTRONOMY, 0.7);      // Medium priority
    travellerProfile.setInterestWeight(InterestCategory.ART_MUSEUMS, 0.4);     // Low priority
    travellerProfile.setInterestWeight(InterestCategory.NIGHTLIFE, 0.0);       // Zero priority

    // Setting dietary preferences
    travellerProfile.dietary = new DietaryPreference();
    travellerProfile.dietary.vegetarian = true;
    travellerProfile.timeWindow.startHour = 11; // Starts later
    travellerProfile.timeWindow.endHour = 20;

    console.log('Profile completion after filling:', travellerProfile.getCompletionPercentage() + '%');
    console.log('Profile is complete:', travellerProfile.isComplete());

    return travellerProfile;
}

// Export all enums and classes for easy importing
export default UserProfile;
