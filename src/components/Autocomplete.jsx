import React, { useState, useEffect, useRef } from 'react';

/**
 * Generic Autocomplete Component
 * @param {Function} searchFunction - Async function that takes (query, limit) and returns array of suggestions
 * @param {Function} onSelect - Callback when item is selected, receives the selected item
 * @param {Function} renderSuggestion - Function to render each suggestion item (item) => JSX
 * @param {string} placeholder - Input placeholder text
 * @param {number} minChars - Minimum characters before search (default: 2)
 * @param {number} maxResults - Maximum number of results to fetch (default: 5)
 * @param {number} debounceMs - Debounce delay in milliseconds (default: 300)
 */
export function Autocomplete({ 
  searchFunction, 
  onSelect, 
  renderSuggestion,
  placeholder = 'Start typing...',
  minChars = 2,
  maxResults = 5,
  debounceMs = 300
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length < minChars) {
        setSuggestions([]);
        setShowDropdown(false);
        return;
      }

      setIsLoading(true);
      try {
        const results = await searchFunction(query, maxResults);
        setSuggestions(results);
        setShowDropdown(results.length > 0);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Autocomplete error:', error);
        setSuggestions([]);
        setShowDropdown(false);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, debounceMs);
    return () => clearTimeout(timeoutId);
  }, [query, searchFunction, minChars, maxResults, debounceMs]);

  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          selectItem(suggestions[selectedIndex]);
        }
        break;
      
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
      
      default:
        break;
    }
  };

  const selectItem = (item) => {
    setQuery(''); // Clear input after selection
    setShowDropdown(false);
    setSelectedIndex(-1);
    onSelect(item);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '10px',
          border: '1px solid #ddd',
          borderRadius: '4px',
          fontSize: '14px',
          boxSizing: 'border-box'
        }}
      />

      {isLoading && (
        <div style={{
          position: 'absolute',
          right: '10px',
          top: '12px',
          fontSize: '12px',
          color: '#666'
        }}>
          Loading...
        </div>
      )}

      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}
        >
          {suggestions.map((item, index) => (
            <div
              key={item.placeId || index}
              onClick={() => selectItem(item)}
              onMouseEnter={() => setSelectedIndex(index)}
              style={{
                padding: '10px',
                cursor: 'pointer',
                backgroundColor: selectedIndex === index ? '#e8f0fe' : 'white',
                borderBottom: index < suggestions.length - 1 ? '1px solid #f0f0f0' : 'none',
                transition: 'background-color 0.15s'
              }}
            >
              {renderSuggestion(item)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

