// src/components/CloudPie.jsx
import React, { useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';

export default function CloudPie({ clouds }) {
  const canvasRef = useRef();

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Clouds', 'Clear'],
        datasets: [{
          data: [clouds, 100 - clouds],
          backgroundColor: ['rgba(107,72,255,0.8)', 'rgba(0,221,235,0.8)'],
          borderWidth: 0
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        responsive: true,
        maintainAspectRatio: false
      }
    });
    return () => chart.destroy();
  }, [clouds]);

  return (
    <div className="w-36 h-36">
      <canvas ref={canvasRef} />
    </div>
  );
}


