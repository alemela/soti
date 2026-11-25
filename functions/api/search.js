// GET /api/search: come la route in routes.js
import { getEngine, queryOf, json, searchError } from '../_engine.js';

export function onRequestGet({ request }) {
  try {
    const engine = getEngine();
    const query = queryOf(request);
    const filters = engine.parseFilters(query); // filtri configurati in FILTERS
    return json(engine.getDocuments(query.q, query.page, query.size, query.sort, filters));
  } catch (err) {
    return searchError(err);
  }
}
