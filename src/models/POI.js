/**
 * Accessibility status enum for POI
 */
export const IsAccessible = {
  YES: 'yes',
  NO: 'no',
  LIMITED: 'limited',
  UNKNOWN: 'unknown'
};

/**
 * OpenStreetPOI (Point of Interest from OpenStreetMap) class - Single source of truth for POI data from OpenStreetMap
 */
export class OpenStreetPOI {
  #allTags = {};
  
  constructor(data) {
    this.id = data.id;
    this.name = data.name || 'Unnamed';
    this.type = data.type;
    this.interest_categories = data.interest_categories || [];
    this.location = data.location;
    this.description = data.description;
    this.website = data.website;
    this.wikipedia = data.wikipedia;
    this.wikidata = data.wikidata;
    this.imageUrl = data.imageUrl;
    this.wikimediaCommons = data.wikimediaCommons;
    this.osmType = data.osmType;
    this.osmId = data.osmId;
    this.significance = data.significance;
    this.wantToVisit = data.wantToVisit || false;
    
    // Store OSM tags for accessibility checking
    this.#allTags = data.allTags || {};
    
    // Cached resolved image URL (set after fetching)
    this.resolvedImageUrl = data.resolvedImageUrl || null;
  }

  /**
   * Get the resolved image URL or null if not yet fetched
   */
  getResolvedImageUrl() {
    return this.resolvedImageUrl;
  }

  /**
   * Set the resolved image URL (after fetching)
   */
  setResolvedImageUrl(url) {
    this.resolvedImageUrl = url;
  }

  /**
   * Check if POI has a resolved image
   */
  hasResolvedImage() {
    return this.resolvedImageUrl !== null;
  }

  /**
   * Check if POI is within a bounding box
   */
  isInBbox(bbox) {
    if (!this.location?.lat || !this.location?.lng) return false;
    const { lat, lng } = this.location;
    return (
      lat >= bbox.minLat &&
      lat <= bbox.maxLat &&
      lng >= bbox.minLng &&
      lng <= bbox.maxLng
    );
  }

  /**
   * Get Wikipedia URL
   * OpenStreetMap format: "language:Article_Name" (e.g., "en:Eiffel_Tower")
   * The article name is already in Wikipedia's URL format
   */
  getWikipediaUrl() {
    if (!this.wikipedia) return null;
    
    // Check if it contains a language prefix
    if (this.wikipedia.includes(':')) {
      const [language, article] = this.wikipedia.split(':', 2);
      return `https://${language}.wikipedia.org/wiki/${article}`;
    }
    
    // If no language prefix, assume English and use as-is
    return `https://en.wikipedia.org/wiki/${this.wikipedia}`;
  }

  /**
   * Check if POI has Wikipedia page
   */
  hasWikipedia() {
    return !!this.wikipedia;
  }

  /**
   * Check if POI has official website
   */
  hasWebsite() {
    return !!this.website;
  }

  /**
   * Check wheelchair accessibility
   * @returns {string} IsAccessible.YES, NO, LIMITED, or UNKNOWN
   */
  isWheelchairAccessible() {
    const wheelchair = this.#allTags.wheelchair;
    if (wheelchair === 'yes') return IsAccessible.YES;
    if (wheelchair === 'no') return IsAccessible.NO;
    if (wheelchair === 'limited') return IsAccessible.LIMITED;
    
    // Check for ramps as fallback
    if (this.#allTags.ramp === 'yes') return IsAccessible.LIMITED;
    
    return IsAccessible.UNKNOWN;
  }

  /**
   * Check stroller accessibility
   * @returns {string} IsAccessible.YES, NO, LIMITED, or UNKNOWN
   */
  isStrollerAccessible() {
    const stroller = this.#allTags.stroller;
    if (stroller === 'yes') return IsAccessible.YES;
    if (stroller === 'no') return IsAccessible.NO;
    if (stroller === 'limited') return IsAccessible.LIMITED;
    
    // Fallback: check wheelchair or ramp:stroller
    if (this.#allTags.wheelchair === 'yes' || this.#allTags['ramp:stroller'] === 'yes') {
      return IsAccessible.YES;
    }
    if (this.#allTags.wheelchair === 'limited') return IsAccessible.LIMITED;
    
    return IsAccessible.UNKNOWN;
  }

  /**
   * Check accessibility for people with temporary mobility issues
   * @returns {string} IsAccessible.YES, NO, LIMITED, or UNKNOWN
   */
  isTempMobilityIssuesAccessible() {
    // Check for ramps and handrails
    const hasRamp = this.#allTags.ramp === 'yes';
    const hasHandrail = this.#allTags.handrail === 'yes';
    const wheelchair = this.#allTags.wheelchair;
    
    if (wheelchair === 'yes' || (hasRamp && hasHandrail)) return IsAccessible.YES;
    if (wheelchair === 'no') return IsAccessible.NO;
    if (wheelchair === 'limited' || hasRamp || hasHandrail) return IsAccessible.LIMITED;
    
    return IsAccessible.UNKNOWN;
  }

  /**
   * Check bicycle accessibility
   * @returns {string} IsAccessible.YES, NO, LIMITED, or UNKNOWN
   */
  isBikeAccessible() {
    const bicycle = this.#allTags.bicycle;
    if (bicycle === 'yes' || bicycle === 'designated') return IsAccessible.YES;
    if (bicycle === 'no') return IsAccessible.NO;
    if (bicycle === 'dismount') return IsAccessible.LIMITED;
    
    // Check for bicycle parking as positive indicator
    if (this.#allTags.bicycle_parking) return IsAccessible.YES;
    
    return IsAccessible.UNKNOWN;
  }

  /**
   * Convert to plain object (for JSON serialization, etc.)
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      interest_categories: this.interest_categories,
      location: this.location,
      description: this.description,
      website: this.website,
      wikipedia: this.wikipedia,
      wikidata: this.wikidata,
      imageUrl: this.imageUrl,
      wikimediaCommons: this.wikimediaCommons,
      osmType: this.osmType,
      osmId: this.osmId,
      significance: this.significance,
      resolvedImageUrl: this.resolvedImageUrl,
      allTags: this.#allTags,
      wantToVisit: this.wantToVisit
    };
  }

  /**
   * Create OpenStreetPOI instance from plain object
   */
  static fromJSON(data) {
    return new OpenStreetPOI(data);
  }
}

