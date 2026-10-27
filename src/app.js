const express = require('express');
const pedidoRoutes = require('./routes/pedidoRoutes');
const { naoEncontrado, tratarErros } = require('./middlewares/errorHandler');

const app = express();

app.use(express.json());
app.use('/pedidos', pedidoRoutes);
app.use(naoEncontrado);
app.use(tratarErros);

module.exports = app;
