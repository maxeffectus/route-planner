import React from 'react';
import { renderMarkdown } from '../utils/markdown';

export function ResponseDisplay({ response }) {
  return (
    <div
      style={{
        whiteSpace: 'pre-wrap',
        fontFamily: 'monospace',
        lineHeight: '1.4',
        padding: '10px',
        border: '1px solid #ccc',
        backgroundColor: '#f9f9f9',
        borderRadius: '4px',
        minHeight: '50px'
      }}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(response) }}
    />
  );
}

