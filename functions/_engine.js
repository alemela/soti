// Motore di ricerca condiviso dalle Pages Functions. Le ricette arrivano dal JSON
// generato da pages/build.js; l'indice si costruisce alla prima richiesta e resta
// in memoria finché Cloudflare tiene viva la funzione.

import data from '../pages/generated/data.json';
import engineModule from '../search/engine.js';

let engine;
export const getEngine = () => (engine ??= engineModule.createEngine(data));

// Query string come la legge Express: un parametro ripetuto diventa un array.
export function queryOf(request) {
  const query = {};
  for (const [key, value] of new URL(request.url).searchParams) {
    if (!(key in query)) query[key] = value;
    else query[key] = [].concat(query[key], value);
  }
  return query;
}

export const json = (body) => Response.json(body);

export const searchError = (err) => {
  console.error(err);
  return new Response('Errore nella ricerca del documento', { status: 500 });
};
