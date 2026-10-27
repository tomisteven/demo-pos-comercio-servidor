# Auth, Middlewares y CORS

## Auth
- `middlewares/auth.js` - `protect` (verifica JWT) y `admin`
- `utils/generateToken.js` - Genera JWT
- Header esperado: `Authorization: Bearer <token>`

## Middlewares
- `middlewares/errorHandler.js` - `notFound` y `errorHandler`
- `express.json({ limit: '10mb' })`

## CORS
- Lee `CLIENT_URL` (separado por coma)
- Permite localhost/127.0.0.1/[::1] en cualquier puerto
- Permite IPs privadas en desarrollo
- `app.use('/api', ensureDB)` asegura conexión antes de rutas
