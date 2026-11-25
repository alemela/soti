// Highlight con le stesse impostazioni che avevamo su Elasticsearch: al massimo
// 3 frammenti per campo da ~150 caratteri, tagliati sui confini di frase come fa
// l'highlighter "unified" di ES. Ogni elemento di un campo array è un valore a sé
// e i frammenti non lo oltrepassano mai.

const { analyzers, words, sentences } = require('./analysis');

const NUMBER_OF_FRAGMENTS = 3;
const FRAGMENT_SIZE = 150;
const PRE_TAG = '<span class="hl">';
const POST_TAG = '</span>';

// Frasi del testo; quelle più lunghe di FRAGMENT_SIZE vengono spezzate al primo
// confine di parola dopo FRAGMENT_SIZE caratteri.
function chunks(text) {
  const out = [];
  const boundaries = [...words(text)].map((w) => w.end);
  for (const sentence of sentences(text)) {
    let start = sentence.start;
    for (const b of boundaries) {
      if (b >= sentence.end) break;
      if (b >= start + FRAGMENT_SIZE) {
        out.push({ start, end: b });
        start = b;
      }
    }
    out.push({ start, end: sentence.end });
  }
  return out;
}

function render(text, { start, end, matches }) {
  let out = '';
  let pos = start;
  for (const m of matches) {
    out += text.slice(pos, m.start) + PRE_TAG + text.slice(m.start, m.end) + POST_TAG;
    pos = m.end;
  }
  return (out + text.slice(pos, end)).trim();
}

// values: valori testuali del campo; terms: Set dei termini della query già
// analizzati con l'analyzer del campo. Restituisce i frammenti, o null se nessuna
// parola del campo corrisponde alla query.
function highlightField(values, analyzerName, terms) {
  const analyzer = analyzers[analyzerName];
  const passages = [];

  values.forEach((text, valueIndex) => {
    const matches = [...words(text)].filter((w) => terms.has(analyzer(w.word)));
    if (!matches.length) return;
    for (const chunk of chunks(text)) {
      const inChunk = matches.filter((m) => m.start >= chunk.start && m.end <= chunk.end);
      if (inChunk.length) passages.push({ text, valueIndex, ...chunk, matches: inChunk });
    }
  });

  if (!passages.length) return null;

  const byPosition = (a, b) => a.valueIndex - b.valueIndex || a.start - b.start;
  return passages
    .sort((a, b) => b.matches.length - a.matches.length || byPosition(a, b)) // i più rilevanti
    .slice(0, NUMBER_OF_FRAGMENTS)
    .sort(byPosition) // poi nell'ordine in cui compaiono nel testo
    .map((p) => render(p.text, p));
}

module.exports = { highlightField };
