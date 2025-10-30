/**
 * Profile Storage Utilities
 * Handles localStorage operations for user profile
 */

import { UserProfile } from '../models/UserProfile';

const PROFILE_KEY = 'userProfile';
const VISITED_KEY = 'routePlannerVisited';

/**
 * Load user profile from localStorage
 * @returns {UserProfile|null} Loaded profile or null if not found
 */
export function loadUserProfile() {
  try {
    const savedProfile = localStorage.getItem(PROFILE_KEY);
    if (!savedProfile) {
      return null;
    }
    
    const profileData = JSON.parse(savedProfile);
    return UserProfile.fromJSON(profileData);
  } catch (error) {
    console.error('Failed to load profile from localStorage:', error);
    // Remove corrupted data
    localStorage.removeItem(PROFILE_KEY);
    return null;
  }
}

/**
 * Save user profile to localStorage
 * @param {UserProfile} profile - Profile to save
 * @returns {boolean} True if saved successfully
 */
export function saveUserProfile(profile) {
  try {
    if (!profile) {
      console.warn('Attempted to save null/undefined profile');
      return false;
    }
    
    const profileJSON = profile.toJSON();
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profileJSON));
    return true;
  } catch (error) {
    console.error('Failed to save profile to localStorage:', error);
    return false;
  }
}

/**
 * Clear user profile from localStorage
 */
export function clearUserProfile() {
  localStorage.removeItem(PROFILE_KEY);
}

/**
 * Check if user has visited before
 * @returns {boolean} True if user has visited before
 */
export function hasVisitedBefore() {
  return localStorage.getItem(VISITED_KEY) === 'true';
}

/**
 * Mark user as visited
 */
export function markAsVisited() {
  localStorage.setItem(VISITED_KEY, 'true');
}

/**
 * Clear visit flag (for testing)
 */
export function clearVisitFlag() {
  localStorage.removeItem(VISITED_KEY);
}

