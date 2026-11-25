// Dizionario degli ingredienti: una nota Obsidian per ingrediente nella cartella
// data/items/ingredienti (il nome del file è il nome dell'ingrediente). Nelle
// ricette gli ingredienti sono collegamenti [[patate]] a queste note; il filtro
// del sito usa la voce del dizionario, non il testo scritto.
//
//   ---
//   aliases: [patata]     sinonimi: Obsidian li propone nell'autocompletamento
//   ---                   e il sito li riconduce alla voce
//
// Se la cartella non esiste il dizionario è disattivato: gli ingredienti restano
// come sono scritti e non vengono segnalati.

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const key = (name) => String(name).trim().toLowerCase();

function aliasesOf(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return [];
  const props = YAML.parse(m[1]) || {};
  const aliases = props.aliases ?? props.alias ?? [];
  return (Array.isArray(aliases) ? aliases : [aliases]).filter((a) => a !== null && a !== '').map(String);
}

function loadDictionary(dir) {
  if (!fs.existsSync(dir)) return { enabled: false, names: [], resolve: (name) => name };

  const names = [];
  const byKey = new Map();
  const aliases = [];
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort()) {
    const name = path.basename(file, '.md');
    names.push(name);
    byKey.set(key(name), name);
    for (const alias of aliasesOf(fs.readFileSync(path.join(dir, file), 'utf8'))) aliases.push([key(alias), name]);
  }
  // il nome di una nota vince su un alias uguale di un'altra nota
  for (const [k, name] of aliases) if (!byKey.has(k)) byKey.set(k, name);

  // Come Obsidian, il collegamento non distingue maiuscole e minuscole.
  // Restituisce null se l'ingrediente non è nel dizionario.
  const resolve = (name) => byKey.get(key(name)) ?? null;
  return { enabled: true, names, resolve };
}

module.exports = { loadDictionary };
