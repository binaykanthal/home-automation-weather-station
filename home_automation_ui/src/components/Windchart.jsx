import React from 'react';
import { Bar } from 'react-chartjs-2';
import 'chart.js/auto';

export default function WindChart({ speed, gust }) {
  const data = {
    labels: ['Wind Speed', 'Gust'],
    datasets: [{
      label: 'm/s',
      data: [speed, gust],
      backgroundColor: ['#00ddeb', '#6b48ff'],
      borderRadius: 4,
    }]
  };

  const options = {
    indexAxis: 'x',
    scales: {
      x: {
        ticks: { color: '#fff' }
      },
      y: {
        beginAtZero: true,
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
      <h3 className="text-gray-200 text-sm mb-2 text-center">Wind</h3>
      <div className="h-32">
        <Bar data={data} options={options} />
      </div>
    </div>
  );
}