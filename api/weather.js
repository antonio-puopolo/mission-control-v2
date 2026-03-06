export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Brisbane coordinates
    const url = 'https://api.open-meteo.com/v1/forecast?latitude=-27.4705&longitude=153.0260&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&timezone=Australia%2FBrisbane&forecast_days=3';

    const response = await fetch(url);
    const data = await response.json();

    const weatherDescriptions = {
      0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
      45: 'Foggy', 48: 'Foggy', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
      61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Light snow', 73: 'Snow',
      75: 'Heavy snow', 80: 'Light showers', 81: 'Showers', 82: 'Heavy showers',
      95: 'Thunderstorm', 96: 'Thunderstorm with hail', 99: 'Thunderstorm with heavy hail',
    };

    const c = data.current;
    const d = data.daily;

    const summary = {
      location: 'Brisbane, Australia',
      current: {
        temperature: Math.round(c.temperature_2m),
        feels_like: Math.round(c.apparent_temperature),
        humidity: c.relative_humidity_2m,
        wind_speed: Math.round(c.wind_speed_10m),
        conditions: weatherDescriptions[c.weather_code] || 'Unknown',
      },
      today: {
        high: Math.round(d.temperature_2m_max[0]),
        low: Math.round(d.temperature_2m_min[0]),
        conditions: weatherDescriptions[d.weather_code[0]] || 'Unknown',
        rain_chance: d.precipitation_probability_max[0],
      },
      tomorrow: {
        high: Math.round(d.temperature_2m_max[1]),
        low: Math.round(d.temperature_2m_min[1]),
        conditions: weatherDescriptions[d.weather_code[1]] || 'Unknown',
        rain_chance: d.precipitation_probability_max[1],
      },
    };

    res.status(200).json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
