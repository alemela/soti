# Setup
Crea un file `.env` nella root di questo progetto. Puoi ispirarti a `example/dot-env`. Tramite questo file piloti tutti i parametri del sito, è obbligatorio compilarlo. Maggiori info nella sezione .env.

Poi lancia i comandi:
```
npm install
node build.js
```

`node build.js` copia le variabili `FE_` del `.env` nel frontend (`app/static/config.js`): rilancialo ogni volta che ne cambi una, altrimenti il sito continua a usare i valori vecchi.

# Dati
Le ricette sono note Markdown nella cartella `data/items`, compatibili con [Obsidian](https://obsidian.md): puoi aprire la cartella come vault (o metterla dentro il tuo) e modificarle da lì. Un file per ricetta, sulla falsa riga di `example/example.md`:
- il nome del file è l'identificativo e diventa l'indirizzo della pagina, e.g. `gateau-patate.md` -> `/ricetta/gateau-patate`
- in testa ci sono le proprietà (YAML): titolo, portata, difficoltà, `tags`, i tempi come `tempo_preparazione`, `tempo_cottura`, `tempo_totale` (Obsidian non gestisce proprietà annidate)
- nel corpo le sezioni `## Ingredienti`, `## Preparazione` (lista numerata, un passaggio per voce) e `## Note`
- gli ingredienti sono una lista, uno per riga, nella forma `quantità unità [[ingrediente]] (nota)`; quantità, unità e nota sono facoltative:
  ```
  ## Ingredienti

  - 5 [[patate]] (medie)
  - 125 g [[pancetta]]
  - 1 [[limoni|limone]]
  - q.b. [[parmigiano]]

  ### Ripieno

  - 3 [[mele]]
  ```
  `### Titolo` apre un gruppo di ingredienti. La quantità accetta anche `0,5` e `1/2`. Per i pezzi non si scrive l'unità; le unità ammesse sono g, kg, ml, cl, l, cucchiaio, cucchiaino, bicchiere, bicchierino, tazza, vasetto, bustina, spicchio, foglia, costa, cespo, fetta, pizzico, q.b. (al singolare o al plurale, l'elenco è in `search/format.js`). `[[limoni|limone]]` cambia solo il testo mostrato
- il **dizionario degli ingredienti** è la cartella `data/items/ingredienti`: una nota per ingrediente, il nome del file è il nome dell'ingrediente. Ogni `[[ingrediente]]` delle ricette è un collegamento a una di queste note, quindi in Obsidian hai l'autocompletamento e, aprendo `patate.md`, i backlink a tutte le ricette che le usano. Il filtro "Ingredienti" del sito usa le voci del dizionario. Nella nota puoi mettere dei sinonimi con la proprietà `aliases` (e.g. `aliases: [patata]`): Obsidian li propone mentre scrivi e il sito li riconduce alla voce. Per un ingrediente nuovo crea la sua nota (anche vuota)
- all'avvio il server segnala in console gli ingredienti che non sono nel dizionario, le righe ingrediente scritte male e le unità sconosciute; la ricetta viene caricata lo stesso
- nei testi puoi usare il Markdown (*corsivo*, **grassetto**, link) e i collegamenti di Obsidian a un'altra ricetta: `[[cavolfiore-gratinato]]` o `[[cavolfiore-gratinato|cavolfiore gratinato]]`

La ricerca gira in memoria dentro il server (libreria [Orama](https://orama.com), codice in `search/`), non serve nessun servizio esterno. All'avvio il server legge tutte le ricette e costruisce l'indice: dopo aver aggiunto o modificato un file basta riavviarlo. Con `npx nodemon server.js -e js,md` il riavvio è automatico.

Per una modifica di massa a tutte le ricette (rinominare un campo, cambiare un valore...) scrivila in `data/converter.js` e lancia `node data/converter.js`: legge ogni ricetta, la modifica e la riscrive. Converte anche eventuali vecchi file `.json` in `.md`.

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

# Istruzioni
- Come immagine per gli item scegli un'immagine tendenzialmente orizzontale larga almeno 750px.
- Puoi definire il path tramite la proprietà `imageUrl`, può essere un URL o un percorso locale. Di default puoi non compilarla e mettere sotto `/images` le immagini in formato `.png` col nome uguale a quello della ricetta (e.g. `gateau-patate.png`). Verranno riconosciute in automatico.
- Il logo deve trovarsi in `app/static/logo.png` e può essere quadrato o orizzontale, non verticale.

# Cosa puoi toccare
- Principalmente il file `.env` sulla base dell'esempio in `example/dot-env`
- E chiaramente il logo in `app/static/logo.png`

Puoi personalizzare la resa grafica toccando:
- Il CSS senza cambiare le classi
- Le pagine dentro la cartella `app/template` senza cambiare le classi
- Gli import dei font in `app/search.html`, `app/home.html` e `app/page.html` coordinandosi col CSS

Ulteriori cambiamenti sono possibili ma non garantiscono la compatibilità con future release.

# .env
Nei parametri che indicano campi della ricetta, i tag si chiamano `tag` e i tempi `tempi.totale`, `tempi.cottura`... (nel file sono `tags` e `tempo_totale`, `tempo_cottura`... per compatibilità con Obsidian).

- SERVER_PORT: la porta su cui girerà questo sito
- WANNA_HOME: "yes" se vuoi anche l'homepage, "no" per andare direttamente sui risultati di ricerca
- SEARCHABLE_KEYS: campi della ricetta separati da virgola e spazio, sono quelli che vuoi rendere cercabili dalla buca; ne serve almeno uno. Per i campi dentro array di oggetti usa il punto, e.g. `ingredienti.nome`. Ogni ingrediente ha `nome` (la voce del dizionario), `etichetta` (il testo dopo `|`, se c'è), `quantità`, `unità`, `nota` e `sezione`.
- ITALIAN_KEYS: sottoinsieme di SEARCHABLE_KEYS analizzato in italiano: stemming leggero (e.g. "patata" trova "patate"), stopword ed elisioni (e.g. "dell'acqua" trova "acqua"). Gli altri campi cercano la parola esatta, senza distinguere maiuscole e minuscole. Default: "titolo"
- FILTERS: i filtri della sidebar, come campo|label|tipo poi virgola spazio e si continua. Il tipo `terms` mostra i valori più frequenti tra i risultati, con i conteggi, da spuntare (devono esserci tutti quelli scelti); un quarto parametro facoltativo dice quanti valori mostrare (default 10). Il tipo `range` mostra due slider da/a per un campo numerico. Vanno bene anche campi dentro array di oggetti, e.g. `ingredienti.nome|Ingredienti|terms|15`. Default: "tag|Tag|terms"
- FE_WEBSITE_TITLE: il titolo del sito, compilerà il tag title
- FE_NAVBAR_PLACEHOLDER: la frase da far uscire nella buca di ricerca; facoltativo
- FE_FOOTER: la frase da far uscire nel footer (al momento supporta solo una frase)
- FE_HL_1: campi della ricetta separati da virgola e spazio; devono essere un sottoinsieme di SEARCHABLE_KEYS; sono quelli che avrai messo in `app/template/organic-card.html` e vuoi che abbiano un highlighting visibile; facoltativo
- FE_HL_2: campi della ricetta separati da virgola e spazio; devono essere un sottoinsieme di SEARCHABLE_KEYS esclusi quelli in FE_HL_1; sono quelli che non sono visibili in `app/template/organic-card.html` e vuoi che abbiano visibilità solo se contengono una parola cercata; facoltativo
- FE_ORDER_BY: campo|label|label per asc|label per desc poi virgola spazio e si continua; campi numerici della ricetta che vuoi usare per l'ordinamento (anche annidati, e.g. `tempi.totale`); facoltativo
- FE_RESULT_NAME: il nome singolare degli elementi del tuo sito, e.g. "ricetta"; viene usato come label quando la ricerca ha 1 solo risultato e nel path che porta alle pagine singole
- FE_RESULTS_NAME: il nome plurale degli elementi del tuo sito, e.g. "ricette"; viene usato come label nelle ricerche

# TODO
- configurazione dati con dizionario e comportamenti FE (filtri, tag, etc)
- fare in modo che Sofi possa sviluppare dosi dinamiche senza introiare Soti
- rendere facile fare i cambiamenti senza incasinarsi con git (e.g. immagini di esempio vs quelle vere)
- sidebar ispirarsi a https://www.autohero.com/it/search/?sort=price_asc&yearMin=2018
- stile ispirarsi a https://ricette.giallozafferano.it/Tiramisu.html
