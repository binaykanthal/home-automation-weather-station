import React, { useEffect, useState, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';


export default function HistoryChart() {
  const [history, setHistory] = useState([]);
  const wsRef = useRef(null);
  const chartRef = useRef();

 // 1) initial load of stored history
  useEffect(() => {
    fetch('/api/history')
      .then(r => r.json())
      .then(data => setHistory(data))
      .catch(console.error);
  }, []);

   

  //subscribe to Websocket
  useEffect(()=>{
    const ws = new WebSocket(window.location.origin.replace(/^http/, 'ws'));
    wsRef.current= ws;

    ws.onopen = () => console.log('HistoryChart WS connected');
    ws.onmessage = e => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'weather') {
            const point = {
              ts: Date.now(),
              temp: msg.data.main.temp,
              humidity: msg.data.main.humidity
            };
            setHistory(prev => {
              const next = [...prev, point];
              // keep only last 288 points (24 h @ 5 min)
              return next.length > 288 ? next.slice(next.length - 288) : next;
            });
          }
        } catch (err) {
          console.error('HistoryChart WS parse error', err);
        }
      };
      ws.onclose = () => console.log('HistoryChart WS disconnected');
  
      return () => ws.close();
  },[]);

  // build chart data once history arrives
  const chartData = {
    labels: history.map(pt => new Date(pt.ts).toLocaleTimeString()),
    datasets: [
      {
        label: 'Temperature (°C)',
        data: history.map(pt => pt.temp),
        borderColor:'#6b48ff', 
        fill: true,
        backgroundColor:'rgba(218, 215, 55, 0.57)',
        tension: 0.3,
        borderWidth: 1,
      },
      {
        label: 'Humidity (%)',
        borderColor:'#d8c0d8', 
        fill: true,
        backgroundColor:'rgba(125, 104, 241, 0.38)',
        data: history.map(pt => pt.humidity),
        tension: 0.3,
        borderWidth: 1,
      }
    ]
  };

  const options = {
    responsive: true,
    scales: {
      y: { beginAtZero: true }
    },
    plugins: {
      legend: { labels: { color: '#ddd' } }
    }
  };

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
  }, [history]);

  return (
    <div className="bg-card p-4 rounded-xl shadow-lg">
      <h3 className="text-lg font-semibold text-gray-200 mb-2">History (5-min intervals)</h3>
      {history.length > 0 ? (
        <Line data={chartData} ref={chartRef} options={options} />
      ) : (
        <p className="text-gray-400">Gathering data…</p>
      )}
    </div>
  );
}
