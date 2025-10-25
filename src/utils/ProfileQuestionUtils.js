import { getCurrentFieldValue } from '../services/SimpleProfileConfig.js';

/**
 * Utility class for handling profile question operations
 */
export class ProfileQuestionUtils {
    /**
     * Get the appropriate answer value based on question type
     * @param {Object} question - Question configuration
     * @param {Array} selectedAnswers - Selected answers array
     * @param {Object} dietaryAnswers - Dietary answers object
     * @param {Object} timeWindowAnswers - Time window answers object
     * @returns {*} Processed answer value
     */
    static getAnswerValue(question, selectedAnswers, dietaryAnswers, timeWindowAnswers) {
        switch (question.type) {
            case 'single-choice':
                return selectedAnswers[0];
            case 'multi-choice':
                return selectedAnswers;
            case 'dietary-form':
                // Process allergies
                const allergies = dietaryAnswers.allergies
                    .split(',')
                    .map(allergy => allergy.trim())
                    .filter(allergy => allergy.length > 0);
                
                return {
                    ...dietaryAnswers,
                    allergies
                };
            case 'time-range':
                return timeWindowAnswers;
            default:
                return selectedAnswers[0];
        }
    }

    /**
     * Load current values from profile into component state
     * @param {Object} question - Current question
     * @param {Object} profile - User profile
     * @param {Function} setSelectedAnswers - Setter for selected answers
     * @param {Function} setDietaryAnswers - Setter for dietary answers
     * @param {Function} setTimeWindowAnswers - Setter for time window answers
     */
    static loadCurrentValues(question, profile, setSelectedAnswers, setDietaryAnswers, setTimeWindowAnswers) {
        if (!question || !profile) return;
        
        const currentValue = getCurrentFieldValue(profile, question.field);
        
        switch (question.field) {
            case 'mobility':
            case 'avoidStairs':
            case 'budgetLevel':
            case 'travelPace':
                if (currentValue !== null) {
                    setSelectedAnswers([currentValue]);
                }
                break;
            case 'preferredTransport':
            case 'interests':
                if (Array.isArray(currentValue) && currentValue.length > 0) {
                    setSelectedAnswers(currentValue);
                } else {
                    setSelectedAnswers([]);
                }
                break;
            case 'dietary':
                if (currentValue && typeof currentValue === 'object') {
                    setDietaryAnswers(currentValue);
                }
                break;
            case 'timeWindow':
                if (currentValue && typeof currentValue === 'object') {
                    setTimeWindowAnswers(currentValue);
                }
                break;
        }
    }

    /**
     * Reset all answer states to default values
     * @param {Function} setSelectedAnswers - Setter for selected answers
     * @param {Function} setDietaryAnswers - Setter for dietary answers
     * @param {Function} setTimeWindowAnswers - Setter for time window answers
     */
    static resetAnswerStates(setSelectedAnswers, setDietaryAnswers, setTimeWindowAnswers) {
        setSelectedAnswers([]);
        setDietaryAnswers({
            vegan: false,
            vegetarian: false,
            glutenFree: false,
            halal: false,
            kosher: false,
            allergies: ''
        });
        setTimeWindowAnswers({
            startHour: 9,
            endHour: 18
        });
    }
}
