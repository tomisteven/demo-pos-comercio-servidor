# Arquitectura Servidor

## Entrypoints
- `server.js` - Configura app, CORS, middlewares, rutas, health, exporta app. Si `require.main === module` levanta servidor local
- `api/index.js` - Handler para Vercel
- `src/config/db.js` - Conexión con cache para serverless + `ensureDB`

## Estructura
```
src/
├── config/      # db
├── controllers/ # Lógica por recurso
├── middlewares/ # auth, errorHandler
├── models/      # Schemas Mongoose
├── routes/      # Definición de rutas
├── seeds/       # Datos iniciales
├── services/    # Lógica reutilizable (saleService)
└── utils/       # Helpers (tokens, fechas AR, AI, etc)
```
