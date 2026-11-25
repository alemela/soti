// Analisi del testo: replica gli analyzer che Elasticsearch usava su questi dati,
// così che ricerca e highlight trovino esattamente le stesse parole.
//
// - "standard": tokenizer Unicode (UAX#29) + lowercase. Era l'analyzer di tutti i
//   campi senza mapping esplicito (sottotitolo, portata, tag, ingredienti.nome, note).
// - "italian": come l'analyzer "italian" di ES/Lucene: tokenizer standard, elisione
//   (dell'acqua -> acqua), lowercase, stopword italiane, stemmer "light_italian".
//   Era usato solo su "titolo" (vedi il vecchio data/mapping.json).

const { stopwords } = require('@orama/stopwords/italian'); // stessa lista Snowball usata da Lucene

const ITALIAN_STOPWORDS = new Set(stopwords);

// Articoli eliminati dal filtro di elisione dell'analyzer italiano di Lucene.
const ITALIAN_ARTICLES = new Set([
  'c', 'l', 'all', 'dall', 'dell', 'nell', 'sull', 'coll', 'pell',
  'gl', 'agl', 'dagl', 'degl', 'negl', 'sugl', 'un', 'm', 't', 's', 'v', 'd',
]);

// Locale "und" (root): regole UAX#29 pure, come lo StandardTokenizer di Lucene,
// senza le personalizzazioni per lingua che ICU applica agli apostrofi.
const wordSegmenter = new Intl.Segmenter('und', { granularity: 'word' });
const sentenceSegmenter = new Intl.Segmenter('und', { granularity: 'sentence' });

// Parole di un testo con le loro posizioni (servono all'highlight).
function* words(text) {
  for (const s of wordSegmenter.segment(text)) {
    if (s.isWordLike) yield { word: s.segment, start: s.index, end: s.index + s.segment.length };
  }
}

function* sentences(text) {
  for (const s of sentenceSegmenter.segment(text)) {
    yield { start: s.index, end: s.index + s.segment.length };
  }
}

function elide(word) {
  const i = word.search(/['’]/);
  if (i > 0 && ITALIAN_ARTICLES.has(word.slice(0, i).toLowerCase())) return word.slice(i + 1);
  return word;
}

// Porting di org.apache.lucene.analysis.it.ItalianLightStemmer (stemmer "light_italian").
function italianLightStem(term) {
  if (term.length < 6) return term;
  const s = term
    .replace(/[àáâä]/g, 'a')
    .replace(/[òóôö]/g, 'o')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ìíîï]/g, 'i');
  const last = s[s.length - 1];
  const prev = s[s.length - 2];
  switch (last) {
    case 'e': return s.slice(0, prev === 'i' || prev === 'h' ? -2 : -1);
    case 'i': return s.slice(0, prev === 'h' || prev === 'i' ? -2 : -1);
    case 'a':
    case 'o': return s.slice(0, prev === 'i' ? -2 : -1);
    default: return s;
  }
}

// Ogni analyzer trasforma una parola nel termine indicizzato, o null se va scartata.
const analyzers = {
  standard: (word) => word.toLowerCase(),
  italian: (word) => {
    const term = elide(word).toLowerCase();
    if (!term || ITALIAN_STOPWORDS.has(term)) return null;
    return italianLightStem(term);
  },
};

function analyze(text, analyzerName) {
  const analyzer = analyzers[analyzerName];
  const terms = [];
  for (const { word } of words(text)) {
    const term = analyzer(word);
    if (term) terms.push(term);
  }
  return terms;
}

module.exports = { analyzers, analyze, words, sentences, italianLightStem };
