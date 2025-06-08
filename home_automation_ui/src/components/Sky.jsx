// src/components/Sky.jsx
import React from "react";

export default function Sky({ now, sunrise, sunset,timezone, children }) {
  // Adjust the user's local time to the location's time for brightness calculation
  const nowAtLocationMs = now.getTime() + timezone; // Adjust UTC to the location's time

  const isDay = nowAtLocationMs >= sunrise && nowAtLocationMs <= sunset;

  const dayLenMs = sunset - sunrise;
  const elapsedMs = Math.max(0, Math.min(nowAtLocationMs - sunrise, dayLenMs > 0 ? dayLenMs : 0));
  const t = dayLenMs > 0 ? elapsedMs / dayLenMs : 0;

  const nightLenMs = (86400000-dayLenMs);
  const elapsedNightMs = Math.max(0, Math.min(nowAtLocationMs - sunset, nightLenMs > 0 ? nightLenMs : 0));
  const t1 = nightLenMs>0 ? elapsedNightMs /nightLenMs: 0;
  const factor= isDay?t:t1;

  

  // const nightLenMs = (86400000-dayLenMs);
  // const elapsedNightMs = Math.max(0, Math.min(nowAtLocationMs - sunset, nightLenMs > 0 ? nightLenMs : 0));
  // const t1 = nightLenMs>0 ? elapsedNightMs /nightLenMs: 0;

  // sun/moon arc angle
  
  const angle = Math.PI * (1 - factor);
  const orbPx = 50;
  const radiusOffset = (orbPx/2) / window.innerWidth;
  const R = 0.5 + radiusOffset;

  const cx = 0.5 + R*Math.cos(angle);
  const cy = 1.0 - R * Math.sin(angle);

  // brightness peaks at t=0.5 (noon)
  const b = 0.5 + 0.5 * Math.sin(Math.PI * t);
  const brightness =b *0.8 + 0.2;

  const skyStyle = {
    position: "absolute",
    inset: 0,
    overflow: "hidden",
    backgroundImage: isDay
      ? `url("/day-sky.png")`
      : `url("/night-sky.png")`,
    backgroundSize: "cover",
    backgroundPosition: "center top",
    filter: `brightness(${brightness})`,
    transition: "background-image 1s ease-in-out, filter 1s linear",
  };

  const orbStyle = {
    position: 'absolute',
    left:  `${cx * 100}%`,
    top:   `${cy * 100}%`,
    width:  `${orbPx}px`,
    height: `${orbPx}px`,
    marginLeft: `-${orbPx/2}px`,
    marginTop:  `-${orbPx/2}px`,
    borderRadius: '50%',
    pointerEvents: 'none',
    
  };
 
    return (
    <div style={skyStyle}>
       {/* sun‑image instead of solid circle */}
       <img
        src={isDay ? "/sun-circle.png" : "/moon-circle.png"}
        alt={isDay ? "Sun" : "Moon"}
        style={{
          ...orbStyle,
          filter: isDay
            ? 'drop-shadow(0 0 1rem rgba(212, 238, 243, 0.98))'
            : 'drop-shadow(0 0 0.5rem rgba(92, 148, 231, 0.86))',
            ...rotateStyle,
        }}
      />
      {children}
    </div>
  );
}

const rotateStyle = {
  animation: 'spin 60s linear infinite',
};

const keyframes = `
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
`;

// Inject the keyframes into the document once
if (typeof document !== "undefined" && !document.getElementById('spin-keyframes')) {
  const style = document.createElement('style');
  style.id = 'spin-keyframes';
  style.innerHTML = keyframes;
  document.head.appendChild(style);
}

