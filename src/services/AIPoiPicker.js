/**
 * AI POI Picker Service
 * Uses PromptAPI to intelligently select POIs based on user's time window and travel pace
 */

import { UNFILLED_MARKERS } from '../models/UserProfile';
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
    website: poi.website || null,
    description: poi.description || poi.name
  }));
}

/**
 * Main function to pick POIs using AI
 * @param {Array} accessiblePOIs - Array of accessible POIs
 * @param {Object} userProfile - User profile with timeWindow and travelPace
 * @returns {Promise<Array>} Array of selected POI IDs
 */
export async function pickPOIsWithAI(accessiblePOIs, userProfile) {
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

  // Format POIs for AI
  const formattedPOIs = formatPOIsForAI(accessiblePOIs);

  // Create PromptAPI instance and session
  const promptAPI = new PromptAPI();
  
  // Check availability first
  const availability = await promptAPI.checkAvailability();
  if (availability !== 'available') {
    throw new Error(
      `Prompt API is not available. Status: ${availability}. ` +
      'Please enable Chrome AI features or use a supported browser.'
    );
  }

  // Create session with system prompt
  await promptAPI.createSession({
    systemPrompt: `# The Goal:
Your goal is to select the most interesting tourist attractions from the submitted list POIs. You will receive an array of POIs in format [{'name': 'POI name', 'id': 'POI id', 'interest_categories': ['category_1', 'category_2', ...], 'wikipedia': 'Wikipedia URL', 'website': 'website URL', 'description': 'description'}, ...]'.

# Important considerations:
Pay attention to the categories of the POIs. Try to balance the resulting list and include POIs of different categories in it. If there are POIs with category 'gastronomy' pick one from this category and put it approximately in the middle of the returned array. If there are POIs with category 'nightlife' pick one and put in the end of the returned array. If you want to pick a theater POI, put it in the end of the returned array, but before 'nightlife'.

# Response format:
Reply with an array of POI ids: ['POI id 1', 'POI id 2', ...]. DO NOT include any other information in the response.`
  });

  try {
    // Create prompt with POI data and count
    const prompt = `Here is the list of available POIs:
${JSON.stringify(formattedPOIs, null, 2)}

Please select exactly ${recommendedCount} most interesting POI(s) from this list. Return only the array of POI ids.`;

    // Get AI response
    const response = await promptAPI.prompt(prompt);

    // Parse the response
    let selectedIds;
    try {
      // Try to parse as JSON
      selectedIds = JSON.parse(response);
    } catch (parseError) {
      // If parsing fails, try to extract array from text
      const arrayMatch = response.match(/\[(.*?)\]/s);
      if (arrayMatch) {
        selectedIds = JSON.parse(`[${arrayMatch[1]}]`);
      } else {
        throw new Error('Could not parse AI response');
      }
    }

    // Validate response is an array
    if (!Array.isArray(selectedIds)) {
      throw new Error('AI response is not an array');
    }

    // Convert all IDs to strings for consistency
    selectedIds = selectedIds.map(id => String(id));

    // Validate that selected IDs exist in the input POIs
    const validIds = new Set(accessiblePOIs.map(poi => String(poi.id)));
    const validSelectedIds = selectedIds.filter(id => validIds.has(id));

    if (validSelectedIds.length === 0) {
      throw new Error('AI did not return any valid POI IDs');
    }

    return validSelectedIds;

  } finally {
    // Clean up session
    await promptAPI.destroySession();
  }
}

