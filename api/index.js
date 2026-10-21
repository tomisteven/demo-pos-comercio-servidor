// Serverless Function para Vercel.
// Requiere server.js (que exporta la app Express sin abrir puerto)
// y la expone como manejador de requests.
require('dotenv').config();

const app = require('../server');

module.exports = app;
