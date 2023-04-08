const express = require('express');
const router = require('./routes');
const path = require('path');
require('dotenv').config();

const app = express();

// Usa il middleware di Express per gestire le richieste in formato JSON
app.use(express.json());

app.use(express.static(path.join(__dirname, 'app')));
app.use('/images', express.static(__dirname + '/images'));

// Aggiungi il router definito nel file "router.js"
app.use('/', router);

// Avvia il server Express
const port = process.env.SERVER_PORT;
app.listen(port, () => {
  console.log(`Server avviato sulla porta ${port}`);
});
