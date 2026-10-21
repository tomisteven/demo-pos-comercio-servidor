const Counter = require('../models/Counter');

// Numero de ticket correlativo y atomico: T-0001, T-0002, ...
const generateTicketNumber = async () => {
  const counter = await Counter.findByIdAndUpdate(
    'ticket',
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return `T-${String(counter.seq).padStart(4, '0')}`;
};

module.exports = generateTicketNumber;
