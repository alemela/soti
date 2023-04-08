require('dotenv').config();

const fs = require('fs');
const envConfig = {};

// Filtra le variabili d'ambiente che hanno il prefisso "FE_"
for (let key in process.env) {
  if (key.startsWith('FE_')) {
    envConfig[key] = process.env[key];
  }
}

// Scrivi le variabili d'ambiente come oggetto JavaScript in un file
fs.writeFileSync('./app/static/config.js', `window.env = ${JSON.stringify(envConfig)};`);
