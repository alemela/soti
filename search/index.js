// Motore di ricerca in memoria basato su Orama. All'avvio legge tutte le ricette
// in data/items (note Markdown, vedi format.js) e le indicizza. Le risposte hanno
// la forma di quelle di Elasticsearch (hits.hits[]._source, highlight,
// hits.total.value, aggregations), con un'aggregazione per ogni filtro di FILTERS.

const fs = require('fs');
const path = require('path');
const { create, insert, search } = require('@orama/orama');
const { analyze } = require('./analysis');
const { highlightField } = require('./highlight');
const { readRecipe, toDocument, checkRecipe } = require('./format');
const { loadDictionary } = require('./dictionary');
require('dotenv').config();

const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(__dirname, '..', process.env.DATA_DIR) // relativa alla cartella di soti
  : path.join(__dirname, '..', 'data', 'items');
const DICTIONARY_DIR = process.env.DICTIONARY_DIR
  ? path.resolve(__dirname, '..', process.env.DICTIONARY_DIR)
  : path.join(DATA_DIR, 'ingredienti');

const splitList = (value) => (value || '').split(',').map((s) => s.trim()).filter(Boolean);

const SEARCHABLE_KEYS = splitList(process.env.SEARCHABLE_KEYS);
// Campi analizzati in italiano (stemming e stopword): su ES era solo "titolo".
const ITALIAN_KEYS = new Set(splitList(process.env.ITALIAN_KEYS ?? 'titolo'));

// Filtri della sidebar: "campo|etichetta|tipo" separati da virgola e spazio.
//  - terms: valori da spuntare (tutti quelli scelti devono esserci), con conteggi;
//    un quarto parametro opzionale indica quanti valori mostrare (default 10)
//  - range: intervallo numerico da/a
const DEFAULT_TERMS_SIZE = 10;
const filters = splitList(process.env.FILTERS ?? 'tag|Tag|terms').map((entry, i) => {
  const [key, label, type, size] = entry.split('|').map((s) => s.trim());
  if (type !== 'terms' && type !== 'range') throw new Error(`FILTERS: tipo "${type}" non valido per ${key} (usa terms o range)`);
  return { key, label: label || key, type, size: parseInt(size, 10) || DEFAULT_TERMS_SIZE, prop: `__filter${i}` };
});

const DEFAULT_PAGE = 1;
const DEFAULT_SIZE = 10;
const DEFAULT_SORT = '_score-desc';

// Marca la fine di ogni termine indicizzato: Orama cerca per prefisso
// ("pat" troverebbe "patate"), ES invece solo per parola intera.
const TERM_END = '\u0001';

// Valori di un percorso puntato, attraversando gli array ("ingredienti.nome").
function valuesAt(obj, keys) {
  if (obj === null || obj === undefined) return [];
  if (Array.isArray(obj)) return obj.flatMap((item) => valuesAt(item, keys));
  if (!keys.length) return [obj];
  return valuesAt(obj[keys[0]], keys.slice(1));
}

const textValues = (doc, key) =>
  valuesAt(doc, key.split('.'))
    .filter((v) => typeof v === 'string' || typeof v === 'number')
    .map(String);

const fields = SEARCHABLE_KEYS.map((key) => ({
  key,
  prop: key.replace(/\./g, '_'), // Orama interpreta i punti come oggetti annidati
  analyzer: ITALIAN_KEYS.has(key) ? 'italian' : 'standard',
}));
const analyzerOf = new Map(fields.map((f) => [f.prop, f.analyzer]));

// Campi raggruppati per analyzer, come fa il multi_match "cross_fields" di ES.
const groups = new Map();
for (const f of fields) {
  if (!groups.has(f.analyzer)) groups.set(f.analyzer, []);
  groups.get(f.analyzer).push(f);
}

// Tokenizer per Orama: in indicizzazione analizza ogni campo con il suo analyzer.
// In ricerca Orama non dice su quale campo stia cercando, quindi i termini della
// query vengono analizzati qui sotto e passati a Orama già pronti.
const tokenizer = {
  language: 'italian',
  normalizationCache: new Map(),
  tokenize(raw, _language, prop) {
    if (typeof raw !== 'string') return [raw];
    if (prop === undefined) return [raw];
    return analyze(raw, analyzerOf.get(prop)).map((t) => t + TERM_END);
  },
};

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

const dictionary = loadDictionary(DICTIONARY_DIR);
const documents = loadDocuments(DATA_DIR, dictionary);
const byIdentifier = new Map(documents.map((doc) => [doc.identificativo, doc]));

const numberAt = (doc, key) => valuesAt(doc, key.split('.')).find((v) => typeof v === 'number');

const db = create({
  schema: {
    ...Object.fromEntries(fields.map((f) => [f.prop, 'string[]'])),
    ...Object.fromEntries(filters.map((f) => [f.prop, f.type === 'terms' ? 'enum[]' : 'number'])),
  },
  components: { tokenizer },
});

documents.forEach((doc, i) => {
  const filterValues = {};
  for (const f of filters) {
    const value = f.type === 'terms' ? textValues(doc, f.key) : numberAt(doc, f.key);
    if (value !== undefined) filterValues[f.prop] = value;
  }
  insert(db, {
    id: String(i), // posizione in documents
    ...Object.fromEntries(fields.map((f) => [f.prop, textValues(doc, f.key)])),
    ...filterValues,
  });
});

// Estremi dei filtri a intervallo su tutto il catalogo, così lo slider non cambia
// scala a ogni ricerca.
const rangeBounds = new Map(filters.filter((f) => f.type === 'range').map((f) => {
  const nums = documents.map((doc) => numberAt(doc, f.key)).filter((v) => v !== undefined);
  return [f.key, nums.length ? { min: Math.min(...nums), max: Math.max(...nums) } : { min: null, max: null }];
}));

// Ricerca di un singolo termine già analizzato su un campo: Map indice -> punteggio.
function searchTerm(term, prop, where) {
  const { hits } = search(db, {
    term: term + TERM_END,
    properties: [prop],
    where,
    threshold: 1,
    limit: documents.length,
  });
  return new Map(hits.map((h) => [Number(h.id), h.score]));
}

// Semantica del multi_match "cross_fields" con operator "and" di ES: in ogni gruppo
// di campi con lo stesso analyzer, ogni termine della query deve comparire in almeno
// uno dei campi del gruppo. Basta che un gruppo soddisfi tutti i termini. Punteggio
// di un termine: il migliore tra i campi; del gruppo: la somma dei termini;
// del documento: il miglior gruppo.
function fullTextMatches(q, where) {
  const scores = new Map();
  for (const [analyzer, groupFields] of groups) {
    const terms = [...new Set(analyze(q, analyzer))];
    if (!terms.length) continue; // la query è fatta solo di stopword per questo gruppo

    let groupScores = null;
    for (const term of terms) {
      const termScores = new Map();
      for (const f of groupFields) {
        for (const [id, score] of searchTerm(term, f.prop, where)) {
          termScores.set(id, Math.max(termScores.get(id) ?? 0, score));
        }
      }
      if (groupScores === null) {
        groupScores = termScores;
      } else {
        for (const [id, score] of groupScores) {
          if (termScores.has(id)) groupScores.set(id, score + termScores.get(id));
          else groupScores.delete(id);
        }
      }
      if (!groupScores.size) break;
    }

    for (const [id, score] of groupScores) {
      scores.set(id, Math.max(scores.get(id) ?? 0, score));
    }
  }
  return scores;
}

function allMatches(where) {
  if (!where) return new Map(documents.map((_, i) => [i, 1]));
  const { hits } = search(db, { where, limit: documents.length });
  return new Map(hits.map((h) => [Number(h.id), 1]));
}

// Ordinamento come ES: per campo numerico (sugli array il minimo se crescente,
// il massimo se decrescente), documenti senza valore in fondo; a parità di valore
// vale l'ordine di indicizzazione.
function sortMatches(matches, sort) {
  const [field, direction] = sort.split('-');
  const dir = direction === 'asc' ? 1 : -1;
  const rows = [...matches].map(([index, score]) => ({ index, score })).sort((a, b) => a.index - b.index);

  if (field === '_score') return rows.sort((a, b) => dir * (a.score - b.score));

  const keys = field.split('.');
  for (const row of rows) {
    const nums = valuesAt(documents[row.index], keys).filter((v) => typeof v === 'number');
    row.value = nums.length ? (dir === 1 ? Math.min(...nums) : Math.max(...nums)) : null;
  }
  return rows.sort((a, b) => {
    if (a.value === null || b.value === null) return (a.value === null) - (b.value === null);
    return dir * (a.value - b.value);
  });
}

// Equivalente della terms aggregation di ES: numero di documenti per valore,
// ordinati per conteggio decrescente e poi alfabeticamente.
function termsBuckets(rows, filter) {
  const counts = new Map();
  for (const { index } of rows) {
    for (const value of new Set(textValues(documents[index], filter.key))) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  const all = [...counts]
    .map(([key, doc_count]) => ({ key, doc_count }))
    .sort((a, b) => b.doc_count - a.doc_count || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const buckets = all.slice(0, filter.size);
  const shown = buckets.reduce((sum, b) => sum + b.doc_count, 0);
  const total = all.reduce((sum, b) => sum + b.doc_count, 0);
  return { doc_count_error_upper_bound: 0, sum_other_doc_count: total - shown, buckets };
}

// Una aggregazione per filtro; "meta" dice al frontend come disegnarlo.
function aggregations(rows) {
  const out = {};
  for (const f of filters) {
    const meta = { label: f.label, type: f.type };
    out[f.key] = f.type === 'terms' ? { meta, ...termsBuckets(rows, f) } : { meta, ...rangeBounds.get(f.key) };
  }
  return out;
}

// Filtri attivi dalla query string: terms "a|b", range "min-max" (un estremo può mancare).
// Il vecchio parametro "tags" vale ancora come filtro su "tag".
exports.parseFilters = function (query) {
  const active = {};
  const first = (v) => (Array.isArray(v) ? v.join('|') : v);
  for (const f of filters) {
    let raw = first(query[f.key]);
    if (f.key === 'tag' && query.tags) raw = [raw, first(query.tags)].filter(Boolean).join('|');
    if (!raw) continue;
    if (f.type === 'terms') {
      active[f.key] = raw.split('|').filter(Boolean);
    } else {
      const [from, to] = raw.split('-').map((s) => (s.trim() === '' ? undefined : Number(s)));
      if (Number.isFinite(from) || Number.isFinite(to)) {
        active[f.key] = { gte: Number.isFinite(from) ? from : -Infinity, lte: Number.isFinite(to) ? to : Infinity };
      }
    }
  }
  return active;
};

function whereClause(active) {
  const where = {};
  for (const f of filters) {
    const value = active[f.key];
    if (!value) continue;
    if (f.type === 'terms' && value.length) where[f.prop] = { containsAll: value };
    if (f.type === 'range') where[f.prop] = { between: [value.gte, value.lte] };
  }
  return Object.keys(where).length ? where : undefined;
}

function highlight(doc, q) {
  if (!q) return null;
  const termsByAnalyzer = new Map([...groups.keys()].map((a) => [a, new Set(analyze(q, a))]));
  const result = {};
  for (const f of fields) {
    const fragments = highlightField(textValues(doc, f.key), f.analyzer, termsByAnalyzer.get(f.analyzer));
    if (fragments) result[f.key] = fragments;
  }
  return Object.keys(result).length ? result : null;
}

function toHit(row, doc, scored, q) {
  const hit = { _id: doc.identificativo, _score: scored ? row.score : null, _source: doc };
  const hl = highlight(doc, q);
  if (hl) hit.highlight = hl;
  return hit;
}

exports.getDocumentById = function (id) {
  const doc = byIdentifier.get(id);
  return {
    hits: {
      total: { value: doc ? 1 : 0, relation: 'eq' },
      max_score: doc ? 1 : null,
      hits: doc ? [{ _id: doc.identificativo, _score: 1, _source: doc }] : [],
    },
  };
};

// activeFilters: risultato di parseFilters.
exports.getDocuments = function (q, page, size, sort, activeFilters = {}) {
  const start = process.hrtime.bigint();

  page = Math.max(parseInt(page, 10) || DEFAULT_PAGE, 1);
  size = Math.max(parseInt(size, 10) || DEFAULT_SIZE, 0);
  if (!sort) sort = DEFAULT_SORT;

  const where = whereClause(activeFilters);
  const matches = q ? fullTextMatches(q, where) : allMatches(where);
  const rows = sortMatches(matches, sort);
  const scored = sort.startsWith('_score');
  const pageRows = rows.slice((page - 1) * size, page * size);

  return {
    took: Number((process.hrtime.bigint() - start) / 1000000n),
    timed_out: false,
    hits: {
      total: { value: rows.length, relation: 'eq' },
      max_score: scored && rows.length ? Math.max(...rows.map((r) => r.score)) : null,
      hits: pageRows.map((row) => toHit(row, documents[row.index], scored, q)),
    },
    aggregations: aggregations(rows),
  };
};

exports.documentCount = documents.length;
