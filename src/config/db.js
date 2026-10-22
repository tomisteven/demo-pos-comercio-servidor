const mongoose = require('mongoose');

// Conexión cacheada: en serverless (Vercel) el módulo se reutiliza entre
// invocaciones "calientes", así que reusamos la misma conexión en vez de
// abrir una nueva por request.
//
// IMPORTANTE: `cached` guarda la PROMESA en curso. Si una conexión previa
// falló, se resetea a null para reintentar en la próxima invocación.
let cached = null;

const connectDB = async () => {
  // mongoose.readyState: 1 = conectado, 2 = conectando
  if (cached && (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2)) {
    return cached;
  }
  if (cached && mongoose.connection.readyState === 0) {
    cached = null; // conexión caída: reconectar
  }

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

// Middleware de Express: garantiza que la conexión a Mongo esté lista ANTES
// de llegar al handler. En serverless esto es imprescindible: el módulo se
// importa una vez, pero el request puede llegar antes de que la conexión
// inicial (fire-and-forget) haya terminado -> "buffering timed out".
const ensureDB = async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error('Error de conexión a MongoDB (ensureDB):', error.message);
    res.status(503).json({ message: 'Base de datos no disponible' });
  }
};

module.exports = connectDB;
module.exports.ensureDB = ensureDB;
