const express = require('express');
const router = require('./routes');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, 'app')));
app.use('/images', express.static(__dirname + '/images'));

app.use(router);

const port = process.env.SERVER_PORT;
app.listen(port, () => {
  console.log(`Server avviato sulla porta ${port}`);
});
