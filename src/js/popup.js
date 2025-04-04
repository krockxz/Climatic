/**
 * Popup script for Weather App Chrome Extension
 * Handles UI interactions and displays weather data
 */

// DOM Elements
const searchForm = document.querySelector('.search-bar');
const searchInput = document.querySelector('#bar');
const locationBtn = document.querySelector('#btn-location');
const weatherContainer = document.querySelector('#weather-container');
const forecastContainer = document.querySelector('.forecast-container');
const settingsBtn = document.querySelector('#btn-settings');
const refreshBtn = document.querySelector('#btn-refresh');

// State
let currentUnits = 'metric';

/**
 * Format and display date
 * @param {number} timestamp - Unix timestamp
 * @param {boolean} isShort - Whether to use short format
 * @returns {string} - Formatted date string
 */
const formatDate = (timestamp, isShort = false) => {
  const date = new Date(timestamp * 1000);
  
  if (isShort) {
    return new Intl.DateTimeFormat('en-US', { 
      weekday: 'short',
      day: 'numeric'
    }).format(date);
  }
  
  return new Intl.DateTimeFormat('en-US', { 
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
};

/**
 * Format temperature with unit
 * @param {number} temp - Temperature value
 * @param {string} units - Temperature units (metric or imperial)
 * @returns {string} - Formatted temperature
 */
const formatTemp = (temp, units) => {
  return `${temp}°${units === 'metric' ? 'C' : 'F'}`;
};

/**
 * Render current weather data
 * @param {object} data - Weather data
 */
const renderCurrentWeather = (data) => {
  currentUnits = data.units;
  
  // Create markup
  const markup = `
    <div class="temp">
      <h1 class="temp__value">${data.temp}</h1>
      <div class="temp__type">
        <p class="temp__type--c temp__types ${data.units === 'metric' ? 'active' : ''}" data-units="metric">°C</p>
        <p class="temp__type--f temp__types ${data.units === 'imperial' ? 'active' : ''}" data-units="imperial">°F</p>
      </div>
    </div>
    
    <div class="weather">
      <img class="weather__img" src="https://openweathermap.org/img/wn/${data.icon}@2x.png" alt="${data.description}" />
      <p class="weather-status heading-primary">${data.description}</p>
    </div>
    
    <hr class="sidebar__break" />
    
    <div class="info">
      <p class="location heading-primary--sub">${data.name}, ${data.country}</p>
      <p class="time heading-tertiary">${formatDate(Math.floor(Date.now() / 1000))}</p>
    </div>
    
    <div class="weather-details-container">
      <div class="weather-details">
        <h3 class="weather-details__main">${data.wind} ${data.units === 'metric' ? 'm/s' : 'mph'}</h3>
        <p class="weather-details__type">Wind</p>
      </div>
      
      <div class="weather-details">
        <h3 class="weather-details__main">${data.humidity}%</h3>
        <p class="weather-details__type">Humidity</p>
      </div>
      
      <div class="weather-details">
        <h3 class="weather-details__main">${data.visibility / 1000} km</h3>
        <p class="weather-details__type">Visibility</p>
      </div>
      
      <div class="weather-details">
        <h3 class="weather-details__main">${data.pressure} hPa</h3>
        <p class="weather-details__type">Pressure</p>
      </div>
    </div>
  `;
  
  // Display the markup
  weatherContainer.innerHTML = markup;
  
  // Add event listeners to temperature unit toggles
  const tempTypes = weatherContainer.querySelectorAll('.temp__types');
  tempTypes.forEach(type => {
    type.addEventListener('click', () => {
      if (type.classList.contains('active')) return;
      
      tempTypes.forEach(t => t.classList.remove('active'));
      type.classList.add('active');
      
      const units = type.dataset.units;
      if (units !== currentUnits) {
        changeUnits(units);
      }
    });
  });
};

/**
 * Render forecast data
 * @param {object} data - Weather data
 */
const renderForecast = (data) => {
  // Clear container
  forecastContainer.innerHTML = '';
  
  // Create markup for each day
  data.daily.forEach(day => {
    const markup = `
      <div class="forecast-day">
        <p class="forecast-day__date">${formatDate(day.dt, true)}</p>
        <img class="forecast-day__icon" src="https://openweathermap.org/img/wn/${day.weather[0].icon}.png" alt="${day.weather[0].description}" />
        <div class="forecast-day__temp">
          <span class="forecast-day__temp--max">${Math.round(day.temp.max)}°</span>
          <span class="forecast-day__temp--min">${Math.round(day.temp.min)}°</span>
        </div>
      </div>
    `;
    
    // Append to container
    forecastContainer.insertAdjacentHTML('beforeend', markup);
  });
};

/**
 * Change temperature units
 * @param {string} units - Temperature units (metric or imperial)
 */
const changeUnits = async (units) => {
  try {
    // Get last location from storage
    const { lastLocation } = await chrome.storage.local.get('lastLocation');
    
    if (!lastLocation) {
      throw new Error('No location found');
    }
    
    // Save units preference
    chrome.storage.local.set({ units });
    
    // Show loading state
    weatherContainer.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    forecastContainer.innerHTML = '';
    
    // Get weather with new units
    chrome.runtime.sendMessage(
      { type: 'GET_WEATHER', location: lastLocation, units },
      response => {
        if (response.success) {
          renderCurrentWeather(response.data);
          renderForecast(response.data);
        } else {
          showError(response.error);
        }
      }
    );
  } catch (err) {
    showError(err.message);
  }
};

/**
 * Get user's current position
 * @returns {Promise<object>} - Location coordinates
 */
const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
    }
    
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        resolve({ latitude, longitude });
      },
      error => {
        reject(new Error(`Unable to get your location: ${error.message}`));
      }
    );
  });
};

/**
 * Show error message
 * @param {string} message - Error message
 */
const showError = (message) => {
  weatherContainer.innerHTML = `
    <div class="error">
      <div class="error__icon">
        <i class="fas fa-exclamation-triangle"></i>
      </div>
      <p class="error__message">${message}</p>
    </div>
  `;
  forecastContainer.innerHTML = '';
};

/**
 * Search for location by name
 * @param {string} query - Search query
 */
const searchLocation = async (query) => {
  try {
    // Show loading state
    weatherContainer.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    forecastContainer.innerHTML = '';
    
    // Get coordinates from query using OpenWeatherMap Geocoding API
    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=1&appid=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to get location data');
    }
    
    const data = await response.json();
    
    if (!data.length) {
      throw new Error('Location not found');
    }
    
    // Extract coordinates
    const { lat: latitude, lon: longitude } = data[0];
    const location = { latitude, longitude };
    
    // Save last location
    chrome.storage.local.set({ lastLocation: location });
    
    // Get weather data
    const { units = 'metric' } = await chrome.storage.local.get('units');
    
    chrome.runtime.sendMessage(
      { type: 'GET_WEATHER', location, units },
      response => {
        if (response.success) {
          renderCurrentWeather(response.data);
          renderForecast(response.data);
        } else {
          showError(response.error);
        }
      }
    );
  } catch (err) {
    showError(err.message);
  }
};

/**
 * Load weather data from storage or API
 */
const loadWeatherData = async () => {
  try {
    // Show loading state
    weatherContainer.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    // Check if we have cached weather data
    const { weatherData } = await chrome.storage.local.get('weatherData');
    
    if (weatherData) {
      renderCurrentWeather(weatherData);
      renderForecast(weatherData);
      
      // If data is older than 30 minutes, refresh
      if (Date.now() - weatherData.timestamp > 30 * 60 * 1000) {
        chrome.runtime.sendMessage({ type: 'REFRESH_WEATHER' });
      }
      
      return;
    }
    
    // Get user location
    const location = await getCurrentPosition();
    
    // Save last location
    chrome.storage.local.set({ lastLocation: location });
    
    // Get weather data
    const { units = 'metric' } = await chrome.storage.local.get('units');
    
    chrome.runtime.sendMessage(
      { type: 'GET_WEATHER', location, units },
      response => {
        if (response.success) {
          renderCurrentWeather(response.data);
          renderForecast(response.data);
        } else {
          showError(response.error);
        }
      }
    );
  } catch (err) {
    showError(err.message);
  }
};

// Initialize
document.addEventListener('DOMContentLoaded', loadWeatherData);

// Event listeners
searchForm.addEventListener('submit', e => {
  e.preventDefault();
  const query = searchInput.value.trim();
  
  if (!query) return;
  
  searchLocation(query);
  searchInput.value = '';
});

locationBtn.addEventListener('click', async e => {
  e.preventDefault();
  
  try {
    const location = await getCurrentPosition();
    
    // Save last location
    chrome.storage.local.set({ lastLocation: location });
    
    // Get weather data
    const { units = 'metric' } = await chrome.storage.local.get('units');
    
    // Show loading state
    weatherContainer.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    forecastContainer.innerHTML = '';
    
    chrome.runtime.sendMessage(
      { type: 'GET_WEATHER', location, units },
      response => {
        if (response.success) {
          renderCurrentWeather(response.data);
          renderForecast(response.data);
        } else {
          showError(response.error);
        }
      }
    );
  } catch (err) {
    showError(err.message);
  }
});

refreshBtn.addEventListener('click', () => {
  loadWeatherData();
});

// Import API key
const API_KEY = "975159ed0282f7db912074d9984a0e95"; 