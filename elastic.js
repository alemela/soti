const elasticsearch = require('elasticsearch');
const { Sort } = require('elasticsearch');
const esb = require('elastic-builder');
require('dotenv').config();

const client = new elasticsearch.Client({
  host: process.env.ES_HOST
});

// funzione generica per lanciare una query
async function sendQuery(query, page, size, filterClauses) {
  try {

    const highlight = esb.highlight()
      .numberOfFragments(3)
      .fragmentSize(150)
      .fields(process.env.ES_SEARCHABLE_KEYS.split(", ").concat('_all'))
      .preTags('<em>', '_all')
      .postTags('</em>', '_all')

    // Crea una richiesta di ricerca usando la query creata sopra
    let searchRequest = esb.requestBodySearch()
      .query(esb.boolQuery()
          .must(query)
          .filter(esb.boolQuery().must(filterClauses)) // RIUSALO NON AGGIUNGERE ALTRO PER ALTRI FILTRI
      )
      .agg(esb.termsAggregation('tags', 'tag.keyword').size(10))
      .highlight(highlight)
      .sort(esb.sort('_score', 'desc'));

    // Esegui la ricerca tramite il client Elasticsearch e restituisci il risultato
    const body = await client.search({
      index: process.env.ES_INDEX,
      body: searchRequest.toJSON(),
      from: (page - 1) * size,
      size: size
    });

    // Estrai il documento dalla risposta di Elasticsearch
    const result = body;

    return result;
  } catch (error) {
    console.error(`Error fetching documents:`, error.message);
    throw error;
  }
};

// Definisci una funzione che recupera un documento dall'indice "ricette" con un determinato "_id"
exports.getDocumentById = async function (id) {
    const query = esb.matchQuery('identificativo', `${id}`);
    return await sendQuery(query, 1, 1, []);
}

exports.getDocuments = async function (ricerca, page, size, tags) { //XXX tags va generalizzato per altri filtri NON aggiungere altri parametri all'infinito
    let query;

    if (ricerca) {
        query = esb.multiMatchQuery(process.env.ES_SEARCHABLE_KEYS.split(", "), ricerca) //qui puoi aggiungere nell'array tutti i campi in cui cercare
        .type('cross_fields')
        .operator("and")
    } else {
        query = esb.matchAllQuery();
    }

    if (!page) page = 1;  //XXX questo default è sparso in giro, andrebbe creata una variabile di repo
    if (!size) size = 10; //XXX questo default è sparso in giro, andrebbe creata una variabile di repo

    const tagsClauses = tags.map(tag => {
        return esb.termQuery('tag.keyword', tag); // Va generalizzato
    });

    return await sendQuery(query, page, size, tagsClauses); //XXX tagsClauses va generalizzato per altri filtri NON aggiungere altri parametri all'infinito
}
