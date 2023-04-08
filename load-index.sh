#!/bin/bash

source .env

# Nome della cartella che contiene i file JSON
JSON_FOLDER="./data"

# URL dell'endpoint di Elasticsearch per l'indice "ricette"
ELASTICSEARCH_URL="http://${ES_HOST}/${ES_INDEX}/_doc"

# Imposta il mapping dell'indice "ricette"
# MAPPING=$(cat mapping.json)

# Effettua una richiesta HTTP DELETE per droppare l'indice "ricette"
curl -s -X DELETE "http://${ES_HOST}/${ES_INDEX}"
echo "
Indice droppato"

# Effettua una richiesta HTTP PUT per creare l'indice "ricette" con il mapping appropriato
# curl -s -H "Content-Type: application/json" -X PUT "http://localhost:9200/ricette" -d "$MAPPING"
curl -s -H "Content-Type: application/json" -X PUT "http://${ES_HOST}/${ES_INDEX}"
echo "
Indice creato"

# Cicla su tutti i file JSON nella cartella specificata
for file in $JSON_FOLDER/*.json
do
  # Estrae il nome del file senza l'estensione
  # identifier=$(basename "$file" .json)

    # Aggiunge il campo "identificativo" al file utilizzando jq
  # Estrae il contenuto del file e lo converte in una stringa JSON
  # json=$(jq --arg id "$identifier" '. + {identificativo: $id}' "$file")
  json=$(cat $file)

  echo "
Caricando $file"

  # Effettua una richiesta HTTP POST per inserire il documento nell'indice
  curl -s -H "Content-Type: application/json" -X POST $ELASTICSEARCH_URL -d "$json"
done
