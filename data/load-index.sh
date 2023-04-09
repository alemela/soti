#!/bin/bash

source ../.env

# Nome della cartella che contiene i file JSON
JSON_FOLDER="./items"

# URL dell'endpoint di Elasticsearch per l'indice
ELASTICSEARCH_URL="http://${ES_HOST}:${ES_PORT}/${ES_INDEX}/_doc"

# Effettua una richiesta HTTP DELETE per droppare l'indice
curl -s -X DELETE "http://${ES_HOST}:${ES_PORT}/${ES_INDEX}"
echo "
Indice droppato"

# Effettua una richiesta HTTP PUT per creare l'indice con il mapping appropriato
curl -s -H "Content-Type: application/json" -X PUT "http://${ES_HOST}:${ES_PORT}/${ES_INDEX}" -d @mapping.json
echo "
Indice creato"

# Cicla su tutti i file JSON nella cartella specificata
for file in $JSON_FOLDER/*.json
do

  json=$(cat $file)

  echo "
Caricando $file"

  # Effettua una richiesta HTTP POST per inserire il documento nell'indice
  curl -s -H "Content-Type: application/json" -X POST $ELASTICSEARCH_URL -d "$json"
done
