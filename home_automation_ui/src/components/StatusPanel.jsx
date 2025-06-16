import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  const [aqi, setAQI] = useState(null);
  const [aqiMsg, setAQIMsg] = useState("");
  const [locationError, setLocationError] = useState(false);
  const [manualQuery, setManualQuery] = useState('');
  const [manualError, setManualError] = useState(null);

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

  const fetchWithRetry = async (url, retries = 1, delay = 500) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return await res.json();
      } catch (err) {
        console.warn(`Fetch failed for ${url} (attempt ${attempt + 1}):`, err);
        if (attempt < retries) {
          await new Promise(res => setTimeout(res, delay));
        }
      }
    }
    return null;
  };

  const loadAllData = useCallback(async () => {

    const [statusData, aqiData, astronomyData] = await Promise.all([
      fetchWithRetry("/api/status"),
      fetchWithRetry("/api/aqi"),
      fetchWithRetry("/api/astronomy")
    ]);

    if (statusData) {
      const { weather: w, device: d } = statusData;
      setWeather(w);
      setDevice(d);
    }

    if (aqiData) {
      const { aqi: ai } = aqiData;
      setAQI(ai);
    }

    if (astronomyData) {
      const { astronomy: astro } = astronomyData;
      setAstronomy(astro);
    }

  }, []);

  useEffect( async() => {
    const locationPref = JSON.parse(localStorage.getItem("locationPref"));

    if (locationPref) {
      fetch("/api/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: String(locationPref.name).split(" - ")[0],
          lat: locationPref.lat,
          lon: locationPref.lon
        })
      });
      await loadAllData();
    }
    else if (navigator.geolocation) {

      navigator.geolocation.getCurrentPosition(
        async ({ coords }) => {
          try {
            const rev = await fetch("/api/reverselocation", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                lat: coords.latitude,
                lon: coords.longitude
              })
            });
            const place = await rev.json();
            const pref = {
              source: "geo",
              lat: place.lat,
              lon: place.lon,
              name: place.name
            };
            localStorage.setItem("locationPref", JSON.stringify(pref));

            await fetch("/api/location", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: String(place.name).split(' - ')[0],
                lat: place.lat,
                lon: place.lon
              })
            });

            await loadAllData();

          } catch (err) {
            console.error("Failed initial data load:", err);
          }
        },
        err => {
          console.warn("Geolocation error:", err.message);
          setLocationError(true);
        }
      );
    }
  }, [loadAllData]);

  useEffect(() => {
    let msg;
    switch (aqi) {
      case 1: msg = "Good"
        break;
      case 2: msg = "Fair"
        break;
      case 3: msg = "Moderate"
        break;
      case 4: msg = "Poor"
        break;
      case 5: msg = "Very Bad"
        break;
      default: msg = "No AQI details available"
        break;
    }
    setAQIMsg(msg);
  }, [aqi]);

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

  if (locationError) {
    return (
      <div className="p-6">
        <p className="text-3xl font-bold text-center mb-6">
          Please allow location access, or enter your city manually:
        </p>

        <div className="max-w-md mx-auto">
          <input
            type="text"
            value={manualQuery}
            onChange={e => setManualQuery(e.target.value)}
            placeholder="e.g. London, UK"
            className="w-full p-3 rounded border border-gray-600 bg-gray-800 text-white mb-2"
          />
          {manualError && (
            <p className="text-red-400 mb-2">{manualError}</p>
          )}
          <button
            onClick={async () => {
              if (!manualQuery.trim()) {
                setManualError('Please enter a city name.')
                return
              }
              setManualError(null)
              try {
                // hit your location endpoint
                const geo = await fetch("/api/geolocation", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ location: manualQuery.trim() })
                });
                const place = await geo.json();
                const pref = {
                  source: "manual",
                  lat: place.lat,
                  lon: place.lon,
                  name: place.name
                };
                localStorage.setItem("locationPref", JSON.stringify(pref));

                await fetch("/api/location", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    id: String(place.name).split(' - ')[0],
                    lat: place.lat,
                    lon: place.lon
                  })
                });

                await loadAllData();
                // clear the error + manualQuery if you like:
                setManualError(null)
                setManualQuery('')
                setLocationError(false)   // switch into the normal rendering path
              } catch (err) {
                console.error(err)
                setManualError('Failed to set location. Try again.')
              }
            }}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white p-3 rounded"
          >
            Set Location
          </button>
        </div>
      </div>
    )
  }

  if (!weather || !device) {
    return <p className="text-2xl text-center mt-10">Loading IOT & weather…</p>;
  }
  if (aqi === null) {
    return <p className="text-xl text-center mt-10">Loading AQI…</p>;
  }
  if (!astronomy) {
    return <p className="text-xl text-center mt-10">Loading Astronomy…</p>;
  }

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


  // Function to format a UTC Date object and append the timezone offset
  const formatUTCDateWithOffset = (date) => {
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Adjust the user's local time to the location's time for brightness calculation
  const nowUtcMs = now.getTime();// Convert local time to UTC
  const nowAtLocationMs = nowUtcMs + timezoneOffsetMs;
  const nowLocalDate = new Date(nowAtLocationMs);

  const dayLenMs = sunsetUtcMs - sunriseUtcMs;
  const elapsedMs = Math.max(0, Math.min(nowAtLocationMs - sunriseUtcMs, dayLenMs > 0 ? dayLenMs : 0));
  const t = dayLenMs > 0 ? elapsedMs / dayLenMs : 0;
  const b = 0.5 + 0.5 * Math.sin(Math.PI * t);
  const brightness = b * 0.8 + 0.5;


  const moonrise = astronomy?.astro?.moonrise || '--:--';
  const moonset = astronomy?.astro?.moonset || '--:--';
  const moon_phase = astronomy?.astro?.moon_phase || '--:--';
  const moon_illumination = astronomy?.astro?.moon_illumination || '--:--';


  if (weather && aqi && astronomy) {
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
        <div className="relative z-10 h-full pt-12 pb-6 flex overflow-hidden">

          <header className="fixed top-0 left-0 w-full h-12 flex items-center bg-gray-900 bg-opacity-50 text-gray-200 px-6 z-20s">
            {/* Left: page title */}
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Weather Station</h1>
            </div>
            {/* Center: date picker & search */}
            <div className="flex-1 flex justify-center items-center space-x-4">
              {/* 
            <button className="px-3 py-1 bg-gray-800 rounded hover:bg-gray-700">
              Select Date
            </button>
            <button className="p-1 hover:bg-gray-800 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
            </button>
          </div>
          <div className="flex-1 flex justify-end items-center space-x-4">
           
            <button className="p-1 hover:bg-gray-800 rounded relative">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14V9a6 6 0 10-12 0v5c0 .386-.146.734-.405 1.005L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-0 right-0 block w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            
            <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
          */}
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
                              <img src='/location.png' alt='Location icon' />
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
                              <img src='/today.png' alt='Today icon' />
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
                              <img src='/ai.png' alt='AI icon' />
                            </button>
                            <p className="text-2xl">AI Weather Prediction</p>
                            <p className="text-lg text-center mt-1">AI Weather Prediction and 5 day forecast</p>
                          </div>

                          <div className="bg-gradient-to-br from-purple-600 to-teal-200 p-4 rounded-xl shadow-lg
                        flex flex-col items-center justify-center text-white transform transition-all duration-300
                        ease-in-out hover:scale-105 hover:shadow-xl hover:-translate-y-1 cursor-auto">
                            <button
                              key={"forecast"}
                              onClick={() => handleClick("forecast")}
                              className='cursor-pointer'
                            >
                              <img src='/forecast.png' alt='Forecast icon' />
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
                              <img src='/iot.png' alt='IOT icon' />
                            </button>
                            <p className="text-2xl">IOT Controls</p>
                            <p className="text-lg text-center mt-1">Control your devices (lights, fans, etc.) remotely via the relay panel.</p>
                          </div>
                          <div className="bg-gradient-to-br from-purple-600 to-teal-200 p-4 rounded-xl shadow-lg
                        flex flex-col items-center justify-center transform transition-all duration-300
                        ease-in-out hover:scale-105 hover:shadow-xl hover:-translate-y-1 cursor-auto">
                            <button
                              key={"settings"}
                              onClick={() => handleClick("settings")}
                              className='cursor-pointer'
                            >
                              <img src='/settings.png' alt='Settings icon' />
                            </button>
                            <p className="text-2xl">Settings</p>
                            <p className="text-lg text-gray-200 text-center mt-1">Change parameters of the fields to get desired results. Coming soon ...</p>
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
                            <p className="capitalize text-lg text-gray-200">{weather.weather[0].description}</p>
                            <p className="text-3xl font-bold text-gray-200">{weather.main.temp.toFixed(1)}°C</p>
                          </div>

                          <div className="bg-gradient-to-br from-purple-600 to-teal-200 p-4 rounded-xl shadow-lg flex flex-col items-center ">
                            <p className="text-sm text-gray-200 mb-2">Local Time</p>
                            <p className="text-2xl font-bold">
                              {formatUTCDateWithOffset(nowLocalDate)}
                            </p>
                            <p className="text-sm text-gray-200 mb-2">Air Quality Index : {aqi}</p>
                            <p className="text-2xl font-bold text-gray-200">
                              {aqiMsg}
                            </p>
                          </div>

                          {/* Sunrise / Sunset */}
                          <div className="bg-gradient-to-br from-purple-600 to-teal-200 p-4 rounded-xl shadow-lg">
                            <div className="flex justify-between">
                              <div className="text-center">
                                <p className="text-sm text-gray-200">Sunrise</p>
                                <p className="text-2xl font-bold text-gray-200">
                                  {formatUTCDateWithOffset(sunriseLocalDate, timezoneOffsetSeconds)}
                                </p>
                                <div>
                                  <img src='/sunrise.gif' alt='Sunrise animation' />
                                </div>
                              </div>
                              <div className="text-center">
                                <p className="text-sm text-gray-200">Sunset</p>
                                <p className="text-2xl font-bold text-gray-200">
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
                                <p className="text-lg text-gray-200">Humidity</p>
                                <p className="text-2xl font-bold text-gray-200">{weather.main.humidity}%</p>
                              </div>
                              <div className="text-center">
                                <img src='/temperature.png' alt='feels like' />
                                <p className="text-lg text-gray-200">Feels like</p>
                                <p className="text-2xl font-bold text-gray-200">{weather.main.feels_like}°C</p>
                              </div>
                            </div>
                          </div>

                          {/* Moonrise / Moonset */}
                          <div className="bg-gradient-to-br from-purple-600 to-teal-200 p-4 rounded-xl shadow-lg">
                            <div className="flex justify-between">
                              <div className="text-center">
                                <p className="text-sm text-gray-200">Moonrise</p>
                                <p className="text-2xl font-bold text-gray-200">
                                  {moonrise}
                                </p>
                                <img src='/moonrise.png' alt='Moonrise' />
                              </div>
                              <div className="text-center">

                                <p className="text-sm text-gray-200">Moonset</p>
                                <p className="text-2xl font-bold text-gray-200">
                                  {moonset}
                                </p>
                                <img src='/moonset.png' alt='Moonset' />
                              </div>
                            </div>
                          </div>

                          {/* Moon Phase */}
                          <div className="bg-gradient-to-br from-purple-600 to-teal-200 p-4 rounded-xl shadow-lg flex flex-col items-center">
                            <p className="text-sm text-gray-200">Moon Phase</p>
                            <p className="text-2xl font-bold text-gray-200">{moon_phase}</p>
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
}
export default StatusPanel;

