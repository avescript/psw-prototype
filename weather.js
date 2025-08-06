class WeatherWidget {
    constructor() {
        this.defaultLocation = { lat: 52.52, lon: 13.41 }; // Berlin as fallback
        this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
        this.init();
    }

    async init() {
        this.bindEvents();
        this.setupOfflineDetection();
        await this.loadWeather();
    }

    setupOfflineDetection() {
        window.addEventListener('online', () => {
            this.loadWeather();
        });

        window.addEventListener('offline', () => {
            this.showError('You are currently offline. Weather data might not be up to date.');
        });
    }

    getCachedData() {
        const cached = localStorage.getItem('weatherData');
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < this.cacheTimeout) {
                return data;
            }
        }
        return null;
    }

    setCachedData(data) {
        localStorage.setItem('weatherData', JSON.stringify({
            data,
            timestamp: Date.now()
        }));
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
            // Try to get cached data first
            const cachedData = this.getCachedData();
            if (cachedData) {
                this.displayWeather(cachedData.weather, cachedData.coords);
                this.hideLoading();
                
                // Refresh in background
                this.refreshInBackground();
                return;
            }

            const coords = await this.getLocation();
            const weatherData = await this.fetchWeatherData(coords);
            
            // Cache the new data
            this.setCachedData({ weather: weatherData, coords });
            
            this.displayWeather(weatherData, coords);
            this.hideLoading();
        } catch (error) {
            console.error('Weather loading failed:', error);
            const cachedData = this.getCachedData();
            if (cachedData) {
                this.displayWeather(cachedData.weather, cachedData.coords);
                this.showError('Using cached data. Unable to fetch latest weather.');
            } else {
                this.showError('Unable to load weather data.');
            }
        }
    }

    async refreshInBackground() {
        try {
            const coords = await this.getLocation();
            const weatherData = await this.fetchWeatherData(coords);
            this.setCachedData({ weather: weatherData, coords });
            this.displayWeather(weatherData, coords);
        } catch (error) {
            console.error('Background refresh failed:', error);
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
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`;
        
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
            `Feels like: ${Math.round(current.apparent_temperature)}°F`;
        
        // Update details
        document.getElementById('humidity').textContent = `${current.relative_humidity_2m}%`;
        document.getElementById('wind-speed').textContent = `${Math.round(current.wind_speed_10m)} mph`;
        document.getElementById('precipitation').textContent = `${current.precipitation} mm`;
    }
}

// Initialize the weather widget when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new WeatherWidget();
});
