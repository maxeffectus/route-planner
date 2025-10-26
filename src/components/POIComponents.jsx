import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import noImagePlaceholder from '../static_resources/no_image_placeholder.png';
import { getCategoryLabel } from '../utils/categoryMapping';

/**
 * POI Image Thumbnail Component
 * Displays POI image with loading state and hover preview
 */
export function POIImageThumbnail({ poi, mapsAPI, onImageLoaded, size = 80, height = null, showPreview = true }) {
  const [imageUrl, setImageUrl] = useState(poi.getResolvedImageUrl() || noImagePlaceholder);
  const [isLoading, setIsLoading] = useState(!poi.hasResolvedImage());
  const [showHoverPreview, setShowHoverPreview] = useState(false);
  const [previewPosition, setPreviewPosition] = useState({ top: 0, left: 0 });

  // Load image if not cached
  useEffect(() => {
    if (poi.hasResolvedImage()) {
      setImageUrl(poi.getResolvedImageUrl());
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    
    const loadImage = async () => {
      setIsLoading(true);
      try {
        const url = await mapsAPI.getPOIImage(poi);
        if (isMounted) {
          setImageUrl(url);
          setIsLoading(false);
          poi.setResolvedImageUrl(url);
          if (onImageLoaded) {
            onImageLoaded(poi.id, url);
          }
        }
      } catch (error) {
        console.warn('Error loading POI image:', error);
        if (isMounted) {
          setImageUrl(noImagePlaceholder);
          setIsLoading(false);
          poi.setResolvedImageUrl(noImagePlaceholder);
          if (onImageLoaded) {
            onImageLoaded(poi.id, noImagePlaceholder);
          }
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [poi, mapsAPI, onImageLoaded]);

  const isPlaceholder = imageUrl === noImagePlaceholder;

  const handleMouseEnter = (e) => {
    if (!isPlaceholder && showPreview) {
      const rect = e.currentTarget.getBoundingClientRect();
      setPreviewPosition({
        top: rect.top + window.scrollY,
        left: rect.right + 20
      });
      setShowHoverPreview(true);
    }
  };

  const containerStyle = {
    width: typeof size === 'number' ? `${size}px` : size,
    height: height ? (typeof height === 'number' ? `${height}px` : height) : (typeof size === 'number' ? `${size}px` : size),
    flexShrink: 0,
    borderRadius: '6px',
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    border: '1px solid #ddd',
    position: 'relative',
    cursor: (isPlaceholder || !showPreview) ? 'default' : 'pointer'
  };

  return (
    <div 
      style={containerStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShowHoverPreview(false)}
    >
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '20px',
          color: '#999'
        }}>
          ⏳
        </div>
      )}
      <img 
        src={imageUrl}
        alt={poi.name}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          opacity: isLoading ? 0.3 : 1,
          transition: 'opacity 0.3s'
        }}
        onError={(e) => {
          e.target.src = noImagePlaceholder;
          setIsLoading(false);
        }}
        onLoad={() => setIsLoading(false)}
      />

      {/* Image Preview on Hover - Using Portal */}
      {showHoverPreview && !isPlaceholder && showPreview && createPortal(
        <div style={{
          position: 'absolute',
          top: `${previewPosition.top}px`,
          left: `${previewPosition.left}px`,
          zIndex: 999999,
          pointerEvents: 'none'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            padding: '8px',
            border: '2px solid #ddd'
          }}>
            <img 
              src={imageUrl}
              alt={poi.name}
              style={{
                maxWidth: '300px',
                maxHeight: '300px',
                display: 'block',
                borderRadius: '4px'
              }}
            />
            <div style={{
              marginTop: '6px',
              fontSize: '12px',
              color: '#666',
              textAlign: 'center',
              fontWeight: '500'
            }}>
              {poi.name}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

/**
 * POI Title Component
 * Displays POI name with color-coded border
 */
export function POITitle({ poi, color, variant = 'default' }) {
  const styles = {
    default: {
      fontWeight: '600',
      color: '#1a73e8',
      fontSize: '15px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    },
    popup: {
      margin: '0 0 8px 0',
      fontSize: '16px',
      color: color,
      borderLeft: `4px solid ${color}`,
      paddingLeft: '8px',
      paddingRight: '24px'
    }
  };

  return (
    <div style={styles[variant]}>
      {poi.name}
    </div>
  );
}

/**
 * POI Type Component
 * Displays POI type/category with icon using proper display label
 * Supports multiple categories
 */
export function POIType({ poi }) {
  const categories = poi.interest_categories || [];
  
  // Get display labels
  const displayLabels = categories.map(cat => getCategoryLabel(cat)).filter(Boolean);
  
  // If no labels found, fallback to type
  const displayLabel = displayLabels.length > 0 
    ? displayLabels.join(' • ')
    : getCategoryLabel(poi.type);

  return (
    <div style={{ 
      fontSize: '13px', 
      color: '#666',
      marginBottom: '4px'
    }}>
      📍 {displayLabel}
    </div>
  );
}

/**
 * POI Links Component
 * Displays Wikipedia and Website links
 */
export function POILinks({ poi, fontSize = '11px', gap = '8px' }) {
  if (!poi.hasWikipedia() && !poi.hasWebsite()) {
    return null;
  }

  return (
    <div style={{ display: 'flex', gap: gap, flexWrap: 'wrap' }}>
      {poi.hasWikipedia() && (
        <a 
          href={poi.getWikipediaUrl()}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            fontSize: fontSize,
            color: '#1976D2',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '2px'
          }}
          onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
          onMouseOut={(e) => e.target.style.textDecoration = 'none'}
        >
          📖 Wikipedia
        </a>
      )}
      {poi.hasWebsite() && (
        <a 
          href={poi.website}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          style={{
            fontSize: fontSize,
            color: '#1976D2',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '2px'
          }}
          onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
          onMouseOut={(e) => e.target.style.textDecoration = 'none'}
        >
          🌐 Website
        </a>
      )}
    </div>
  );
}

/**
 * POI Description Component
 */
export function POIDescription({ poi }) {
  if (!poi.description) return null;

  return (
    <div style={{ 
      fontSize: '13px', 
      marginBottom: '8px',
      color: '#555'
    }}>
      {poi.description}
    </div>
  );
}

/**
 * POI Accessibility Component
 * Displays accessibility information for different user groups
 */
export function getPOIAccessibility({ poi }) {
  const wheelchair = poi.isWheelchairAccessible();
  const stroller = poi.isStrollerAccessible();
  const mobility = poi.isTempMobilityIssuesAccessible();
  const bicycle = poi.isBikeAccessible();
  
  const getAccessibilityIcon = (status) => {
    switch(status) {
      case 'yes': return '✓';
      case 'no': return '✗';
      case 'limited': return '~';
      case 'unknown': return '?';
      default: return '?';
    }
  };
  
  const getAccessibilityColor = (status) => {
    switch(status) {
      case 'yes': return '#4CAF50';
      case 'no': return '#f44336';
      case 'limited': return '#FF9800';
      case 'unknown': return '#999';
      default: return '#999';
    }
  };
  
  return (
    <div style={{ 
      marginTop: '8px',
      padding: '8px',
      backgroundColor: '#f9f9f9',
      borderRadius: '4px',
      fontSize: '11px'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '12px' }}>
        Accessibility
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: getAccessibilityColor(wheelchair), fontWeight: 'bold' }}>
            {getAccessibilityIcon(wheelchair)}
          </span>
          <span>Wheelchair: {wheelchair}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: getAccessibilityColor(stroller), fontWeight: 'bold' }}>
            {getAccessibilityIcon(stroller)}
          </span>
          <span>Stroller: {stroller}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: getAccessibilityColor(mobility), fontWeight: 'bold' }}>
            {getAccessibilityIcon(mobility)}
          </span>
          <span>Limited mobility: {mobility}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: getAccessibilityColor(bicycle), fontWeight: 'bold' }}>
            {getAccessibilityIcon(bicycle)}
          </span>
          <span>Bicycle: {bicycle}</span>
        </div>
      </div>
    </div>
  );
}

