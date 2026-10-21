const Budget = require('../models/Budget');
const Promotion = require('../models/Promotion');
const Product = require('../models/Product');
const { nextSecuencia } = require('../utils/nextSecuencia');
const { crearVenta } = require('../services/saleService');

const generateBudgetNumber = async () => nextSecuencia('budget', 'P-');

const getBudgets = async (req, res) => {
  try {
    const { estado } = req.query;
    const filter = {};
    if (estado) filter.estado = estado;
    const budgets = await Budget.find(filter)
      .populate('items.producto', 'nombre sku imagen')
      .populate('items.promocion', 'nombre numero')
      .populate('empleado', 'nombre')
      .sort({ fecha: -1 });
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener presupuestos' });
  }
};

const getBudget = async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id)
      .populate('items.producto', 'nombre sku imagen precioVenta')
      .populate('items.promocion', 'nombre numero')
      .populate('empleado', 'nombre')
      .populate('venta');
    if (!budget) return res.status(404).json({ message: 'Presupuesto no encontrado' });
    res.json(budget);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener presupuesto' });
  }
};

// Normaliza las lineas recibidas: resuelve el nombre y valida que el producto
// (o la promocion) exista, de modo que el presupuesto no guarde referencias rotas.
const normalizeItems = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('El presupuesto debe tener al menos un producto');
  }

  const normalized = [];

  for (const i of items) {
    const cantidad = Number(i.cantidad);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new Error('Cantidad inválida en el presupuesto');
    }

    const precioUnitario = Number(i.precioUnitario);
    if (!Number.isFinite(precioUnitario) || precioUnitario < 0) {
      throw new Error('Precio unitario inválido en el presupuesto');
    }

    if (i.promocion) {
      const promo = await Promotion.findById(i.promocion);
      if (!promo) throw new Error('Promoción no encontrada');
      normalized.push({
        promocion: promo._id,
        producto: promo.productoPrincipal,
        nombre: promo.nombre,
        cantidad,
        precioUnitario,
        subtotal: precioUnitario * cantidad
      });
      continue;
    }

    const product = await Product.findById(i.producto);
    if (!product) throw new Error('Producto no encontrado');

    normalized.push({
      producto: product._id,
      nombre: product.nombre,
      cantidad,
      precioUnitario,
      subtotal: precioUnitario * cantidad
    });
  }

  return normalized;
};

const createBudget = async (req, res) => {
  try {
    const { items, descuento, clienteNombre, clienteTelefono, notas } = req.body;

    const normalized = await normalizeItems(items);
    const subtotal = normalized.reduce((sum, i) => sum + i.subtotal, 0);
    const descuentoAplicado = Math.min(Math.max(Number(descuento) || 0, 0), 100);
    const total = subtotal * (1 - descuentoAplicado / 100);
    const numero = await generateBudgetNumber();

    const budget = await Budget.create({
      numero, items: normalized, subtotal, descuento: descuentoAplicado, total,
      clienteNombre, clienteTelefono, notas, empleado: req.user._id
    });

    const populated = await budget.populate([
      { path: 'items.producto', select: 'nombre sku' },
      { path: 'items.promocion', select: 'nombre numero' },
      { path: 'empleado', select: 'nombre' }
    ]);
    res.status(201).json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Convierte el presupuesto en una venta real: descuenta stock, calcula costos
// historicos, deducciones por medio de pago y puntos del cliente.
const convertToSale = async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);
    if (!budget) return res.status(404).json({ message: 'Presupuesto no encontrado' });
    if (budget.estado !== 'pendiente') return res.status(400).json({ message: 'El presupuesto no está pendiente' });

    const items = budget.items.map(i => ({
      producto: i.producto,
      promocion: i.promocion,
      cantidad: i.cantidad,
      precioUnitario: i.precioUnitario
    }));

    const sale = await crearVenta({
      items,
      descuento: budget.descuento,
      metodoPago: 'efectivo',
      montoPagado: budget.total,
      notas: `Convertido de presupuesto ${budget.numero}`,
      usuarioId: req.user._id,
      usarPreciosFijos: true,
      permitirPromocionInactiva: true
    });

    budget.estado = 'convertido';
    budget.venta = sale._id;
    await budget.save();

    const populated = await Budget.findById(budget._id)
      .populate('items.producto', 'nombre sku')
      .populate('items.promocion', 'nombre numero')
      .populate('empleado', 'nombre');
    res.json(populated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);
    if (!budget) return res.status(404).json({ message: 'Presupuesto no encontrado' });
    if (budget.estado === 'convertido') return res.status(400).json({ message: 'No se puede eliminar un presupuesto convertido' });
    budget.estado = 'vencido';
    await budget.save();
    res.json({ message: 'Presupuesto cancelado' });
  } catch (error) {
    res.status(500).json({ message: 'Error al cancelar presupuesto' });
  }
};

module.exports = { getBudgets, getBudget, createBudget, convertToSale, deleteBudget };
