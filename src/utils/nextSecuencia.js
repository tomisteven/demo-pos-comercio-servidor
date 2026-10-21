const Counter = require('../models/Counter');

// Genera un correlativo atomico con prefijo: P-0001, PED-0001, PROM-0001...
// El contador se incrementa con findByIdAndUpdate + upsert, de modo que dos
// requests simultaneos nunca obtienen el mismo numero.
const nextSecuencia = async (clave, prefijo, pad = 4) => {
  const counter = await Counter.findByIdAndUpdate(
    clave,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `${prefijo}${String(counter.seq).padStart(pad, '0')}`;
};

module.exports = { nextSecuencia };
