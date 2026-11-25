const express = require('express');
const router = require('./routes');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, 'app')));
// IMAGES_DIR: cartella delle immagini fuori da soti (e.g. "../images" se soti è un submodule)
const imagesDir = process.env.IMAGES_DIR ? path.resolve(__dirname, process.env.IMAGES_DIR) : path.join(__dirname, 'images');
app.use('/images', express.static(imagesDir));

app.use(router);

const port = process.env.SERVER_PORT;
app.listen(port, () => {
  console.log(`Server avviato sulla porta ${port}`);
});
