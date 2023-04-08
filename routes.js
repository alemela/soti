const express = require('express');
const router = express.Router();
const elastic = require('./elastic');
const path = require('path');


router.get('/api/get', async (req, res) => {
  try {
    const id = req.query.id; // Recupera il parametro "id" dalla query string
    const result = await elastic.getDocumentById(id); // Chiama la funzione di elastic.js per recuperare il documento
    res.json(result); // Restituisci il documento come JSON
  } catch (err) {
    console.error(err);
    res.status(500).send('Errore nella ricerca del documento');
  }
});

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

router.get('/page', (req, res) => {
  res.sendFile(path.join(__dirname, 'app', 'page.html'));
});

router.get('/search', (req, res) => {
  res.sendFile(path.join(__dirname, 'app', 'index.html'));
});

module.exports = router;
