/**
 * OpenStreetPOI (Point of Interest from OpenStreetMap) class - Single source of truth for POI data from OpenStreetMap
 */
export class OpenStreetPOI {
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
      resolvedImageUrl: this.resolvedImageUrl
    };
  }

  /**
   * Create OpenStreetPOI instance from plain object
   */
  static fromJSON(data) {
    return new OpenStreetPOI(data);
  }
}

