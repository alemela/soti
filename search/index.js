// Motore di ricerca per il server Node: all'avvio legge le ricette dal disco
// (load.js) e le indicizza (engine.js).

const { loadSearchData } = require('./load');
const { createEngine } = require('./engine');

module.exports = createEngine(loadSearchData());
