/**
 * SavedRoute class - Represents a saved route with associated POIs and geometry
 */
export class SavedRoute {
  constructor(data = {}) {
    this.name = data.name || '';
    this.geometry = data.geometry || null;
    this.distance = data.distance || 0;
    this.duration = data.duration || 0;
    this.poiIds = data.poiIds || [];
    this.createdAt = data.createdAt || Date.now();
    this.instructions = data.instructions || [];
  }

  /**
   * Validate that the route has all required fields
   * @returns {boolean} True if valid, false otherwise
   */
  validate() {
    if (!this.name || this.name.trim() === '') {
      return false;
    }
    if (!this.geometry || !this.geometry.coordinates) {
      return false;
    }
    if (this.poiIds.length < 2) {
      return false; // Must have at least start and finish POIs
    }
    return true;
  }

  /**
   * Convert SavedRoute to JSON for storage
   * @returns {Object} JSON representation
   */
  toJSON() {
    return {
      name: this.name,
      geometry: this.geometry,
      distance: this.distance,
      duration: this.duration,
      poiIds: this.poiIds,
      createdAt: this.createdAt,
      instructions: this.instructions
    };
  }

  /**
   * Create SavedRoute from JSON data
   * @param {Object} data - JSON data
   * @returns {SavedRoute} SavedRoute instance
   */
  static fromJSON(data) {
    return new SavedRoute(data);
  }
}

