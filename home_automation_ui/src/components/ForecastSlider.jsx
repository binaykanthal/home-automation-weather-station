import React, { useEffect, useState } from 'react';
import { groupByDate } from '../utils/groupByDate';

export default function ForecastSlider() {
  const [byDay, setByDay] = useState({});

  useEffect(() => {
    fetch('http://localhost:3000/api/forecast')
      .then(r => r.json())
      .then(list => setByDay(groupByDate(list)))
      .catch(console.error);
  }, []);

  const days = Object.keys(byDay);

  return (
    <div className="bg-card p-4 rounded-xl shadow-lg">
      <div className="flex space-x-4 overflow-x-auto snap-x snap-mandatory">
        {days.map(day => {
          const items = byDay[day];
          // pick midday reading or first
          const mid = items[Math.floor(items.length/2)];
          const icon = mid.weather[0].icon;
          const temp = mid.main.temp.toFixed(1);
          const hum  = mid.main.humidity;
          return (
            <div
              key={day}
              className="flex-none w-40 p-3 bg-gray-800 rounded-lg snap-center"
            >
              <p className="text-center text-sm text-gray-400">{day}</p>
              <img
                src={`http://openweathermap.org/img/wn/${icon}@2x.png`}
                alt=""
                className="mx-auto"
              />
              <p className="text-center text-xl text-white">{temp}°C</p>
              <p className="text-center text-sm text-gray-300">{hum}% RH</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
