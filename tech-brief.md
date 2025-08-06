# Tech Brief: Implementing Open-Meteo Weather Widget

## Overview

Open-Meteo is an excellent choice for weather data integration. It's completely free, requires no API key, and provides high-quality weather data from national weather services. This makes it perfect for client-side implementations without security concerns.

## Why Open-Meteo?

- **100% Free**: No API keys, rate limits, or subscription fees
- **No Registration**: Start using immediately
- **High Quality Data**: Sources from national meteorological services
- **CORS Enabled**: Works directly from browser JavaScript
- **Comprehensive**: Current weather, forecasts, historical data
- **Fast & Reliable**: Built for performance with global CDN

## Technical Architecture

```
User's Browser → Open-Meteo API → Weather Widget Display
     ↓
Geolocation API (optional) → Coordinates → API Request
```

## API Endpoints We'll Use

1. **Current Weather**: `https://api.open-meteo.com/v1/forecast`
2. **Geocoding** (optional): `https://geocoding-api.open-meteo.com/v1/search`

## Data Flow

1. Get user location (geolocation or manual input)
2. Fetch weather data from Open-Meteo
3. Parse and display weather information
4. Handle errors gracefully
5. Optional: Cache data to reduce API calls

---

# Step-by-Step Implementation Plan

## Phase 1: Basic Setup (15 minutes)

### Step 1.1: Create the HTML Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Weather Widget</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="weather-widget">
        <div class="weather-header">
            <h2 id="location">Weather</h2>
            <button id="refresh-btn">↻</button>
        </div>
        
        <div class="weather-content">
            <div class="current-weather">
                <div class="temperature">
                    <span id="current-temp">--</span>
                    <span class="unit">°C</span>
                </div>
                <div class="weather-info">
                    <p id="weather-description">Loading...</p>
                    <p id="feels-like">Feels like: --°C</p>
                </div>
            </div>
            
            <div class="weather-details">
                <div class="detail-item">
                    <span class="label">Humidity</span>
                    <span id="humidity">--%</span>
                </div>
                <div class="detail-item">
                    <span class="label">Wind Speed</span>
                    <span id="wind-speed">-- km/h</span>
                </div>
                <div class="detail-item">
                    <span class="label">Precipitation</span>
                    <span id="precipitation">-- mm</span>
                </div>
            </div>
        </div>
        
        <div class="loading" id="loading">Loading weather data...</div>
        <div class="error" id="error" style="display: none;">
            Unable to load weather data. <button id="retry-btn">Retry</button>
        </div>
    </div>

    <script src="weather.js"></script>
</body>
</html>
```

### Step 1.2: Create Basic CSS (styles.css)
```css
.weather-widget {
    max-width: 400px;
    margin: 20px auto;
    background: linear-gradient(135deg, #74b9ff, #0984e3);
    border-radius: 15px;
    padding: 20px;
    color: white;
    font-family: 'Arial', sans-serif;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.weather-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.weather-header h2 {
    margin: 0;
    font-size: 1.2em;
}

#refresh-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    padding: 8px 12px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 16px;
}

.current-weather {
    text-align: center;
    margin-bottom: 20px;
}

.temperature {
    font-size: 3em;
    font-weight: bold;
    margin-bottom: 10px;
}

.weather-details {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 15px;
    margin-top: 20px;
}

.detail-item {
    text-align: center;
    background: rgba(255, 255, 255, 0.1);
    padding: 10px;
    border-radius: 8px;
}

.detail-item .label {
    display: block;
    font-size: 0.8em;
    opacity: 0.8;
    margin-bottom: 5px;
}

.loading, .error {
    text-align: center;
    padding: 20px;
}

.error {
    background: rgba(255, 0, 0, 0.1);
    border-radius: 8px;
}

#retry-btn {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    color: white;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    margin-left: 10px;
}
```

## Phase 2: Core JavaScript Implementation (30 minutes)

### Step 2.1: Create weather.js with Basic Structure
```javascript
class WeatherWidget {
    constructor() {
        this.defaultLocation = { lat: 52.52, lon: 13.41 }; // Berlin as fallback
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadWeather();
    }

    bindEvents() {
        document.getElementById('refresh-btn').addEventListener('click', () => {
            this.loadWeather();
        });

        document.getElementById('retry-btn').addEventListener('click', () => {
            this.loadWeather();
        });
    }

    async loadWeather() {
        this.showLoading();
        
        try {
            const coords = await this.getLocation();
            const weatherData = await this.fetchWeatherData(coords);
            this.displayWeather(weatherData, coords);
            this.hideLoading();
        } catch (error) {
            console.error('Weather loading failed:', error);
            this.showError();
        }
    }

    showLoading() {
        document.getElementById('loading').style.display = 'block';
        document.getElementById('error').style.display = 'none';
        document.querySelector('.weather-content').style.opacity = '0.5';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
        document.querySelector('.weather-content').style.opacity = '1';
    }

    showError() {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
        document.querySelector('.weather-content').style.opacity = '0.5';
    }

    async getLocation() {
        return new Promise((resolve) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        resolve({
                            lat: position.coords.latitude,
                            lon: position.coords.longitude
                        });
                    },
                    () => {
                        // Fallback to default location
                        resolve(this.defaultLocation);
                    },
                    { timeout: 5000 }
                );
            } else {
                resolve(this.defaultLocation);
            }
        });
    }

    async fetchWeatherData(coords) {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Weather API request failed');
        }
        
        return await response.json();
    }

    async getLocationName(coords) {
        try {
            const url = `https://geocoding-api.open-meteo.com/v1/search?latitude=${coords.lat}&longitude=${coords.lon}&count=1&format=json`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.results && data.results.length > 0) {
                const result = data.results[0];
                return `${result.name}, ${result.country}`;
            }
        } catch (error) {
            console.error('Geocoding failed:', error);
        }
        
        return 'Current Location';
    }

    getWeatherDescription(weatherCode) {
        const weatherCodes = {
            0: 'Clear sky',
            1: 'Mainly clear',
            2: 'Partly cloudy',
            3: 'Overcast',
            45: 'Foggy',
            48: 'Depositing rime fog',
            51: 'Light drizzle',
            53: 'Moderate drizzle',
            55: 'Dense drizzle',
            61: 'Slight rain',
            63: 'Moderate rain',
            65: 'Heavy rain',
            71: 'Slight snow',
            73: 'Moderate snow',
            75: 'Heavy snow',
            80: 'Slight rain showers',
            81: 'Moderate rain showers',
            82: 'Violent rain showers',
            95: 'Thunderstorm',
            96: 'Thunderstorm with hail',
            99: 'Thunderstorm with heavy hail'
        };
        
        return weatherCodes[weatherCode] || 'Unknown';
    }

    async displayWeather(data, coords) {
        const current = data.current;
        const locationName = await this.getLocationName(coords);
        
        // Update location
        document.getElementById('location').textContent = locationName;
        
        // Update current weather
        document.getElementById('current-temp').textContent = Math.round(current.temperature_2m);
        document.getElementById('weather-description').textContent = 
            this.getWeatherDescription(current.weather_code);
        document.getElementById('feels-like').textContent = 
            `Feels like: ${Math.round(current.apparent_temperature)}°C`;
        
        // Update details
        document.getElementById('humidity').textContent = `${current.relative_humidity_2m}%`;
        document.getElementById('wind-speed').textContent = `${Math.round(current.wind_speed_10m)} km/h`;
        document.getElementById('precipitation').textContent = `${current.precipitation} mm`;
    }
}

// Initialize the weather widget when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new WeatherWidget();
});
```

## Phase 3: Enhanced Features (20 minutes)

### Step 3.1: Add Weather Icons
Update your CSS to include weather icons:

```css
.weather-icon {
    font-size: 4em;
    margin-bottom: 10px;
    display: block;
}
```

Add to HTML (in current-weather div):
```html
<div class="weather-icon" id="weather-icon">☀️</div>
```

Add to JavaScript (in displayWeather method):
```javascript
getWeatherIcon(weatherCode) {
    const icons = {
        0: '☀️', // Clear sky
        1: '🌤️', // Mainly clear
        2: '⛅', // Partly cloudy
        3: '☁️', // Overcast
        45: '🌫️', // Fog
        48: '🌫️', // Depositing rime fog
        51: '🌦️', // Light drizzle
        53: '🌦️', // Moderate drizzle
        55: '🌧️', // Dense drizzle
        61: '🌦️', // Slight rain
        63: '🌧️', // Moderate rain
        65: '⛈️', // Heavy rain
        71: '🌨️', // Slight snow
        73: '❄️', // Moderate snow
        75: '❄️', // Heavy snow
        80: '🌦️', // Slight rain showers
        81: '⛈️', // Moderate rain showers
        82: '⛈️', // Violent rain showers
        95: '⛈️', // Thunderstorm
        96: '⛈️', // Thunderstorm with hail
        99: '⛈️'  // Thunderstorm with heavy hail
    };
    
    return icons[weatherCode] || '🌡️';
}

// Add this line in displayWeather method:
document.getElementById('weather-icon').textContent = this.getWeatherIcon(current.weather_code);
```

## Phase 4: Deployment to Vercel (5 minutes)

### Step 4.1: File Structure
Ensure your project structure looks like:
```
your-project/
├── index.html
├── styles.css
├── weather.js
└── vercel.json (optional)
```

### Step 4.2: Deploy
1. Commit your changes to Git
2. Push to your repository
3. Vercel will automatically deploy the changes

### Step 4.3: Optional vercel.json for SPA behavior
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## Phase 5: Testing & Optimization (10 minutes)

### Step 5.1: Test Cases
- [ ] Widget loads with user's location
- [ ] Fallback location works when geolocation is denied
- [ ] Refresh button updates data
- [ ] Error handling works when offline
- [ ] Responsive design on mobile devices

### Step 5.2: Performance Optimizations
- Add caching to reduce API calls
- Implement loading states
- Add offline detection

## Total Implementation Time: ~80 minutes

This implementation provides a fully functional, production-ready weather widget using Open-Meteo's free API, with no API keys required and excellent performance characteristics.