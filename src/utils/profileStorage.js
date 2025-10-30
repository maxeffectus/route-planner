/**
 * Profile Storage Utilities
 * Handles localStorage operations for user profile
 */

import { UserProfile } from '../models/UserProfile';

const PROFILE_KEY = 'userProfile';

/**
 * Load user profile from localStorage
 * @returns {UserProfile|null} Loaded profile or null if not found
 */
export function loadUserProfile() {
  try {
    const savedProfile = localStorage.getItem(PROFILE_KEY);
    if (!savedProfile) {
      console.log('No saved profile found in localStorage');
      return null;
    }
    
    const profileData = JSON.parse(savedProfile);
    console.log('Loaded profile data from localStorage:', profileData);
    
    const profile = UserProfile.fromJSON(profileData);
    console.log('UserProfile.fromJSON result:', profile);
    console.log('Saved routes count:', profile.getAllSavedRoutes().length);
    
    return profile;
  } catch (error) {
    console.error('Failed to load profile from localStorage:', error);
    console.error('Error details:', error.message, error.stack);
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
    console.log('Saving profile to localStorage:', profileJSON);
    console.log('Saved routes to save:', profile.getAllSavedRoutes().length);
    
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profileJSON));
    return true;
  } catch (error) {
    console.error('Failed to save profile to localStorage:', error);
    console.error('Error details:', error.message, error.stack);
    return false;
  }
}

/**
 * Clear user profile from localStorage
 */
export function clearUserProfile() {
  localStorage.removeItem(PROFILE_KEY);
}


