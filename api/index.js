// Serverless Function para Vercel.
// Requiere server.js (que exporta la app Express sin abrir puerto)
// y la expone como manejador de requests.
// `override: false` (default) => las env vars reales de Vercel NUNCA son
// pisadas por un archivo .env si llegara a existir en el deploy.
require('dotenv').config({ override: false });

const app = require('../server');

module.exports = app;
