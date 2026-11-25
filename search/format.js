// Formato dei file ricetta: note Markdown compatibili con Obsidian.
//
//   ---
//   titolo: ...            proprietà Obsidian (YAML)
//   tags: [...]            "tags" è il nome che Obsidian riconosce; nel documento diventa "tag"
//   tempo_totale: 70       i tempi sono piatti (Obsidian non gestisce oggetti annidati);
//                          nel documento diventano tempi: { totale: 70, ... }
//   ---
//   ## Ingredienti         un ingrediente per riga: quantità unità [[voce]] (nota)
//   - 5 [[patate]] (medie)       quantità e unità facoltative, la nota pure;
//   - 125 g [[pancetta]]         [[voce]] è una nota del dizionario
//   - q.b. [[parmigiano]]        (vedi dictionary.js), [[voce|testo]] cambia
//   ### Ripieno                  solo il testo mostrato. "### Titolo" apre
//   - 3 [[mele]]                 un gruppo di ingredienti
//   ## Preparazione        lista numerata, un passaggio per voce
//   ## Note                testo libero in Markdown
//
// Il nome del file è l'identificativo. Nei testi si può usare Markdown e i
// collegamenti di Obsidian [[altra-ricetta]] o [[altra-ricetta|etichetta]].
//
// parseRecipe/stringifyRecipe convertono tra file e "record" (stessa forma dei
// vecchi JSON, testi in Markdown); toDocument trasforma il record nel documento
// che usano ricerca e pagine, con i testi già in HTML.

const path = require('path');
const YAML = require('yaml');
const { Marked } = require('marked');
require('dotenv').config();

const SCHEMA_VERSION = '3.0.0'; // 3: ingredienti nel corpo, collegati al dizionario
const DEFAULT_SECTION = 'main';
const INGREDIENTS_HEADING = 'ingredienti';
const RESULT_ROUTE = process.env.FE_RESULT_NAME || 'ricetta';

// Ordine delle proprietà nel file; quelle non elencate vanno in fondo.
const PROPERTY_ORDER = [
  'titolo', 'sottotitolo', 'portata', 'cucina', 'cottura', 'difficoltà', 'numeroPorzioni',
  'tempi', 'tag', 'autore', 'fonte', 'imageUrl',
  'dataInserimento', 'dataUltimoAggiornamento', 'versioneSchema',
];
const BODY_KEYS = new Set(['identificativo', 'ingredienti', 'preparazione', 'note']);

// --- unità di misura ----------------------------------------------------------

// [singolare, plurale, altre grafie accettate]. Nel record c'è il singolare, nel
// file e sul sito la forma giusta per la quantità ("1 cucchiaio", "3 cucchiai").
// Per i pezzi non si scrive l'unità: "3 [[uova]]".
const UNITS = [
  ['g', 'g', 'gr', 'grammo', 'grammi'],
  ['kg', 'kg', 'chilo', 'chili'],
  ['ml', 'ml'],
  ['cl', 'cl'],
  ['l', 'l', 'litro', 'litri'],
  ['cucchiaio', 'cucchiai'],
  ['cucchiaino', 'cucchiaini'],
  ['bicchiere', 'bicchieri'],
  ['bicchierino', 'bicchierini'],
  ['tazza', 'tazze'],
  ['vasetto', 'vasetti'],
  ['bustina', 'bustine'],
  ['spicchio', 'spicchi'],
  ['foglia', 'foglie'],
  ['costa', 'coste'],
  ['cespo', 'cespi'],
  ['fetta', 'fette'],
  ['pizzico', 'pizzichi'],
  ['q.b.', 'q.b.', 'qb'],
];
const PIECES = ['pz', 'pezzo', 'pezzi', 'unità']; // vecchi dati: equivalgono a nessuna unità
const UNIT_FORMS = new Map();
for (const [singular, ...forms] of UNITS) for (const f of [singular, ...forms]) UNIT_FORMS.set(f, singular);
const PLURAL = new Map(UNITS.map(([singular, plural]) => [singular, plural]));

// Forma singolare dell'unità; un'unità sconosciuta resta com'è scritta.
function canonicalUnit(unit) {
  if (unit === null || unit === undefined || unit === '') return null;
  const u = String(unit).trim();
  if (PIECES.includes(u.toLowerCase())) return null;
  return UNIT_FORMS.get(u.toLowerCase()) ?? u;
}
const knownUnit = (unit) => unit === null || PLURAL.has(unit);
const unitLabel = (unit, quantity) =>
  (unit !== null && typeof quantity === 'number' && quantity > 1 ? PLURAL.get(unit) ?? unit : unit);

// --- Markdown -> HTML -------------------------------------------------------

// marked di default trasforma anche ' e " in entità (&#39;): l'highlight
// spezzerebbe "quest'ultimo" in due parole. Qui si fa l'escape solo di & < >.
const escapeText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const marked = new Marked({
  renderer: {
    text(token) {
      return token.tokens ? this.parser.parseInline(token.tokens) : token.escaped ? token.text : escapeText(token.text);
    },
  },
});

const wikilinksToMarkdown = (md) =>
  md.replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]/g, (_, target, label) =>
    `[${label || target}](/${RESULT_ROUTE}/${encodeURIComponent(target.trim())})`);

const inlineHtml = (md) => (md === null || md === undefined ? md : marked.parseInline(wikilinksToMarkdown(String(md))));

// I paragrafi delle note vengono uniti con <br>, come nei vecchi dati.
const paragraphsHtml = (md) =>
  md === null || md === undefined
    ? md
    : String(md).split(/\n\s*\n/).map((p) => inlineHtml(p.trim())).filter(Boolean).join(' <br> ');

// --- file -> record ---------------------------------------------------------

function splitFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { properties: {}, body: text };
  return { properties: YAML.parse(m[1]) || {}, body: m[2] };
}

// Sezioni "## Titolo" del corpo: { titolo minuscolo: testo }.
function sections(body) {
  const out = {};
  let current = null;
  for (const line of body.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      current = heading[1].toLowerCase();
      out[current] = [];
    } else if (current) {
      out[current].push(line);
    }
  }
  return Object.fromEntries(Object.entries(out).map(([k, lines]) => [k, lines.join('\n').trim()]));
}

// Lista numerata -> array di passaggi (le righe a capo dentro una voce vengono unite).
function numberedList(text) {
  const steps = [];
  for (const line of text.split('\n')) {
    const item = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (item) steps.push(item[1].trim());
    else if (line.trim() && steps.length) steps[steps.length - 1] += ' ' + line.trim();
  }
  return steps;
}

// Riga ingrediente: "- [quantità] [unità] [[voce|testo]] [(nota)]".
// La quantità accetta la virgola (0,5) e le frazioni (1/2).
const INGREDIENT_LINE = /^[-*+]\s+(?:(\d+(?:[.,]\d+)?|\d+\/\d+)\s+)?(?:(.+?)\s+)?\[\[([^\[\]|#]+)(?:\|([^\[\]]+))?\]\](?:\s*\((.*)\))?\s*$/;

function parseQuantity(text) {
  if (text === undefined) return null;
  const [num, den] = text.replace(',', '.').split('/').map(Number);
  return den === undefined ? num : num / den;
}

// Sezione "## Ingredienti" -> lista di ingredienti. Una riga che non rispetta
// la sintassi non viene persa: resta come { riga } e il server la segnala.
function ingredientList(text) {
  const items = [];
  let sezione = DEFAULT_SECTION;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const heading = line.match(/^#{3,}\s+(.+)$/);
    if (heading) { sezione = heading[1].trim(); continue; }
    const m = line.match(INGREDIENT_LINE);
    if (!m) { items.push({ sezione, riga: line.replace(/^[-*+]\s+/, '') }); continue; }
    const [, quantity, unit, target, label, note] = m;
    items.push({
      sezione,
      nome: target.trim(),
      etichetta: label ? label.trim() : null,
      quantità: parseQuantity(quantity),
      unità: canonicalUnit(unit),
      nota: note ? note.trim() : null,
    });
  }
  return items;
}

function parseRecipe(text, identificativo) {
  const { properties, body } = splitFrontmatter(text);
  const record = { identificativo };
  const tempi = {};

  for (const [key, value] of Object.entries(properties)) {
    if (key === 'tags') record.tag = value ?? [];
    else if (key.startsWith('tempo_')) tempi[key.slice('tempo_'.length)] = value;
    else record[key] = value;
  }
  if (Object.keys(tempi).length) record.tempi = tempi;

  const body_ = sections(body);
  record.ingredienti = ingredientList(body_[INGREDIENTS_HEADING] || '');
  record.preparazione = numberedList(body_.preparazione || '');
  record.note = body_.note ? body_.note : null;
  return record;
}

// --- record -> file ---------------------------------------------------------

function ingredientLine(i) {
  if (i.riga !== undefined) return `- ${i.riga}`;
  const parts = [];
  if (i['quantità'] !== null && i['quantità'] !== undefined) parts.push(String(i['quantità']));
  const unit = canonicalUnit(i['unità']); // i vecchi JSON hanno "unità", "grammi"...
  if (unit !== null) parts.push(unitLabel(unit, i['quantità']));
  parts.push(i.etichetta ? `[[${i.nome}|${i.etichetta}]]` : `[[${i.nome}]]`);
  if (i.nota) parts.push(`(${i.nota})`);
  return `- ${parts.join(' ')}`;
}

// Gli ingredienti senza gruppo vengono prima; ogni gruppo ha il suo "### Titolo".
function ingredientsMarkdown(items) {
  let out = '';
  let sezione = DEFAULT_SECTION;
  let open = false;
  for (const i of items) {
    const s = i.sezione || DEFAULT_SECTION;
    if (s !== sezione || !open) {
      out += s === DEFAULT_SECTION ? '\n' : `\n### ${s}\n\n`;
      sezione = s;
      open = true;
    }
    out += ingredientLine(i) + '\n';
  }
  return out;
}

function stringifyRecipe(record) {
  const keys = Object.keys(record).filter((k) => !BODY_KEYS.has(k));
  keys.sort((a, b) => {
    const ia = PROPERTY_ORDER.indexOf(a); const ib = PROPERTY_ORDER.indexOf(b);
    return (ia < 0 ? Infinity : ia) - (ib < 0 ? Infinity : ib);
  });

  const doc = new YAML.Document({});
  for (const key of keys) {
    const value = record[key];
    if (key === 'tempi') {
      for (const [k, v] of Object.entries(value || {})) doc.set(`tempo_${k}`, v);
    } else if (key === 'tag') {
      doc.set('tags', value);
    } else {
      doc.set(key, value);
    }
  }
  doc.set('versioneSchema', SCHEMA_VERSION);

  const frontmatter = doc.toString({ nullStr: '', lineWidth: 0 });
  let body = '\n## Ingredienti\n' + ingredientsMarkdown(record.ingredienti || []);
  body += '\n## Preparazione\n\n' + (record.preparazione || []).map((s, i) => `${i + 1}. ${s}`).join('\n') + '\n';
  if (record.note) body += '\n## Note\n\n' + record.note + '\n';
  return `---\n${frontmatter}---\n${body}`;
}

// --- record -> documento per ricerca e pagine --------------------------------

// dictionary (vedi dictionary.js) riconduce ogni ingrediente alla sua voce.
function toDocument(record, dictionary) {
  const resolve = (name) => (dictionary ? dictionary.resolve(name) ?? name : name);
  return {
    ...record,
    ingredienti: (record.ingredienti || []).map((i) =>
      i.riga !== undefined
        ? { sezione: i.sezione, riga: i.riga }
        : { ...i, nome: resolve(i.nome), unità: unitLabel(i['unità'], i['quantità']) }),
    sottotitolo: inlineHtml(record.sottotitolo),
    preparazione: (record.preparazione || []).map(inlineHtml),
    note: paragraphsHtml(record.note),
  };
}

// Problemi di una ricetta da segnalare all'avvio.
function checkRecipe(record, dictionary) {
  const problems = [];
  for (const i of record.ingredienti || []) {
    if (i.riga !== undefined) problems.push(`riga ingrediente non valida: "${i.riga}" (sintassi: quantità unità [[ingrediente]] (nota))`);
    else {
      if (dictionary && dictionary.enabled && dictionary.resolve(i.nome) === null) problems.push(`ingrediente "${i.nome}" non presente nel dizionario`);
      if (!knownUnit(i['unità'])) problems.push(`unità "${i['unità']}" sconosciuta (ingrediente "${i.nome}")`);
    }
  }
  return problems;
}

// Carica un file ricetta (.md, oppure un vecchio .json) come record.
function readRecipe(file, text) {
  const id = path.basename(file, path.extname(file));
  if (file.endsWith('.json')) return JSON.parse(text);
  return parseRecipe(text, id);
}

module.exports = { parseRecipe, stringifyRecipe, toDocument, checkRecipe, readRecipe, SCHEMA_VERSION, UNITS };
