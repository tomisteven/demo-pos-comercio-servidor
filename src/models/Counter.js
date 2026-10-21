const mongoose = require('mongoose');

// Contador atómico por secuencia. Evita el clásico "findOne().sort() + 1",
// que produce numeros duplicados bajo concurrencia y ordena mal al pasar de
// T-9999 a T-10000 (el sort es lexicografico sobre el string).
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

module.exports = Counter;
