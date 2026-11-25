// Build per Cloudflare Pages: prepara in dist/ il sito statico e in
// pages/generated/data.json le ricette già trasformate, che le Pages Functions
// (functions/api) importano per rispondere alle ricerche.
//
// Da lanciare nella cartella di soti, con il .env al suo posto: npm run build:pages

const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { loadSearchData } = require('../search/load');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const GENERATED = path.join(__dirname, 'generated');

// 1. app/static/config.js con le variabili FE_ del .env, come per il server
require('../build');

// 2. ricette e configurazione della ricerca per le Functions
const data = loadSearchData();
fs.mkdirSync(GENERATED, { recursive: true });
fs.writeFileSync(path.join(GENERATED, 'data.json'), JSON.stringify(data));

// 3. sito statico: app/ e immagini
fs.rmSync(DIST, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'app'), DIST, { recursive: true });

// IMAGES_DIR: come in server.js, relativa alla cartella di soti
const imagesDir = process.env.IMAGES_DIR ? path.resolve(ROOT, process.env.IMAGES_DIR) : path.join(ROOT, 'images');
if (fs.existsSync(imagesDir)) fs.cpSync(imagesDir, path.join(DIST, 'images'), { recursive: true });
else console.warn(`[pages] cartella immagini non trovata: ${imagesDir}`);

// 4. le rotte di routes.js. Le destinazioni sono senza .html perché Pages serve
// page.html come /page; /search e /api/* funzionano già da soli
const resultRoute = process.env.FE_RESULT_NAME;
const redirects = [
  process.env.WANNA_HOME === 'yes' ? '/  /home  200' : '/  /search  302',
  `/${resultRoute}/*  /page  200`,
];
fs.writeFileSync(path.join(DIST, '_redirects'), redirects.join('\n') + '\n');

console.log(`[pages] ${data.documents.length} ricette, sito pronto in ${path.relative(ROOT, DIST)}/`);
