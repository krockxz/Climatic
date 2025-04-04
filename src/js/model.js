/* 
MODEl
-> Business Logic (Main Logic)
-> State (UI Data)
-> HTTP Requests (API Data)
*/

import { API_KEY, API_INITIAL_FORECAST, TIMEOUT_SEC } from './config.js';
import { FETCH, isDay } from './helper.js';

const state = {
	location: {
		name: 'New Delhi',
		lat: 28.7,
		lon: 77.2,
	},
	forecast: [],
	currentDay: 0,
};

let tempMin = 0;
let tempMax = 0;

/**
 * Creates simulated forecast data based on current weather
 * @param {Object} currentData - Current weather data
 * @returns {Object} Simulated forecast data
 */
const createSimulatedForecast = (currentData, units) => {
	// Extract key weather info from current data
	const { weather, main, wind, visibility, sys } = currentData;
	
	// Create the current weather structure
	const current = {
		temp: main.temp,
		feels_like: main.feels_like,
		humidity: main.humidity,
		wind_speed: wind.speed,
		weather: weather,
		visibility: visibility,
		sunrise: sys.sunrise,
		sunset: sys.sunset
	};

	// Create a simulated 7-day forecast by slightly varying the current conditions
	const daily = [];
	const weatherTypes = [
		{ id: 800, main: 'Clear', description: 'clear sky' },
		{ id: 801, main: 'Clouds', description: 'few clouds' },
		{ id: 802, main: 'Clouds', description: 'scattered clouds' },
		{ id: 500, main: 'Rain', description: 'light rain' },
		{ id: 501, main: 'Rain', description: 'moderate rain' }
	];
	
	// Add the current weather as the first day
	daily.push({
		temp: {
			day: main.temp,
			min: main.temp_min,
			max: main.temp_max
		},
		weather: weather,
		humidity: main.humidity,
		wind_speed: wind.speed,
		sunrise: sys.sunrise,
		sunset: sys.sunset
	});
	
	// Generate 7 more days with simulated data
	for (let i = 1; i < 8; i++) {
		// Slightly adjust temperature each day (add or subtract up to 3 degrees)
		const tempChange = Math.random() * 6 - 3;
		const tempDay = main.temp + tempChange;
		const tempMin = main.temp_min + tempChange - 1;
		const tempMax = main.temp_max + tempChange + 1;
		
		// Vary the weather conditions
		const randomWeather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];
		
		// Sunrise and sunset stay roughly the same with small variations (seconds)
		const sunriseVariation = sys.sunrise + (Math.random() * 600 - 300);
		const sunsetVariation = sys.sunset + (Math.random() * 600 - 300);
		
		daily.push({
			temp: {
				day: tempDay,
				min: tempMin,
				max: tempMax
			},
			weather: [{ ...randomWeather }],
			humidity: Math.min(100, Math.max(30, main.humidity + (Math.random() * 20 - 10))),
			wind_speed: Math.max(0, wind.speed + (Math.random() * 4 - 2)),
			sunrise: sunriseVariation,
			sunset: sunsetVariation
		});
	}
	
	return {
		current,
		daily,
		units
	};
};

/**
 * Converts simulated forecast to imperial units
 * @param {Object} forecastData - Forecast data in metric units
 * @returns {Object} Forecast data in imperial units
 */
const convertToImperial = (forecastData) => {
	const convertedForecast = JSON.parse(JSON.stringify(forecastData));
	
	// Convert current temps from C to F
	convertedForecast.current.temp = (forecastData.current.temp * 9/5) + 32;
	convertedForecast.current.feels_like = (forecastData.current.feels_like * 9/5) + 32;
	
	// Convert daily temps from C to F
	convertedForecast.daily = forecastData.daily.map(day => {
		return {
			...day,
			temp: {
				day: (day.temp.day * 9/5) + 32,
				min: (day.temp.min * 9/5) + 32,
				max: (day.temp.max * 9/5) + 32
			}
		};
	});
	
	// Convert wind speed from m/s to mph
	convertedForecast.current.wind_speed = forecastData.current.wind_speed * 2.237;
	convertedForecast.daily.forEach(day => {
		day.wind_speed = day.wind_speed * 2.237;
	});
	
	convertedForecast.units = 'imperial';
	
	return convertedForecast;
};

/**
 * Get current location coordinates of the user
 * @async
 * @returns {object} Latitude (lat) & Longitude (lon)
 */
const getCurrentLocation = async function () {
	try {
		const {
			coords: { latitude: lat, longitude: lon },
		} = await new Promise((res, rej) => {
			navigator.geolocation.getCurrentPosition(res, rej);
		});

		state.location.lat = lat;
		state.location.lon = lon;

		return { lat, lon };
	} catch (err) {
		console.error("Error getting location:", err);
		return { lat: state.location.lat, lon: state.location.lon };
	}
};

/**
 * Returns the lat & lon of the given location and also fetch min & max temp
 * @async
 * @param {String} addr Location | City Name
 * @returns {Object} Latitude (lat) & Longitude (lon)
 */
const initForecast = async function initialForecast(addr) {
	try {
		console.log('Fetching weather for:', addr);
		const data = await FETCH(
			`${API_INITIAL_FORECAST}?q=${addr}&units=metric&appid=${API_KEY}`
		);
		console.log('Weather data:', data);

		const { lat, lon } = data.coord;
		tempMin = data.main.temp_min;
		tempMax = data.main.temp_max;

		state.location.lat = lat;
		state.location.lon = lon;
		state.location.name = data.name;

		return { lat, lon, data };
	} catch (err) {
		console.error('Error in initForecast:', err);
		throw err;
	}
};

/**
 * Gets "forecast" by using the current weather API
 * @async
 * @param {Number} lat Latitude of the location
 * @param {Number} lon Longitude of the location
 */
const forecast = async function (lat, lon, weatherData = null) {
	try {
		state.currentDay = 0;
		console.log('Preparing forecast for:', { lat, lon });

		let data;
		if (weatherData) {
			data = weatherData;
		} else {
			data = await FETCH(
				`${API_INITIAL_FORECAST}?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
			);
		}
		
		console.log('Current weather data:', data);
		
		// Create simulated forecast data based on current weather
		const forecastData = createSimulatedForecast(data, 'metric');
		console.log('Simulated forecast data:', forecastData);
		
		// Reset forecast array
		if (state.forecast.length >= 2) state.forecast.length = 0;
		
		// Add metric forecast
		state.forecast.push(forecastData);
		
		// Add imperial forecast
		const imperialForecast = convertToImperial(forecastData);
		state.forecast.push(imperialForecast);
		
		console.log('State forecast data:', state.forecast);
	} catch (err) {
		console.error('Error in forecast:', err);
		throw err;
	}
};

export { getCurrentLocation, forecast, initForecast, state };
