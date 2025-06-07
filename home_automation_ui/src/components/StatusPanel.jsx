import React, { useEffect, useState, useRef } from 'react';
import Card from './Cards';
import RelayControls from './RelayControls';
import HistoryChart from './HistoryChart';
import ForecastChart from './ForecastChart';
import ForecastSlider from './ForecastSlider';
import Sky from './Sky';
import useClock from '../hooks/useClock';
import LocationSelector from './LocationSelector';
import CloudPie from './CloudPie';
import WindChart from './Windchart';
import IlluminationChart from './IlluminationChart';
import MoonPhase from './MoonPhase';
import Predictions from './Predictions';


const StatusPanel = () => {
  const [weather, setWeather] = useState(null);
  const [device, setDevice] = useState(null);
  const wsRef = useRef(null);
  const [astronomy, setAstronomy] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');

  const menuItems = [
    { key: 'overview', label: 'What Am I', sub: 'Brief Description' },
    { key: 'location', label: 'Location', sub: 'Choose city' },
    { key: 'today', label: "Today's Overview", sub: 'Current weather details' },
    { key: 'history', label: 'AI Weather Prediction', sub: 'Past data & rain chance' },
    { key: 'forecast', label: 'Charts', sub: '5‑day outlook' },
    { key: 'relays', label: 'IOT Controls', sub: 'Device controls' },
    { key: 'settings', label: 'Settings', sub: 'App preferences' },
  ];

  const handleClick = key => {
    setActiveSection(prev => (prev === key ? 'overview' : key));
  };

  // live clock
  const now = useClock(10000);

  useEffect(() => {
    console.log("✅ StatusPanel useEffect firing - fetching /api/status");
    fetch('/api/status')
      .then(res => res.json())
      .then(({ weather, device }) => {
        setWeather(weather);
        setDevice(device);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetch('/api/astronomy')
      .then(res => res.json())
      .then(({ astronomy }) => {
        setAstronomy(astronomy);
      })
      .catch(console.error);
  }, []);

  // WebSocket for live updates
  useEffect(() => {
    // open WS on same host:port
    const ws = new WebSocket(window.location.origin.replace(/^http/, 'ws'));
    wsRef.current = ws;

    ws.onopen = () => console.log('WS connected');
    ws.onmessage = e => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'weather') {
          setWeather(msg.data);
        }
        if (msg.type === 'device') {
          setDevice(msg.data);
        }
      } catch (err) {
        console.error('WS parse error', err);
      }
    };
    ws.onclose = () => console.log('WS disconnected');

    return () => ws.close();
  })



  if (!weather) { return (<p className="text-3xl font-bold">No Weather Data Present</p>) }

  const sunriseUtcMs = weather.sys.sunrise * 1000;
  const sunsetUtcMs = weather.sys.sunset * 1000;
  const timezoneOffsetSeconds = weather.timezone; // Timezone in seconds east of UTC
  const timezoneOffsetMs = timezoneOffsetSeconds * 1000;

  // Calculate sunrise and sunset in the weather location's local time (milliseconds since epoch)
  const sunriseLocationMs = sunriseUtcMs + timezoneOffsetMs;
  const sunsetLocationMs = sunsetUtcMs + timezoneOffsetMs;

  // Create Date objects based on these milliseconds (which are now in the location's time)
  const sunriseLocalDate = new Date(sunriseLocationMs);
  const sunsetLocalDate = new Date(sunsetLocationMs);
  // Adjust the user's local time to the location's time for brightness calculation
  const nowUtcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000; // Convert local time to UTC
  const nowAtLocationMs = nowUtcMs + timezoneOffsetMs; // Adjust UTC to the location's time
  const nowLocalDate= new Date(nowAtLocationMs);
  
  // Function to format a UTC Date object and append the timezone offset
  const formatUTCDateWithOffset = (date) => {
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const dayLenMs = sunsetUtcMs - sunriseUtcMs;
  const elapsedMs = Math.max(0, Math.min(nowAtLocationMs - sunriseUtcMs, dayLenMs > 0 ? dayLenMs : 0));
  const t = dayLenMs > 0 ? elapsedMs / dayLenMs : 0;
  const b = 0.5 + 0.5 * Math.sin(Math.PI * t);
  const brightness = b * 0.8 + 0.5;


  const moonrise = astronomy.astro.moonrise;
  const moonset = astronomy.astro.moonset;
  const moon_phase = astronomy.astro.moon_phase;
  const moon_illumination = astronomy.astro.moon_illumination;


  return (
    <div
      className="relative h-screen overflow-hidden"
      style={{ filter: `brightness(${brightness})` }}
    >
      {/* Sky in back */}
      <Sky
        now={now}
        sunrise={sunriseUtcMs}
        sunset={sunsetUtcMs}
        timezone={timezoneOffsetMs}
        className="absolute inset-0 z-0"
      />
      {/* Main UI wrapper */}
      <div className="relative z-10 h-full pt-12 px-6 pb-6 flex overflow-hidden">

        <header className="fixed top-0 left-0 w-full h-12 flex items-center bg-gray-900 bg-opacity-50 text-gray-200 px-6 z-20s">
          {/* Left: page title */}
          <div className="flex-1">
            <h1 className="text-lg font-semibold">Weather Station</h1>
          </div>
          {/* Center: date picker & search */}
          <div className="flex-1 flex justify-center items-center space-x-4">
            {/* Date picker placeholder */}
            <button className="px-3 py-1 bg-gray-800 rounded hover:bg-gray-700">
              Select Date
            </button>
            {/* Search icon */}
            <button className="p-1 hover:bg-gray-800 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            </button>
          </div>
          {/* Right: notifications & avatar */}
          <div className="flex-1 flex justify-end items-center space-x-4">
            {/* Notification bell */}
            <button className="p-1 hover:bg-gray-800 rounded relative">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14V9a6 6 0 10-12 0v5c0 .386-.146.734-.405 1.005L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {/* red dot */}
              <span className="absolute top-0 right-0 block w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            {/* Avatar placeholder */}
            <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* ← Sidebar / Vertical menu */}
          <aside className="w-48 flex-shrink-0 bg-gray-900 bg-opacity-50 p-4 overflow-y-auto min-h-0">
            <h2 className="text-xl font-semibold text-gray-200 mb-4">Menu</h2>
            <nav className="space-y-3">
              {menuItems.map(item => {
                const isActive = activeSection === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleClick(item.key)}
                    className={`
                        w-full text-left transition
                        ${isActive
                        ? 'bg-gradient-to-br from-purple-600 to-teal-500 p-4 rounded-xl shadow-lg text-white'
                        : 'text-gray-100 hover:text-white hover:bg-gray-800 p-2 rounded'}
                      `}
                  >
                    <span className={`font-medium ${isActive ? '' : 'text-gray-100'}`}>
                      {item.label}
                    </span>
                    <br />
                    <span className={`text-xs ${isActive ? 'text-gray-200' : 'text-gray-400'}`}>
                      {item.sub}
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="flex-1 flex flex-col overflow-hidden min-h-0">
            {(() => {
              switch (activeSection) {
                case 'overview':
                default:
                  return (
                    <div className="flex-1 overflow-hidden min-h-0">

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 h-full p-6">

                        <div className="bg-gradient-to-br from-purple-600 to-teal-200 p-4 rounded-xl shadow-lg
                        flex flex-col items-center justify-center text-white transform transition-all duration-300
                        ease-in-out hover:scale-105 hover:shadow-xl hover:-translate-y-1 cursor-auto">
                          <button
                          key={"location"}
                          onClick={() => handleClick("location")}
                          className='cursor-pointer'
                          >
                          <img src='/location.png' alt='Location icon'/>
                          </button>
                          <p className="text-2xl">Location</p>
                          <p className="text-lg text-center mt-1">You can search by location code (ID) to view that place's weather.</p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-600 to-teal-200 p-4 rounded-xl shadow-lg
                        flex flex-col items-center justify-center text-white transform transition-all duration-300
                        ease-in-out hover:scale-105 hover:shadow-xl hover:-translate-y-1 cursor-auto">
                          <button
                          key={"today"}
                          onClick={() => handleClick("today")}
                          className='cursor-pointer'
                          >
                          <img src='/today.png' alt='Today icon'/>
                          </button>
                          <p className="text-2xl">Today's Overview</p>
                          <p className="text-lg text-center mt-1">See the current temperature, humidity, sunrise/set times, and conditions.</p>
                        </div>

                        <div className="bg-gradient-to-br from-purple-600 to-teal-200 p-4 rounded-xl shadow-lg
                        flex flex-col items-center justify-center text-white transform transition-all duration-300
                        ease-in-out hover:scale-105 hover:shadow-xl hover:-translate-y-1 cursor-auto">
                          <button
                          key={"history"}
                          onClick={() => handleClick("history")}
                          className='cursor-pointer'
                          >
                          <img src='/ai.png' alt='AI icon'/>
                          </button>
                          <p className="text-2xl">AI Weather Prediction</p>
                          <p className="text-lg text-center mt-1">Review past temperature/humidity readings and the chance of rain.</p>
                        </div>

                        <div className="bg-gradient-to-br from-purple-600 to-teal-200 p-4 rounded-xl shadow-lg
                        flex flex-col items-center justify-center text-white transform transition-all duration-300
                        ease-in-out hover:scale-105 hover:shadow-xl hover:-translate-y-1 cursor-auto">
                          <button
                          key={"forecast"}
                          onClick={() => handleClick("forecast")}
                          className='cursor-pointer'
                          >
                          <img src='/forecast.png' alt='Forecast icon'/>
                          </button>
                          <p className="text-2xl">Charts</p>
                          <p className="text-lg text-center mt-1">View the 5-day forecast in 3-hour increments with temperature and humidity trends.</p>
                        </div>

                        <div className="bg-gradient-to-br from-purple-600 to-teal-200 p-4 rounded-xl shadow-lg
                        flex flex-col items-center justify-center text-white transform transition-all duration-300
                        ease-in-out hover:scale-105 hover:shadow-xl hover:-translate-y-1 cursor-auto">
                          <button
                          key={"relays"}
                          onClick={() => handleClick("relays")}
                          className='cursor-pointer'
                          >
                          <img src='/iot.png' alt='IOT icon'/>
                          </button>
                          <p className="text-2xl">IOT Controls</p>
                          <p className="text-lg text-center mt-1">Control your devices (lights, fans, etc.) remotely via the relay panel.</p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-600 to-teal-200 p-4 rounded-xl shadow-lg
                        flex flex-col items-center justify-center text-white transform transition-all duration-300
                        ease-in-out hover:scale-105 hover:shadow-xl hover:-translate-y-1 cursor-auto">
                          <button
                          key={"settings"}
                          onClick={() => handleClick("settings")}
                          className='cursor-pointer'
                          >
                          <img src='/settings.png' alt='Settings icon'/>
                          </button>
                          <p className="text-2xl">Settings</p>
                          <p className="text-lg text-center mt-1">Change parameters of the fields to get desired results.</p>
                        </div>
                      </div>
                    </div>

                  );

                case 'relays':
                  return (

                    <div className="w-full h-full overflow-y-auto">

                      <Card title="Control Board" className="flex-1 overflow-auto">
                        Available in local set up .Coming soon in web application
                      </Card>
                    </div>
                  );

                case 'location':
                  return (

                    <div className="w-full h-full overflow-y-auto">

                      <Card className="flex-1 overflow-auto">
                        <LocationSelector />
                      </Card>
                    </div>
                  );

                case 'today':
                  return (

                    <div className="p-6 flex-1 overflow-hidden min-h-0">

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 h-full">
                        {/* Weather Icon + Temp */}
                        <div className="bg-gradient-to-br from-purple-600 to-teal-200 p-4 rounded-xl shadow-lg flex flex-col items-center">
                          <img
                            src={`http://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`}
                            alt={weather.weather[0].description}
                            className="w-16 h-16 mb-2"
                          />
                          <p className="capitalize text-lg">{weather.weather[0].description}</p>
                          <p className="text-3xl font-bold">{weather.main.temp.toFixed(1)}°C</p>
                        </div>

                        {/* Sunrise / Sunset */}
                        <div className="bg-gradient-to-br from-purple-600 to-teal-200 p-4 rounded-xl shadow-lg">
                          <div className="flex justify-between">
                            <div className="text-center">
                              <p className="text-sm text-gray-200">Sunrise</p>
                              <p className="text-2xl font-bold">
                                {formatUTCDateWithOffset(sunriseLocalDate, timezoneOffsetSeconds)}
                              </p>
                              <div>
                                <img src='/sunrise.gif' alt='Sunrise animation' />
                              </div>
                            </div>
                            <div className="text-center">
                              <p className="text-sm text-gray-200">Sunset</p>
                              <p className="text-2xl font-bold">
                                {formatUTCDateWithOffset(sunsetLocalDate, timezoneOffsetSeconds)}
                              </p>
                              <div>
                                <img src='/sunset.gif' alt='Sunset animation' />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Humidity/temperature feels_like */}
                        <div className="bg-gradient-to-br from-purple-600 to-teal-200 p-4 rounded-xl shadow-lg">
                          <div className="flex justify-between">
                            <div className="text-center">
                              <img src='/humidity.png' alt='Humidity' />
                              <p className="text-lg">Humidity</p>
                              <p className="text-2xl font-bold">{weather.main.humidity}%</p>
                            </div>
                            <div className="text-center">
                              <img src='/temperature.png' alt='feels like' />
                              <p className="text-lg">Feels like</p>
                              <p className="text-2xl font-bold">{weather.main.feels_like}°C</p>
                            </div>
                          </div>
                        </div>

                        {/* Moonrise / Moonset */}
                        <div className="bg-gradient-to-br from-purple-600 to-teal-200 p-4 rounded-xl shadow-lg">
                          <div className="flex justify-between">
                            <div className="text-center">
                              <p className="text-sm text-gray-200">Moonrise</p>
                              <p className="text-2xl font-bold">
                                {moonrise}
                              </p>
                              <img src='/moonrise.png' alt='Moonrise' />
                            </div>
                            <div className="text-center">
                            
                              <p className="text-sm text-gray-200">Moonset</p>
                              <p className="text-2xl font-bold">
                                {moonset}
                              </p>
                              <img src='/moonset.png' alt='Moonset' />
                            </div>
                          </div>
                        </div>

                        {/* Moon Phase */}
                        <div className="bg-gradient-to-br from-purple-600 to-teal-200 p-4 rounded-xl shadow-lg flex flex-col items-center">
                          <p className="text-sm text-gray-200">Moon Phase</p>
                          <p className="text-2xl font-bold">{moon_phase}</p>
                          <div>
                            <MoonPhase phase={moon_phase} />
                          </div>
                        </div>

                        {/* Moon Illumination */}
                        <IlluminationChart illum={moon_illumination} />

                        {/* Wind Speed/Gust */}
                        <WindChart speed={weather.wind.speed} gust={weather.wind.gust} />

                        {/* Clouds Pie Chart */}
                        <div className="bg-gradient-to-br from-purple-600 to-teal-200 p-4 rounded-xl shadow-lg flex flex-col items-center">
                          <p className="text-sm text-gray-200 mb-2">Cloud Coverage</p>
                          <CloudPie clouds={weather.clouds.all} />
                        </div>
                        <div>
                          {formatUTCDateWithOffset(nowLocalDate, timezoneOffsetSeconds)}
                        </div>
                      </div>
                    </div>
                  );

                case 'history':
                  return (

                    <div className="w-full h-full overflow-y-auto bg-chartbg">
                      <Card className="flex-1 overflow-auto"
                      title={"AI Weather Prediction"}
                      >
                        <Predictions />
                      </Card>
                       <Card className="flex-1 overflow-auto"
                       title={"5-Day Forecast"}
                       >
                        <ForecastSlider />
                      </Card>
                    </div>
                  );

                case 'forecast':
                  return (
                    
                      <div className="w-full h-full overflow-y-auto ">
                        <Card className="flex-1 bg-chartbg">
                          <HistoryChart />
                        </Card>
                      
                      <Card className="flex-1  bg-chartbg">
                        <ForecastChart />
                      </Card>
                    </div>
                    
                  );
              }
            })()}
          </main>
        </div>

      </div>
    </div>
  );

}
export default StatusPanel;

