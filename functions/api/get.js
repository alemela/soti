// GET /api/get?id=...: come la route in routes.js
import { getEngine, queryOf, json, searchError } from '../_engine.js';

export function onRequestGet({ request }) {
  try {
    return json(getEngine().getDocumentById(queryOf(request).id));
  } catch (err) {
    return searchError(err);
  }
}
