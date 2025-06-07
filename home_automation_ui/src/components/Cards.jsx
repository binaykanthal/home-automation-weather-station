// src/components/Card.js
import React from 'react';

export default function Card({ title, children, className = '' }) {
  return (
    <div
      // merge the incoming className onto the default classes
      className={`bg-card rounded-xl shadow-lg p-6 ${className}`}
    >
      {title && (
        <h2 className="text-xl font-semibold mb-2 text-gray-200 bg-gradient-to-br from-purple-600 to-teal-200 p-2 rounded-xl shadow-lg text-center">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}
