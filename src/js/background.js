/**
 * Background Service Worker for Weather App Chrome Extension
 * Handles API calls and caching of weather data
 */

import { API_KEY, API_FORECAST, API_INITIAL_FORECAST, TIMEOUT_SEC } from './config.js';

// Cache duration in milliseconds (30 minutes)
const CACHE_DURATION = 30 * 60 * 1000;

// Alarm name for auto-refresh
const REFRESH_ALARM = 'weather-refresh';

/**
 * Helper function to handle API timeouts
 * @param {number} seconds - Timeout duration in seconds
 * @returns {Promise} - Promise that rejects after specified time
 */
const timeout = function (seconds) {
  return new Promise(function (_, reject) {
    setTimeout(function () {
      reject(
        new Error(`Request took too long! Timeout after ${seconds} seconds`)
      );
    }, seconds * 1000);
  });
};

/**
 * Fetch data from an API with timeout
 * @param {string} url - API URL
 * @returns {Promise<object>} - JSON response from API
 */
const getJSON = async function (url) {
  try {
    const res = await Promise.race([fetch(url), timeout(TIMEOUT_SEC)]);
    
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText}`);
    }
    
    return await res.json();
  } catch (err) {
    throw err;
  }
};

/**
 * Get weather data for a specific location
 * @param {object} location - Location coordinates
 * @param {string} units - Temperature units (metric or imperial)
 * @returns {Promise<object>} - Weather data
 */
const getWeatherData = async function (location, units = 'metric') {
  try {
    // Get initial weather data
    const initialForecast = await getJSON(
      `${API_INITIAL_FORECAST}?lat=${location.latitude}&lon=${location.longitude}&units=${units}&appid=${API_KEY}`
    );
    
    // Get detailed forecast data
    const detailedForecast = await getJSON(
      `${API_FORECAST}?lat=${location.latitude}&lon=${location.longitude}&units=${units}&exclude=minutely&appid=${API_KEY}`
    );
    
    // Combine and format the data
    const weatherData = {
      name: initialForecast.name,
      country: initialForecast.sys.country,
      temp: Math.round(detailedForecast.current.temp),
      tempMin: Math.round(detailedForecast.daily[0].temp.min),
      tempMax: Math.round(detailedForecast.daily[0].temp.max),
      description: detailedForecast.current.weather[0].description,
      icon: detailedForecast.current.weather[0].icon,
      wind: detailedForecast.current.wind_speed,
      humidity: detailedForecast.current.humidity,
      visibility: detailedForecast.current.visibility,
      pressure: detailedForecast.current.pressure,
      sunrise: detailedForecast.current.sunrise,
      sunset: detailedForecast.current.sunset,
      units: units,
      daily: detailedForecast.daily.slice(1, 8), // Next 7 days
      timestamp: Date.now(),
    };
    
    // Cache the weather data
    chrome.storage.local.set({ weatherData });
    
    return weatherData;
  } catch (err) {
    throw err;
  }
};

/**
 * Initialize extension with user's location or last searched location
 */
const initExtension = async () => {
  try {
    // Check if we have cached weather data
    const { weatherData } = await chrome.storage.local.get('weatherData');
    
    // If we have recent data, don't fetch again
    if (weatherData && Date.now() - weatherData.timestamp < CACHE_DURATION) {
      return;
    }
    
    // Get user preferences
    const { units = 'metric', lastLocation } = await chrome.storage.local.get(['units', 'lastLocation']);
    
    // If we have a last location, use it
    if (lastLocation) {
      await getWeatherData(lastLocation, units);
      return;
    }
    
    // Otherwise get current location (this will be handled by popup.js)
  } catch (err) {
    console.error('Error initializing extension:', err);
  }
};

/**
 * Setup refresh alarm based on user preferences
 */
const setupRefreshAlarm = async () => {
  try {
    // Clear any existing alarm
    await chrome.alarms.clear(REFRESH_ALARM);
    
    // Get refresh interval from storage (default to 30 minutes)
    const { refreshInterval = 30 } = await chrome.storage.local.get('refreshInterval');
    
    // Only set up alarm if interval is greater than 0
    if (refreshInterval > 0) {
      chrome.alarms.create(REFRESH_ALARM, {
        periodInMinutes: refreshInterval
      });
      
      console.log(`Refresh alarm set for every ${refreshInterval} minutes`);
    }
  } catch (err) {
    console.error('Error setting up refresh alarm:', err);
  }
};

/**
 * Update the badge text with current temperature
 */
const updateBadgeText = async () => {
  try {
    const { weatherData } = await chrome.storage.local.get('weatherData');
    
    if (weatherData) {
      // Set badge text to current temperature
      chrome.action.setBadgeText({ text: `${weatherData.temp}°` });
      
      // Set badge background color
      chrome.action.setBadgeBackgroundColor({ color: '#1F2940' });
    }
  } catch (err) {
    console.error('Error updating badge:', err);
  }
};

/**
 * Refresh weather data
 */
const refreshWeather = async () => {
  try {
    // Get user preferences
    const { lastLocation, units = 'metric' } = await chrome.storage.local.get(['lastLocation', 'units']);
    
    if (lastLocation) {
      // Get fresh weather data
      await getWeatherData(lastLocation, units);
      
      // Update badge
      updateBadgeText();
    }
  } catch (err) {
    console.error('Error refreshing weather data:', err);
  }
};

// Initialize extension when installed or updated
chrome.runtime.onInstalled.addListener(() => {
  initExtension();
  setupRefreshAlarm();
});

// Handle alarms for auto-refresh
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === REFRESH_ALARM) {
    refreshWeather();
  }
});

// Listen for messages from popup or options page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_WEATHER') {
    getWeatherData(request.location, request.units)
      .then(data => {
        updateBadgeText();
        sendResponse({ success: true, data });
      })
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Required for async response
  }
  
  if (request.type === 'REFRESH_WEATHER') {
    refreshWeather()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.type === 'UPDATE_REFRESH_INTERVAL') {
    setupRefreshAlarm()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
}); 