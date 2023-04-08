# Setup
```
npm install
node build.js
./tunnel.sh #optional
```

# Build data
```
./load-index.sh
```

# Run
```
node server.js
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

# TODO
- configurazione dati con dizionario e comportamenti FE (filtri, tag, etc)
- filtro tag va bene tutti + slider per ad esempio il tempo
- ordina per da finire
- check mobile (barra in alto soprattutto)
- fare in modo che Sofi possa sviluppare dosi dinamiche senza introiare Soti
- rendere facile fare i cambiamenti senza incasinarsi con git (e.g. immagini di esempio vs quelle vere)
- sidebar ispirarsi a https://www.autohero.com/it/search/?sort=price_asc&yearMin=2018
- stile ispirarsi a https://ricette.giallozafferano.it/Tiramisu.html
