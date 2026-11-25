// Applica una modifica a tutte le ricette in data/items e le riscrive come note
// Markdown compatibili con Obsidian (vedi search/format.js).
//
//   node data/converter.js
//
// Legge sia i .md sia i vecchi .json: lanciato su file .json li converte in .md
// e cancella i .json. Per una modifica di massa (rinominare un campo, cambiare
// un valore...) scrivila nella funzione "modifica": riceve ogni ricetta come
// oggetto, nella stessa forma dei vecchi JSON, con i testi in Markdown.

const fs = require('fs');
const path = require('path');
const { readRecipe, stringifyRecipe } = require('../search/format');

const dataFolder = path.join(__dirname, 'items');

function modifica(ricetta) {
  //INIZIO COSE DA CAMBIARE

  //FINE COSE DA CAMBIARE
  return ricetta;
}

// HTML dei vecchi JSON -> Markdown.
function htmlToMarkdown(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/<a href=['"]\/[^'"?]*\?id=([^'"&]+)['"]>(.*?)<\/a>/g, (_, id, label) => (label === id ? `[[${id}]]` : `[[${id}|${label}]]`))
    .replace(/<\/?(i|em)>/g, '*')
    .replace(/<\/?(b|strong)>/g, '**')
    .replace(/\s*<br\s*\/?>\s*/g, '\n\n');
}

function fromJson(ricetta) {
  const { identificativo, ...rest } = ricetta;
  return {
    identificativo,
    ...rest,
    sottotitolo: htmlToMarkdown(rest.sottotitolo),
    preparazione: (rest.preparazione || []).map(htmlToMarkdown),
    note: htmlToMarkdown(rest.note),
  };
}

for (const file of fs.readdirSync(dataFolder).sort()) {
  const ext = path.extname(file);
  if (ext !== '.md' && ext !== '.json') continue;

  const filePath = path.join(dataFolder, file);
  let ricetta = readRecipe(filePath, fs.readFileSync(filePath, 'utf8'));
  if (ext === '.json') ricetta = fromJson(ricetta);
  ricetta = modifica(ricetta);

  const mdPath = path.join(dataFolder, `${ricetta.identificativo}.md`);
  fs.writeFileSync(mdPath, stringifyRecipe(ricetta));
  if (ext === '.json') fs.unlinkSync(filePath);
  console.log(`${file} -> ${path.basename(mdPath)}`);
}
