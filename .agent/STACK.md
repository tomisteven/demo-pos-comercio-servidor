# Stack Backend

## Core
- **Node.js** + **Express 5**
- **Mongoose 9** (MongoDB Atlas)
- **jsonwebtoken** + **bcryptjs**
- **cors**, **morgan**, **dotenv**

## Scripts
```json
{
  "start": "node server.js",
  "dev": "nodemon server.js",
  "seed": "node src/seeds/seed.js"
}
```

## Puertos
- **Local dev:** `http://localhost:9090`
- **Prod Vercel:** Serverless function via `api/index.js`
