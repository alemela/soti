const fs = require('fs');
const path = require('path');

const dataFolder = path.join(__dirname, 'items');

fs.readdir(dataFolder, (err, files) => {
  if (err) {
    console.error(err);
    return;
  }

  files.forEach((file) => {
    const filePath = path.join(dataFolder, file);

    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.error(err);
        return;
      }

      const jsonData = JSON.parse(data);

      //INIZIO COSE DA CAMBIARE

      if (Array.isArray(jsonData.tempi)) {
        const tempiObj = {};
        jsonData.tempi.forEach((tempo) => {
          tempiObj[tempo.nome] = tempo.minuti;
        });
        jsonData.tempi = tempiObj;
      }

      //FINE COSE DA CAMBIARE

      const newJsonData = JSON.stringify(jsonData, null, 2);

      fs.writeFile(filePath, newJsonData, (err) => {
        if (err) {
          console.error(err);
          return;
        }

        console.log(`File ${filePath} modificato con successo.`);
      });
    });
  });
});

/*
Prompt GPT

Scrivi un codice in nodejs che prende tutti i JSON dentro la cartella "data" e applica una sostituzione. Al posto di

"tempi": [
        {
            "nome": "preparazione",
            "minuti": 10
        },
        {
            "nome": "cottura",
            "minuti": 45
        },
        {
            "nome": "totale",
            "minuti": 55
        }
    ]

mette

"tempi": {
       "preparazione": 10
       "cottura": 45
        "totale": 55
        }
*/
