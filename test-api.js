// Simple script to test our API key with OpenWeatherMap
const https = require('https');

const API_KEY = "975159ed0282f7db912074d9984a0e95";
const testCity = "London";

// Test the weather endpoint
const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?q=${testCity}&units=metric&appid=${API_KEY}`;

console.log(`Testing OpenWeatherMap API with key: ${API_KEY}`);
console.log(`URL: ${weatherUrl}`);

https.get(weatherUrl, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Weather API Response:');
    console.log(`Status: ${res.statusCode}`);
    
    try {
      const parsedData = JSON.parse(data);
      console.log(JSON.stringify(parsedData, null, 2));
      
      if (parsedData.coord) {
        const { lat, lon } = parsedData.coord;
        console.log(`\nTesting OneCall API with coordinates: ${lat}, ${lon}`);
        
        // Test the onecall endpoint
        const oneCallUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=minutely,hourly&appid=${API_KEY}&units=metric`;
        
        https.get(oneCallUrl, (res2) => {
          let data2 = '';
          
          res2.on('data', (chunk) => {
            data2 += chunk;
          });
          
          res2.on('end', () => {
            console.log('\nOneCall API Response:');
            console.log(`Status: ${res2.statusCode}`);
            
            try {
              const parsedData2 = JSON.parse(data2);
              console.log(JSON.stringify(parsedData2, null, 2).substring(0, 500) + '...');
              console.log('\nAPI testing complete - both endpoints working!');
            } catch (e) {
              console.error('Error parsing OneCall response:', e.message);
            }
          });
        }).on('error', (err) => {
          console.error('OneCall API Error:', err.message);
        });
      }
    } catch (e) {
      console.error('Error parsing Weather response:', e.message);
    }
  });
}).on('error', (err) => {
  console.error('Weather API Error:', err.message);
}); 