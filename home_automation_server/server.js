const express = require("express");
const path = require('path');
const axios = require("axios");
const cron = require("node-cron");
const app = express();
const cors = require('cors');
const bodyParser = require("body-parser");
require('dotenv').config();

app.use(cors());
app.use(bodyParser.json()); 
app.use(express.static(path.join(__dirname, '../home_automation_ui/build')));

const ESP8266_BASE = process.env.ESP8266_BASE_URL;
const OWM_KEY = process.env.OWM_API_KEY;
const WeatherApi_Key = process.env.WEATHERAPI_KEY;

function getCurrentDateFormatted() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const currentDate = getCurrentDateFormatted();

let weatherData = null;
let deviceData = null;
let locationId = 1275004;
let history = [];
let forecastData = null;
let astronomyData = null;
let liveData = null;
let currentCity = "Kolkata";

const WebSocket = require('ws');
//create http server and attah express
const server = require('http').createServer(app);

//create websocket on same http server
const wss = new WebSocket.Server({ server });

// whenever a client connects…
wss.on("connection", ws => {
  console.log("WS client connected");
  ws.send(JSON.stringify({ type: "welcome", msg: "hello client" }));

  // optional: send initial payload
  if (weatherData && deviceData) {
    ws.send(JSON.stringify({ weather: weatherData, device: deviceData }));
  }

  ws.on("error", err => console.error("WS error:", err));
  ws.on("close", () => console.log("WS client disconnected"));
});

// helper to broadcast to all connected clients
function broadcast(payload) {
  const msg = JSON.stringify(payload);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}


// 1) Poll OpenWeather every 5 minutes
async function fetchWeather() {
  try {
    const res = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?id=${locationId}&units=metric&appid=${OWM_KEY}`
    );
    weatherData = res.data;
    console.log("Weather updated:", weatherData.main.temp, "°C");
    // ——— record history point ———
    const point = {
      ts: Date.now(),
      temp: weatherData.main.temp,
      humidity: weatherData.main.humidity
    };
    history.push(point);
    if (history.length > 288) history.shift();

    broadcast({ type: "weather", data: weatherData });
  } catch (err) {
    console.error("Failed to fetch weather:", err.message);
  }
}

//fetch live weather from WeatherAPI
async function fetchLiveWeather(cityToFetch = currentCity) {
    try {
        const res = await axios.get(
            `https://api.weatherapi.com/v1/current.json?key=${WeatherApi_Key}&q=${cityToFetch}&aqi=no`
        );
        liveData = res.data; 
        console.log(`Live Weather updated for ${cityToFetch}:`, liveData.location.name);
        broadcast({ type: "live", data: liveData }); 
        return liveData; // Return the fetched data
    } catch (err) {
        console.error(`Failed to fetch live weather for ${cityToFetch}:`, err.message);
        return null;
    }
}

// Helper to format live data into the required 'row' format
function formatLiveWeatherData(data) {
    if (!data || !data.location || !data.current) {
        console.error("Invalid live weather data structure for formatting.");
        return null;
    }

    const row = {
        'time': data.location.localtime+ ':00',
        'temp': data.current.temp_c,
        'dwpt': data.current.dewpoint_c, 
        'rhum': data.current.humidity,
        'prcp': data.current.precip_mm,
        'wdir': data.current.wind_degree,
        'wspd': data.current.wind_kph,
        'pres': data.current.pressure_mb,
        'coco': data.current.condition.text
    };
    return row;
}

fetchLiveWeather();

cron.schedule("0 */3 * * *", () => {
    console.log("Running scheduled live weather fetch for:", currentCity);
    fetchLiveWeather();
});

// Poll Forcast every 3 hour
async function fetchForcast() {
  try {
    const res = await axios.get(
      `https://api.openweathermap.org/data/2.5/forecast?id=${locationId}&units=metric&appid=${OWM_KEY}`
    );
    forecastData = res.data;
    console.log("forecast updated:");

    broadcast({ type: "forecast", data: forecastData });
  } catch (err) {
    console.error("Failed to fetch forecast:", err.message);
  }
}
fetchWeather();
fetchForcast();
// run immediately, then every 5min
cron.schedule("*/5 * * * *", fetchWeather);
cron.schedule("0 */3 * * *", fetchForcast);


//fetch moon details from weatherapi.com
async function fetchAstronomy() {
  try {
    const res = await axios.get(
      `https://api.weatherapi.com/v1/astronomy.json?key=${WeatherApi_Key}&q=22.4731,88.1784&dt=${currentDate}`
    );
    astronomyData = res.data;
    console.log("AstronomyData: ", astronomyData.astronomy.astro)
    broadcast({ type: "astronomy", data: astronomyData });
  } catch (error) {
  console.error("Failed to fetch astronomy data:", error.message);
}
}

fetchAstronomy();
cron.schedule("0 */3 * * *", fetchAstronomy);


//new endpoint: let UI select location
app.post("/api/location", (req, res) => {
  const { id } = req.body;
  if (!id || isNaN(id)) {
    return res.status(400).json({ error: "Invalid location id" });
  }
  locationId = id;
  console.log("Changed locationId to", locationId);
  // Immediately fetch new weather for the new location:
  fetchWeather();
  fetchForcast();
  fetchAstronomy();
  res.json({ success: true, locationId });
}); 


// POST endpoint for predictions
app.post("/api/predict", async (req, res) => {
    const { city, hours } = req.body; 
    if (!city) {
        return res.status(400).json({ error: "City is required for prediction." });
    }
    currentCity = city;
    console.log(`Prediction request: City changed to ${currentCity}`);
    const fetchedLiveData = await fetchLiveWeather(currentCity);
    if (!fetchedLiveData) {
        return res.status(500).json({ error: "Could not fetch live weather data for prediction." });
    }
    const formattedRow = formatLiveWeatherData(fetchedLiveData);
    if (!formattedRow) {
        return res.status(500).json({ error: "Failed to format live weather data." });
    }
    console.log("Formatted live data for Flask:", formattedRow);
    try {
        const flaskResponse = await axios.post('http://localhost:5001/predict', {
            live: formattedRow, 
            hours: hours || 5 
        });
        console.log("Predictions received from Flask:", flaskResponse.data);
        res.json(flaskResponse.data);

    } catch (flaskError) {
        console.error("Error calling Flask API:", flaskError.message);
        if (flaskError.response) {
            console.error("Flask response data:", flaskError.response.data);
            console.error("Flask response status:", flaskError.response.status);
            console.error("Flask response headers:", flaskError.response.headers);
        } else if (flaskError.request) {
            console.error("No response received from Flask:", flaskError.request);
        } else {
            console.error("Error setting up Flask request:", flaskError.message);
        }
        res.status(500).json({ error: "Failed to get predictions from Flask API." });
    }
});

// 2) GET /api/status
app.get("/api/status", async (req, res) => {
  try {
    // fetch device JSON
    const dev = await axios.get(`${ESP8266_BASE}/status`);
    deviceData = dev.data;
     } catch (err) {
    console.warn("ESP8266 unreachable – returning empty device object:", err.message);
    // fallback: all relays off, temp null (or whatever makes sense)
    deviceData = {
      relay1: 0, relay2: 0, relay3: 0,
      relay4: 0, relay5: 0, relay6: 0, relay7: 0,
      temp: null
    };
  }
     res.json({
      weather: weatherData,   
      device: deviceData
    });
});

// 3) POST /api/relay
app.post("/api/relay", async (req, res) => {
  const { id } = req.body;
  if (![1, 2, 3, 4, 5, 6, 7].includes(id)) {
    return res.status(400).json({ error: "Invalid relay id" });
  }
  try {
    await axios.post(`${ESP8266_BASE}/relay?id=${id}`);
    // fetch the new device state
    const dev = await axios.get(`${ESP8266_BASE}/status`);
    deviceData = dev.data;              // ← store it
    broadcast({ type: "device", data: deviceData });

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4) serve history array
app.get("/api/history", (req, res) => {
  res.json(history);
});

//get forecast api
app.get("/api/forecast", (req, res) => {
  // forecastData was set in fetchForcast()
  if (!forecastData || !forecastData.list) {
    return res.status(503).json({ error: "Forecast not ready" });
  }
  res.json(forecastData.list);
});

//get Astronomy api
app.get("/api/astronomy", (req, res) => {
  // astronomy data was set in fetchAstronomy()
  if (!astronomyData) {
    return res.status(503).json({ error: "Astronomy not ready" });
  }
  res.json(astronomyData);
});


app.get('.', (req, res) => {
  res.sendFile(path.join(__dirname, '../home_automation_ui/build/index.html'));
});


// start server
const PORT = process.env.PORT || 3000 ;
server.listen(PORT, () => console.log(`API + WS listening on port ${PORT}`));
