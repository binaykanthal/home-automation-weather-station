
import React from 'react';

export default function RelayControls({ device }) {
  // helper to send toggle request
  const toggleRelay = id => {
    fetch('http://localhost:3000/api/relay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    }).catch(console.error);
    // we rely on WebSocket to update `device` when toggle completes
  };


  return (
    
      <div className="space-y-3 ">
        {[1, 2, 3, 4, 5, 6].map(i => {
          const on = device[`relay${i}`] === 1;
          return (
            <button
              key={i}
              onClick={() => toggleRelay(i)}
              className={`
                w-full text-left px-4 py-2 rounded-lg bg-gray-800 
                ${on
                  ? 'bg-gray-700 text-pink-500 hover:bg-gray-600'
                  : 'bg-green-800 text-yellow-300 hover:bg-gray-700'}`}
            >
              Switch {i}:
              <span className="float-right font-medium">
                {on ? ' OFF' : ' ON'}
              </span>
            </button>
          );
        }
        )}
        {[7].map(i => {
          const on1 = device[`relay${i}`] === 1;
          return (
            <button
              key={i}
              onClick={() => toggleRelay(i)}
              className={`
                w-full text-left px-4 py-2 rounded-lg bg-gray-800
                ${on1
                  ? 'bg-green-800 text-yellow-300 hover:bg-gray-700'
                  : 'bg-gray-700 text-pink-500 hover:bg-gray-600'}`}
            >
              Switch {i}:
              <span className="float-right font-medium">
                {on1 ? ' ON' : ' OFF'}
              </span>
            </button>
          );
        }
        )}
      </div>
    
  );
}
