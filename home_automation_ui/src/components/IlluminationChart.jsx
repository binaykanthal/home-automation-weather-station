import React from 'react';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';

export default function IlluminationChart({ illum }) {
  const data = {
    labels: ['Illumination'],
    datasets: [{
      label: '%',
      data: [illum],
      backgroundColor: ['#facc15'], // a sunny yellow
      borderRadius: 4,
      barThickness: 20,
    }]
  };

  const options = {
    indexAxis: 'y',               // horizontal bar
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
        ticks: { color: '#fff' }
      },
      y: {
        ticks: { color: '#fff' }
      }
    },
    plugins: {
      legend: { display: false }
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div className="bg-gradient-to-br from-purple-600 to-teal-200 p-4 rounded-xl shadow-lg">
      <h3 className="text-gray-200 text-sm mb-2 text-center">Moon Illumination</h3>
      <div className="h-16">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}
