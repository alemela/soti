// Caricamento delle ricette dal disco (solo Node): legge il .env, le note in
// DATA_DIR e il dizionario, e restituisce i documenti pronti per engine.js insieme
// alla configurazione della ricerca. Lo usano il server (search/index.js) e la
// build per Cloudflare Pages (pages/build.js).

const fs = require('fs');
const path = require('path');
const { readRecipe, toDocument, checkRecipe } = require('./format');
const { loadDictionary } = require('./dictionary');
require('dotenv').config();

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(__dirname, '..', process.env.DATA_DIR) // relativa alla cartella di soti
  : path.join(__dirname, '..', 'data', 'items');
const DICTIONARY_DIR = process.env.DICTIONARY_DIR
  ? path.resolve(__dirname, '..', process.env.DICTIONARY_DIR)
  : path.join(DATA_DIR, 'ingredienti');

// Note Markdown di Obsidian (.md); i vecchi .json sono ancora accettati.
// I problemi trovati (ingredienti fuori dizionario, righe non valide...) vengono
// segnalati ma non bloccano l'avvio.
function loadDocuments(dir, dictionary) {
  return fs.readdirSync(dir)
    .filter((f) => f.endsWith('.md') || f.endsWith('.json'))
    .sort()
    .map((f) => {
      const file = path.join(dir, f);
      const record = readRecipe(file, fs.readFileSync(file, 'utf8'));
      for (const problem of checkRecipe(record, dictionary)) console.warn(`[ricette] ${f}: ${problem}`);
      return toDocument(record, dictionary);
    });
}

function loadSearchData() {
  const dictionary = loadDictionary(DICTIONARY_DIR);
  const documents = loadDocuments(DATA_DIR, dictionary);
  const config = {
    SEARCHABLE_KEYS: process.env.SEARCHABLE_KEYS,
    ITALIAN_KEYS: process.env.ITALIAN_KEYS,
    FILTERS: process.env.FILTERS,
  };
  return { documents, config };
}

module.exports = { loadSearchData };
