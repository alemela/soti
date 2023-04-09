# Setup
Crea un file `.env` nella root di questo progetto. Puoi ispirarti a `example/dot-env`. Tramite questo file piloti tutti i parametri del sito, è obbligatorio compilarlo. Maggiori info nella sezione .env.

Poi lancia i comandi:
```
npm install
node build.js
./tunnel.sh #optional
```

# Dati
Se hai già un indice Elasticsearch con dei dati non ti occorre fare questo passaggio. Se invece vuoi salvare qui dei JSON da usare come documenti allora inseriscili nella cartella `data/items`. Dovranno essere tutti file singoli, con l'estensione `.json` sulla falsa riga di `example/example.json`. Ogni volta che vuoi aggiornare l'indice lancia:
```
./load-index.sh
```
N.B. cancella e ricrea da zero l'indice. Si aspetta un file `data/mapping.json`.

# Run
```
node server.js
```

# Submodule
```
git submodule add git@github.com:alemela/soti.git
```
Copiati nella tua root la cartella `data` e `images`.
Poi crea un file bash con il seguente codice:
```
#!/bin/bash
cp -r images soti

cd soti
node build.js
node server.js
```

Se vuoi salvarti il .env in un repo privato crea una copia e mettilo nella root.

Per futuri aggiornamenti:
```
git submodule update --remote --merge
```

# Istructions
- Come immagine per gli item scegli un'immagine tendenzialmente orizzontale larga almeno 750px.
- Puoi definire il path tramite la chiave `imageUrl`, può essere un URL o un percorso locale. Di default puoi non compilare la chiave e mettere sotto `/images` le immagini in formato `.png` col nome uguale a `identificativo`. Verranno riconosciute in automatico.
- Il logo deve trovarsi in `/static/logo.png` e può essere quadrato o orizzontale, non verticale.

# Cosa puoi toccare
- Principalmente il file `.env` sulla base dell'esempio in `example/dot-env`
- E chiaramente il logo in `app/static/logo.png`

Puoi personalizzare la resa grafica toccando:
- Il CSS senza cambiare le classi
- Le pagine dentro la cartella `app/template` senza cambiare le classi
- Gli import dei font in `app/index.html` e `app/page.html` coordinandosi col CSS

Ulteriori cambiamenti sono possibili ma non garantiscono la compatibilità con future release.

# .env
- MACHINE_IP: un indirizzo IP valido del tuo server con l'indice elastic; serve solo per il tunnel
- SERVER_PORT: la porta su cui girerà questo sito
- WANNA_HOME: "yes" se vuoi anche l'homepage, "no" per andare direttamente sui risultati di ricerca
- ES_HOST: di solito vorrai mettere "localhost"
- ES_PORT: di solito vorrai mettere 9200
- ES_INDEX: il nome dell'indice elastic
- ES_SEARCHABLE_KEYS: campi del JSON separati da virgola e spazio, sono quelli che vuoi rendere cercabili dalla buca; ne serve almeno uno
- FE_WEBSITE_TITLE: il titolo del sito, compilerà il tag title
- FE_NAVBAR_PLACEHOLDER: la frase da far uscire nella buca di ricerca; facoltativo
- FE_FOOTER: la frase da far uscire nel footer (al momento supporta solo una frase)
- FE_HL_1: campi del JSON separati da virgola e spazio; devono essere un sottoinsieme di ES_SEARCHABLE_KEYS; sono quelli che avrai messo in `organic-card-html` e vuoi che abbiano un highlighting visibile; facoltativo
- FE_HL_2: campi del JSON separati da virgola e spazio; devono essere un sottoinsieme di ES_SEARCHABLE_KEYS esclusi quelli in FE_HL_1; sono quelli che non sono visibili in `organic-card-html` e vuoi che abbiano visibilità solo se contengono una parola cercata; facoltativo
- FE_ORDER_BY: campo|label|label per asc|label per desc poi virgola spazio e si continua; campi del JSON che vuoi usare per l'ordinamento; assicurati che funzionino eventualmente migliorando `mapping.json`; facoltativo
- FE_RESULT_NAME: il nome singolare degli elementi del tuo sito, e.g. "ricetta"; viene usato come label quando la ricerca ha 1 solo risultato e nel path che porta alle pagine singole
- FE_RESULTS_NAME: il nome plurale degli elementi del tuo sito, e.g. "ricette"; viene usato come label nelle ricerche

# TODO
- configurazione dati con dizionario e comportamenti FE (filtri, tag, etc)
- filtro tag va bene tutti + slider per ad esempio il tempo
- fare in modo che Sofi possa sviluppare dosi dinamiche senza introiare Soti
- rendere facile fare i cambiamenti senza incasinarsi con git (e.g. immagini di esempio vs quelle vere)
- sidebar ispirarsi a https://www.autohero.com/it/search/?sort=price_asc&yearMin=2018
- stile ispirarsi a https://ricette.giallozafferano.it/Tiramisu.html
