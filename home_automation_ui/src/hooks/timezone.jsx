
import useClock from './useClock';


function Timezone({ weather }) {
    const now = useClock(10000);

  if (!weather || !weather.sys || weather.sys.sunrise === undefined || weather.sys.sunset === undefined || weather.timezone === undefined) {
    return null; // Or some loading/error state
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
  const formatUTCDateWithOffset = (date, offsetSeconds) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    const offsetSign = offsetSeconds >= 0 ? '+' : '-';
    const offsetHours = String(Math.floor(Math.abs(offsetSeconds) / 3600)).padStart(2, '0');
    const offsetMinutes = String(Math.floor((Math.abs(offsetSeconds) % 3600) / 60)).padStart(2, '0');

    return `${hours}:${minutes}:${seconds} GMT${offsetSign}${offsetHours}${offsetMinutes}`;
  };

  // For debugging, log these values correctly in the weather location's time
  console.log("Sunrise (UTC ms):", sunriseUtcMs);
  console.log("Sunset (UTC ms):", sunsetUtcMs);
  console.log("Timezone Offset (seconds):", timezoneOffsetSeconds);
  console.log("Sunrise (Location Time):", formatUTCDateWithOffset(sunriseLocalDate, timezoneOffsetSeconds));
  console.log("Sunset (Location Time):", formatUTCDateWithOffset(sunsetLocalDate, timezoneOffsetSeconds));

  // Adjust the user's local time to the location's time for brightness calculation
  const nowUtcMs = now.getTime() + now.getTimezoneOffset() * 60 * 1000; // Convert local time to UTC
  const nowAtLocationMs = nowUtcMs + timezoneOffsetMs; // Adjust UTC to the location's time

  const dayLenMs = sunsetUtcMs - sunriseUtcMs;
  const elapsedMs = Math.max(0, Math.min(nowAtLocationMs - sunriseUtcMs, dayLenMs > 0 ? dayLenMs : 0));

  const nightLenMs = (86400000-dayLenMs);
  const elapsedNightMs = Math.max(0, Math.min(nowAtLocationMs - sunsetUtcMs, nightLenMs > 0 ? nightLenMs : 0));
  const t = dayLenMs > 0 ? elapsedMs / dayLenMs : 0;
  const t1 = nightLenMs>0 ? elapsedNightMs /nightLenMs: 0;
  const b = 0.5 + 0.5 * Math.sin(Math.PI * t);
  const brightness = b * 0.8 + 0.5;

  const backgroundStyle = {
    backgroundColor: `rgba(0, 0, 0, ${1 - brightness})`,
  };

  return <div style={backgroundStyle}>Your Content</div>;
}

export default Timezone;