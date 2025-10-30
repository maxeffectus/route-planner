import React from 'react';
import { Autocomplete } from './Autocomplete';

/**
 * RoutePointSelector Component
 * Handles route start/finish point selection UI
 */
export function RoutePointSelector({
  routeStartPOI,
  routeFinishPOI,
  sameStartFinish,
  onStartSelect,
  onFinishSelect,
  onSameStartFinishChange,
  onClear,
  mapsAPI
}) {
  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '8px', fontSize: '16px' }}>
          {!routeStartPOI ? '📍 Select Start Point' : '🏁 Select Finish Point'}
        </h3>
        
        {!sameStartFinish && (
          <Autocomplete
            searchFunction={(query, limit) => mapsAPI.autocompletePOI(query, limit)}
            onSelect={routeStartPOI ? onFinishSelect : onStartSelect}
            renderSuggestion={(poi) => (
              <>
                <div style={{ fontWeight: '500', color: '#333' }}>
                  {poi.name}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                  {poi.description || poi.name}
                </div>
              </>
            )}
            placeholder={routeStartPOI ? "Search finish point..." : "Search start point..."}
            minChars={3}
            maxResults={5}
            debounceMs={300}
          />
        )}
        
        {routeStartPOI && !routeFinishPOI && (
          <div style={{ marginTop: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={sameStartFinish}
                onChange={(e) => onSameStartFinishChange(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              <span>Route should start and end at the same place</span>
            </label>
          </div>
        )}
      </div>

      {(routeStartPOI || routeFinishPOI) && (
        <div style={{
          marginBottom: '20px',
          padding: '12px',
          backgroundColor: '#f0f7ff',
          borderRadius: '8px',
          border: '1px solid #d0e7ff'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>Route Points</h4>
            <button
              onClick={onClear}
              style={{
                padding: '4px 8px',
                fontSize: '12px',
                cursor: 'pointer',
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }}
            >
              Clear
            </button>
          </div>
          
          {routeStartPOI && (
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>
                📍 Start:
              </div>
              <div style={{ fontSize: '13px', fontWeight: '500' }}>
                {routeStartPOI.name}
              </div>
              <div style={{ fontSize: '11px', color: '#888' }}>
                {routeStartPOI.description || routeStartPOI.name}
              </div>
            </div>
          )}
          
          {routeFinishPOI && !sameStartFinish && (
            <div>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>
                🏁 Finish:
              </div>
              <div style={{ fontSize: '13px', fontWeight: '500' }}>
                {routeFinishPOI.name}
              </div>
              <div style={{ fontSize: '11px', color: '#888' }}>
                {routeFinishPOI.description || routeFinishPOI.name}
              </div>
            </div>
          )}
          
          {sameStartFinish && (
            <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic', marginTop: '4px' }}>
              ↻ Same start and finish point
            </div>
          )}
        </div>
      )}
    </div>
  );
}

