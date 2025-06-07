import React, { useEffect, useState,useRef } from 'react';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';

export default function ForecastChart() {
  const [list, setList] = useState([]);
  const chartRef = useRef();

  useEffect(() => {
    fetch('http://localhost:3000/api/forecast')
      .then(r => r.json())
      .then(setList)
      .catch(console.error);
  }, []);

  const labels = list.map(item => {
    const dateTimeString = item.dt_txt;
    const parts = dateTimeString.split(' '); // Split into date and time
    const datePart = parts[0].split('-').slice(1).join('-'); // Take month and day
    const timePart = parts[1].substring(0, 5); // Take the hour and minute
  
    return `${datePart} ${timePart}`;
  });
  const temps = list.map(item => item.main.temp);
  const hums  = list.map(item => item.main.humidity);

// create gradient after chart mounts
   useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const ctx = chart.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, 200);
    grad.addColorStop(0, 'rgba(107,72,255,0.4)');
    grad.addColorStop(1, 'rgba(107,72,255,0)');
    chart.data.datasets[0].backgroundColor = grad;
    chart.update();
  }, [list]);

  const data = {
    labels,
    datasets: [
      {
        label: 'Temp (°C)',
        data: temps,
        borderColor:'#6b48ff', 
        fill: true,
        backgroundColor:'rgba(218, 215, 55, 0.57)',
        tension: 0.3,
        borderWidth: 2,
      },
      {
        label: 'Humidity (%)',
        borderColor:'#d8c0d8', 
        fill: true,
        backgroundColor:'rgba(125, 104, 241, 0.38)',
        data: hums,
        tension: 0.3,
        borderWidth: 2,
      }
    ]
  };

  const options = {
    responsive: true,
    scales: { y: { beginAtZero: false } },
    plugins: { legend: { labels: { color: '#ddd' } } }
  };

  return (
    <div className="bg-card p-4 rounded-xl shadow-lg">
      <h3 className="text-lg font-semibold text-gray-200 mb-2">5-Day Forecast</h3>
      {list.length
        ? <Line ref = {chartRef} data={data} options={options}/>
        : <p className="text-gray-400">Loading forecast…</p>}
    </div>
  );
}
