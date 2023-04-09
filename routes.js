const express = require('express');
const router = express.Router();
const elastic = require('./elastic');
const path = require('path');
require('dotenv').config();

// API
// API per ottenere un singolo doc a partire dall'id
router.get('/api/get', async (req, res) => {
  try {
    const id = req.query.id;
    const result = await elastic.getDocumentById(id);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).send('Errore nella ricerca del documento');
  }
});

// API per ottenere i risultati di una ricerca con parametri (filtri, sort, paginazione)
router.get('/api/search', async (req, res) => {
  try {
    const q = req.query.q; // Recupera il parametro "q" dalla query string
    const page = req.query.page;
    const size = req.query.size;
    const sort = req.query.sort;
    const tags = req.query.tags ? req.query.tags.split("|") : [];

    const result = await elastic.getDocuments(q, page, size, sort, tags); // Chiama la funzione di elastic.js per recuperare il documento
    res.json(result); // Restituisci il documento come JSON
  } catch (err) {
    console.error(err);
    res.status(500).send('Errore nella ricerca del documento');
  }
});

// ROTTE
// ROTTA pagina leggendo da .env il nome della rotta e.g. /ricetta/patate-forno
router.get(`/${process.env.FE_RESULT_NAME}/:slug`, (req, res) => {
  res.sendFile(path.join(__dirname, 'app', 'page.html'));
});

// ROTTA organico di ricerca
router.get('/search', (req, res) => {
  res.sendFile(path.join(__dirname, 'app', 'search.html'));
});

// ROTTA homepage se desiderata, altrimenti redirect su ricerca
router.get('/', (req, res) => {
  if (process.env.WANNA_HOME === "yes") {
    res.sendFile(path.join(__dirname, 'app', 'home.html'));
  } else {
    res.redirect('/search');
  }
});

module.exports = router;
