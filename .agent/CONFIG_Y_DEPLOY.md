# Configuración y Deploy

## Variables (.env local)
Ver `.env.example`. Claves importantes:
- `PORT` (9090)
- `NODE_ENV`
- `MONGODB_URI`
- `JWT_SECRET`, `JWT_EXPIRES_IN`
- `CLIENT_URL`
- `OPENAI_API_KEY`, `OPENAI_MODEL`

## Vercel
- Root `SERVIDOR/`
- `vercel.json` usa `@vercel/node` con `api/index.js`
- `api/index.js` usa `require('dotenv').config({ override: false })`
- En producción `require.main !== module` no levanta puerto
- `ensureDB` con cache para reutilizar conexión

## Netlify (Frontend)
- Base `CLIENTE`, Build `npm run build`, Publish `dist`, SPA redirect
