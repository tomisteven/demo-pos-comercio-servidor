const mongoose = require('mongoose');

// Conexión cacheada: en serverless (Vercel) el módulo se reutiliza entre
// invociones "calientes", así que reusamos la misma conexión en vez de
// abrir una nueva por request.
let cached = null;

const connectDB = async () => {
  if (cached) return cached;

  const uri = process.env.MONGODB_URI;

  // Diagnóstico explícito: si la env var no llegó, lo vemos en los logs
  // en vez de quedarnos con el "buffering timed out" genérico.
  if (!uri) {
    console.error('Error de conexión a MongoDB: MONGODB_URI no está definida en el entorno');
    throw new Error('MONGODB_URI no está definida');
  }

  const uriRedacted = uri.replace(/:\/\/([^:]+):[^@]+@/, '://$1:****@');
  console.log(`Conectando a MongoDB (${uriRedacted.slice(0, 90)}...)`);

  cached = mongoose
    .connect(uri, {
      // < bufferTimeoutMS (10s): así el error real de conexión aparece en los
      // logs antes del "findOne() buffering timed out" genérico.
      serverSelectionTimeoutMS: 8000,
    })
    .then((conn) => {
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      return conn;
    })
    .catch((error) => {
      console.error(`Error de conexión a MongoDB: ${error.message}`);
      cached = null; // permitir reintentar en la próxima invocación
      throw error;
    });

  return cached;
};

module.exports = connectDB;
