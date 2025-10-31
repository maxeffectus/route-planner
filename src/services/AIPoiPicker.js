/**
 * AI POI Picker Service
 * Uses PromptAPI to intelligently select POIs based on user's time window and travel pace
 */

import { InterestCategory, UNFILLED_MARKERS } from '../models/UserProfile';
import { PromptAPI } from './PromptAPI';

/**
 * Calculate recommended number of POIs based on available time and travel pace
 * @param {Object} timeWindow - Object with startHour and endHour
 * @param {string} travelPace - 'LOW', 'MEDIUM', or 'HIGH'
 * @returns {number} Recommended number of POIs to visit
 */
export function calculateRecommendedPOICount(timeWindow, travelPace) {
  const approximateRouteDuration = timeWindow.endHour - timeWindow.startHour;
  
  switch (travelPace) {
    case 'LOW':
      return Math.floor(approximateRouteDuration / 3.5);
    case 'MEDIUM':
      return Math.floor(approximateRouteDuration / 3);
    case 'HIGH':
      return Math.floor(approximateRouteDuration / 2.5);
    default:
      // Default to MEDIUM pace if unknown
      return Math.floor(approximateRouteDuration / 3);
  }
}

/**
 * Format POI data for AI consumption
 * @param {Array} pois - Array of POI objects
 * @returns {Array} Formatted POI data
 */
function formatPOIsForAI(pois) {
  return pois.map(poi => ({
    name: poi.name,
    id: poi.id,
    interest_categories: poi.interest_categories || [],
    wikipedia: poi.wikipedia || null,
    website: poi.website || null
  }));
}

/**
 * Generate text describing user's interests for AI prompt
 * @param {Object} userProfile - User profile with interests
 * @returns {string} Formatted text about user interests
 */
function getUserInterestsText(userProfile) {
  if (!userProfile.interests || userProfile.interests === UNFILLED_MARKERS.OBJECT) {
    return '';
  }
  
  const interests = userProfile.getInterests();
  const sortedInterests = Object.entries(interests)
    .filter(([_, weight]) => weight > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([category, _]) => category);
  
  if (sortedInterests.length === 0) return '';
  
  return `\n\n# User's interests (prioritize POIs matching these categories):\n${sortedInterests.join(', ')}`;
}

/**
 * Validate diversity of selected POIs and log warnings if needed
 * @param {Array} selectedPOIs - Array of selected POI IDs
 * @param {Array} allPOIs - Array of all available POIs
 * @returns {Object} Category distribution statistics
 */
function validateDiversity(selectedPOIs, allPOIs) {
  const categoryCount = {};
  
  selectedPOIs.forEach(poiId => {
    const poi = allPOIs.find(p => String(p.id) === String(poiId));
    if (poi && poi.interest_categories) {
      poi.interest_categories.forEach(cat => {
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      });
    }
  });
  
  // Check if one category dominates
  const maxCount = Math.max(...Object.values(categoryCount));
  const totalCategories = Object.keys(categoryCount).length;
  
  // If one category occupies more than 50% and there are multiple categories - log warning
  if (maxCount > selectedPOIs.length * 0.5 && totalCategories > 1) {
    console.warn('⚠️ Low diversity detected in AI POI selection:', categoryCount);
    const dominantCategory = Object.entries(categoryCount)
      .find(([_, count]) => count === maxCount)?.[0];
    console.warn(`Category "${dominantCategory}" dominates with ${maxCount}/${selectedPOIs.length} POIs`);
  }
  
  return categoryCount;
}

/**
 * Main function to pick POIs using AI
 * @param {Array} accessiblePOIs - Array of accessible POIs
 * @param {Object} userProfile - User profile with timeWindow and travelPace
 * @param {Function} onDownloadable - Callback when model is downloadable (should return Promise)
 * @param {AbortSignal} signal - Signal to abort the request
 * @returns {Promise<Array>} Array of selected POI IDs
 */
export async function pickPOIsWithAI(accessiblePOIs, userProfile, onDownloadable = null, signal = null) {
  // Validate inputs
  if (!accessiblePOIs || accessiblePOIs.length === 0) {
    throw new Error('No accessible POIs available for selection');
  }

  if (!userProfile) {
    throw new Error('User profile is required');
  }

  // Validate time window
  if (!userProfile.timeWindow || 
      userProfile.timeWindow.startHour === UNFILLED_MARKERS.NUMBER ||
      userProfile.timeWindow.endHour === UNFILLED_MARKERS.NUMBER) {
    throw new Error('Time window is not set in user profile');
  }

  // Validate travel pace
  if (!userProfile.travelPace || userProfile.travelPace === UNFILLED_MARKERS.STRING) {
    throw new Error('Travel pace is not set in user profile');
  }

  // Calculate recommended POI count
  const recommendedCount = calculateRecommendedPOICount(
    userProfile.timeWindow,
    userProfile.travelPace
  );

  if (recommendedCount <= 0) {
    throw new Error('Time window is too short for any POI visits');
  }

  // TEMPORARY: Limit the number of POIs sent to the model to avoid exceeding context window
  // This is a workaround for the limited context size of the on-device Gemini Nano model.
  // Future improvements could include:
  // - Pagination: split POIs into batches and process them in multiple sessions
  // - Parallel sessions: run multiple AI sessions in parallel to process more POIs
  // However, testing on current hardware showed unsatisfactory performance due to:
  // - High memory usage when running multiple sessions simultaneously
  // - Slow response times (multiple sessions competing for limited resources)
  // - Inconsistent results quality when context is split
  const MAX_POIS_FOR_AI = 100;
  let poisToProcess = accessiblePOIs;
  
  if (accessiblePOIs.length > MAX_POIS_FOR_AI) {
    console.warn(`⚠️ Too many POIs (${accessiblePOIs.length}). Limiting to ${MAX_POIS_FOR_AI} for AI processing.`);
    // Take first N POIs (they are likely already sorted by relevance/distance)
    poisToProcess = accessiblePOIs.slice(0, MAX_POIS_FOR_AI);
  }

  // Format POIs for AI
  const formattedPOIs = formatPOIsForAI(poisToProcess);

  // Create PromptAPI instance and session
  const promptAPI = new PromptAPI();
  
  // Build system prompt
  const systemPrompt = `You are a POI selection assistant. Your task is to select POIs and return ONLY a JSON array.

# The Goal:
Pick a DIVERSE and BALANCED collection of attractions from the submitted array of POIs.

# Input format:
You will receive an array of POIs in format [
  {
    'name': 'POI name', 
    'id': 'POI id', 
    'interest_categories': ['category_1', 'category_2', ...], 
    'wikipedia': 'Wikipedia URL', 
    'website': 'website URL'
    }, 
    ...
]

# IMPORTANT RULES for diversity:
1. **Category Balance**: Try to select POIs from DIFFERENT interest_categories. 
2. **Avoid Repetition**: Do NOT select more than 2 POIs from the same category (unless there are no other options).
3. **Variety is Key**: Prefer a mix of different experiences rather than similar ones.
4. **Consider ALL categories**: ${Object.values(InterestCategory).join(', ')}

# Category placement guidelines:
- If there are POIs with category '${InterestCategory.GASTRONOMY}', include one approximately in the MIDDLE of the array
- If there are POIs with category '${InterestCategory.NIGHTLIFE}', include one at the END of the array
- If selecting a theater POI, place it near the end but BEFORE ${InterestCategory.NIGHTLIFE}
- Museums (${InterestCategory.ART_MUSEUMS}, ${InterestCategory.HISTORY_CULTURE}) should NOT dominate the list - limit to 2 maximum unless no other options exist

# CRITICAL OUTPUT REQUIREMENTS:
You MUST return an array containing the VALUES of the 'id' field from the selected POI objects.
Extract the numeric ID values from the POIs and return them as a JSON array of integers.

RESPOND WITH ONLY A JSON ARRAY. NOTHING ELSE.
NO explanations. NO comments. NO markdown. NO code blocks.
JUST the array of id values: [$POI_1.id, $POI_2.id, $POI_3.id]

Example of CORRECT response (if you selected POIs with ids 10, 11, 12, 21):
[10, 11, 12, 21]

Example of WRONG responses (DO NOT DO THIS):
Here's a selection of diverse POIs: [10, 11, 12, 21]
OR
\`\`\`json
[10, 11, 12]
\`\`\`
OR
[
  10,  # Museum ABC
  11,  # Restaurant XYZ
  12   # Theater QWE
]

RESPOND WITH ONLY THE ARRAY OF ID VALUES.`;
  
  const sessionOptions = {
    systemPrompt: systemPrompt,
    responseConstraint: {
      type: 'array',
      items: {
        type: 'integer'
      }
    }
  };
  
  // Check availability first
  const availability = await promptAPI.checkAvailability();
  if (availability === 'unavailable') {
    throw new Error(
      `Prompt API is not available. Status: ${availability}. ` +
      'Please enable Chrome AI features or use a supported browser.'
    );
  }
  
  // Handle downloadable status
  if (availability === 'downloadable') {
    if (onDownloadable) {
      // Call the callback to show modal and wait for user confirmation
      await onDownloadable(promptAPI, sessionOptions);
    } else {
      // Fallback: throw error if no callback provided
      throw new Error(
        'Model download required. Please click the button again to confirm.'
      );
    }
  } else {
    // Create session with system prompt
    await promptAPI.createSession(sessionOptions);
  }

  try {
    // Get user interests text
    const userInterestsText = getUserInterestsText(userProfile);
    
    // Create prompt with POI data and count
    const prompt = `Here is the list of available POIs:
${JSON.stringify(formattedPOIs, null, 2)}
${userInterestsText}

Please select exactly ${recommendedCount} POIs from this list, ensuring MAXIMUM DIVERSITY across different interest_categories. 
Remember: avoid selecting too many POIs from the same category.

CRITICAL: Extract the 'id' field values from the selected POIs and return ONLY a JSON array of those integer IDs.
Example: if you select POIs with id=10, id=15, id=22, respond with: [10, 15, 22]
Do NOT add any text, comments, or explanations. ONLY the array of id values.`;

    // Get AI response
    const response = await promptAPI.prompt(prompt, signal ? { signal } : {});

    // Parse the response
    let selectedIds;
    try {
      // First, try to parse the response directly as JSON
      try {
        selectedIds = JSON.parse(response.trim());
        console.log('✅ Successfully parsed AI response as JSON');
      } catch (directParseError) {
        // If direct parsing fails, try cleaning the response
        console.log('⚠️ Direct JSON parse failed, trying to clean response...');
        
        // First, try to clean up the response by removing markdown code blocks and comments
        let cleanedResponse = response.trim();
        
        // Remove markdown code blocks
        cleanedResponse = cleanedResponse.replace(/```[a-z]*\n/g, '').replace(/\n```/g, '');
        
        // Extract the array part
        const arrayMatch = cleanedResponse.match(/\[([\s\S]*?)\]/);
        if (!arrayMatch) {
          throw new Error('No array found in response');
        }
        
        let arrayContent = arrayMatch[1];
        
        // Remove Python/JS style comments (# comment or // comment) and empty lines
        arrayContent = arrayContent.split('\n')
          .map(line => {
            // Remove # comments
            const hashIndex = line.indexOf('#');
            if (hashIndex !== -1) {
              line = line.substring(0, hashIndex);
            }
            // Remove // comments
            const slashIndex = line.indexOf('//');
            if (slashIndex !== -1) {
              line = line.substring(0, slashIndex);
            }
            return line.trim();
          })
          .filter(line => line.length > 0) // Remove empty lines after trimming
          .join(',');
        
        // Try to parse as JSON
        selectedIds = JSON.parse(`[${arrayContent}]`);
        console.log('✅ Successfully parsed cleaned AI response');
      }
    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', parseError);
      console.error('Original response:', response);
      throw new Error('Could not parse AI response: ' + parseError.message);
    }

    // Validate response is an array
    if (!Array.isArray(selectedIds)) {
      throw new Error('AI response is not an array');
    }

    // Convert all IDs to strings for consistency
    selectedIds = selectedIds.map(id => String(id));

    // Validate that selected IDs exist in the input POIs (that were sent to AI)
    const validIds = new Set(poisToProcess.map(poi => String(poi.id)));
    const validSelectedIds = selectedIds.filter(id => validIds.has(id));

    if (validSelectedIds.length === 0) {
      throw new Error('AI did not return any valid POI IDs');
    }

    // Validate diversity and log statistics
    const categoryStats = validateDiversity(validSelectedIds, poisToProcess);
    console.log('✅ AI POI selection category distribution:', categoryStats);

    return validSelectedIds;

  } finally {
    // Clean up session immediately after getting response
    console.log('🧹 Cleaning up PromptAPI session...');
    await promptAPI.destroySession();
    console.log('✅ PromptAPI session destroyed');
  }
}

