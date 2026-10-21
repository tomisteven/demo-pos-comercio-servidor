const AIFeatureHistory = require('../models/AIFeatureHistory');

// Los empleados solo ven su propio historial; los administradores ven todo.
const buildFilter = (req, extra = {}) => {
  const filter = { ...extra };
  if (req.user?.rol !== 'admin' && req.user?._id) {
    filter.empleado = req.user._id;
  }
  return filter;
};

const getHistory = async (req, res) => {
  try {
    const { tipo, page = 1, limit = 20 } = req.query;
    const extra = {};
    if (tipo) extra.tipo = tipo;
    const filter = buildFilter(req, extra);

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      AIFeatureHistory.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).select('-resultado'),
      AIFeatureHistory.countDocuments(filter),
    ]);

    res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener historial' });
  }
};

const getHistoryItem = async (req, res) => {
  try {
    const filter = buildFilter(req, { _id: req.params.id });
    const item = await AIFeatureHistory.findOne(filter);
    if (!item) return res.status(404).json({ message: 'No encontrado' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
};

const deleteHistoryItem = async (req, res) => {
  try {
    const filter = buildFilter(req, { _id: req.params.id });
    const deleted = await AIFeatureHistory.findOneAndDelete(filter);
    if (!deleted) return res.status(404).json({ message: 'No encontrado' });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
};

const clearHistory = async (req, res) => {
  try {
    const { tipo } = req.query;
    const extra = {};
    if (tipo) extra.tipo = tipo;
    const filter = buildFilter(req, extra);
    await AIFeatureHistory.deleteMany(filter);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Error' });
  }
};

module.exports = { getHistory, getHistoryItem, deleteHistoryItem, clearHistory };
