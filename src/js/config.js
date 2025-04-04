import dotenv from 'dotenv';
dotenv.config();

const API_FORECAST = 'https://api.openweathermap.org/data/2.5/onecall';
const API_INITIAL_FORECAST = 'https://api.openweathermap.org/data/2.5/weather';

const API_KEY = "975159ed0282f7db912074d9984a0e95";
const TIMEOUT_SEC = 10;

export { API_KEY, API_FORECAST, API_INITIAL_FORECAST, TIMEOUT_SEC };
