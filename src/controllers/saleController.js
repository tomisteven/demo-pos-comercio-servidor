const mongoose = require('mongoose');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Promotion = require('../models/Promotion');
const StockMovement = require('../models/StockMovement');
const Customer = require('../models/Customer');
const { calcularPuntos } = require('../utils/loyalty');
const { getImpuestosConfig, calcularImpuestosPago } = require('../utils/impuestos');
const { crearVenta } = require('../services/saleService');

// @desc    Obtener todas las ventas
// @route   GET /api/sales
// @access  Private
const getSales = async (req, res) => {
  try {
    const { startDate, endDate, empleado, metodoPago } = req.query;
    let query = {};

    if (startDate || endDate) {
      query.fecha = {};
      if (startDate) {
        // Si viene solo fecha YYYY-MM-DD, ajustamos al inicio del día en Arg (03:00 UTC)
        const s = new Date(startDate);
        if (startDate.length <= 10) s.setUTCHours(3, 0, 0, 0); 
        query.fecha.$gte = s;
      }
      if (endDate) {
        // Si viene solo fecha, ajustamos al fin del día en Arg (02:59:59 del día siguiente UTC)
        const e = new Date(endDate);
        if (endDate.length <= 10) e.setUTCHours(26, 59, 59, 999); // 23+3 = 26
        query.fecha.$lte = e;
      }
    }

    if (empleado) query.empleado = empleado;
    if (metodoPago) query.metodoPago = metodoPago;

    const sales = await Sale.find(query)
      .populate('empleado', 'nombre')
      .populate('cliente', 'nombre telefono')
      .populate('items.producto', 'nombre sku')
      .populate('items.promocion', 'nombre numero')
      .sort({ fecha: -1 });
      
    res.json(sales);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener ventas' });
  }
};

// @desc    Obtener venta por ID
// @route   GET /api/sales/:id
// @access  Private
const getSaleById = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('empleado', 'nombre')
      .populate('cliente', 'nombre telefono')
      .populate('items.producto', 'nombre sku')
      .populate('items.promocion', 'nombre numero');

    if (sale) {
      res.json(sale);
    } else {
      res.status(404).json({ message: 'Venta no encontrada' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la venta' });
  }
};

// @desc    Crear venta nueva transaccionalmente
// @route   POST /api/sales
// @access  Private
const createSale = async (req, res) => {
  try {
    const { items, descuento, metodoPago, montoPagado, cliente, notas, fecha } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No hay productos en la venta' });
    }

    const createdSale = await crearVenta({
      items,
      descuento,
      metodoPago,
      montoPagado,
      cliente,
      notas,
      fecha,
      usuarioId: req.user._id
    });

    res.status(201).json(createdSale);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Anular venta (reponer stock)
// @route   PATCH /api/sales/:id/anular
// @access  Private/Admin
const cancelSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);

    if (!sale) {
      throw new Error('Venta no encontrada');
    }

    if (sale.estado === 'anulada') {
      throw new Error('La venta ya está anulada');
    }

    const stockMovements = [];
    const productsToUpdate = [];

    // Revertir inventario
    for (const item of sale.items) {
      // === Línea de promoción: reponer stock de cada producto que la compone ===
      if (item.promocion) {
        const promotion = await Promotion.findById(item.promocion);

        if (promotion) {
          for (const pi of promotion.items) {
            const product = await Product.findById(pi.producto);

            if (!product) continue;

            const stockRestored = pi.cantidad * item.cantidad;

            stockMovements.push({
              producto: product._id,
              tipo: 'ajuste',
              cantidad: stockRestored,
              stockAnterior: product.stock,
              stockNuevo: product.stock + stockRestored,
              motivo: `Anulación de ticket ${sale.numeroTicket}`,
              usuario: req.user._id
            });

            productsToUpdate.push({
              updateOne: {
                filter: { _id: product._id },
                update: { $inc: { stock: stockRestored } }
              }
            });
          }
        }

        continue;
      }

      const product = await Product.findById(item.producto);

      if (product) {
        let stockRestored = item.cantidad;

        stockMovements.push({
          producto: product._id,
          tipo: 'ajuste', // O 'entrada' pero ajuste por anulación es mejor
          cantidad: stockRestored,
          stockAnterior: product.stock,
          stockNuevo: product.stock + stockRestored,
          motivo: `Anulación de ticket ${sale.numeroTicket}`,
          usuario: req.user._id
        });

        productsToUpdate.push({
          updateOne: {
            filter: { _id: product._id },
            update: { $inc: { stock: stockRestored } }
          }
        });
      }
    }

    sale.estado = 'anulada';
    await sale.save();

    if (sale.cliente && sale.puntosGanados > 0) {
      await Customer.findByIdAndUpdate(sale.cliente, { $inc: { puntos: -sale.puntosGanados } });
    }

    if (stockMovements.length > 0) {
      await StockMovement.insertMany(stockMovements);
    }
    if (productsToUpdate.length > 0) {
      await Product.bulkWrite(productsToUpdate);
    }

    res.json({ message: 'Venta anulada exitosamente', sale });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const setSaleCustomer = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: 'Venta no encontrada' });
    if (sale.estado !== 'completada') {
      return res.status(400).json({ message: 'Solo se puede asignar cliente a ventas completadas' });
    }

    const { cliente } = req.body;
    const clienteId = cliente || null;

    if (sale.cliente && sale.puntosGanados > 0) {
      await Customer.findByIdAndUpdate(sale.cliente, { $inc: { puntos: -sale.puntosGanados } });
    }

    let puntosNuevos = 0;
    if (clienteId) {
      const customer = await Customer.findById(clienteId);
      if (!customer) return res.status(400).json({ message: 'Cliente no encontrado' });
      puntosNuevos = await calcularPuntos(sale.totalFinal);
      if (!customer.esAfiliado) {
        customer.esAfiliado = true;
        customer.fechaAfiliacion = customer.fechaAfiliacion || new Date();
      }
      customer.puntos += puntosNuevos;
      await customer.save();
    }

    sale.cliente = clienteId || undefined;
    sale.puntosGanados = puntosNuevos;
    await sale.save();

    const updated = await Sale.findById(sale._id).populate('cliente', 'nombre telefono');
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Editar una venta completada (items, descuento, pago). Ajusta stock por delta.
// @route   PATCH /api/sales/:id
// @access  Private/Admin
const updateSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) throw new Error('Venta no encontrada');
    if (sale.estado !== 'completada') throw new Error('Solo se pueden editar ventas completadas');

    const { items, descuento, metodoPago, montoPagado, notas, fecha } = req.body;
    if (!items || items.length === 0) throw new Error('No hay productos en la venta editada');

    // Mapa de precios/costos históricos de las líneas ya existentes (para no repreciar la venta)
    const oldByProduct = new Map();
    const oldConsumed = new Map();
    for (const it of sale.items) {
      if (it.promocion) {
        oldByProduct.set(`promo:${String(it.promocion)}`, {
          precioVenta: it.precioVentaHisto,
          precioCompra: it.precioCompraHisto,
        });
        const promotion = await Promotion.findById(it.promocion);
        if (promotion) {
          for (const pi of promotion.items) {
            oldConsumed.set(String(pi.producto), (oldConsumed.get(String(pi.producto)) || 0) + (pi.cantidad * it.cantidad));
          }
        }
      } else {
        oldByProduct.set(String(it.producto), {
          precioVenta: it.precioVentaHisto,
          precioCompra: it.precioCompraHisto,
        });
        oldConsumed.set(String(it.producto), (oldConsumed.get(String(it.producto)) || 0) + it.cantidad);
      }
    }

    const newConsumed = new Map();
    const saleItems = [];
    let subtotal = 0;

    for (const item of items) {
      const cantidad = Number(item.cantidad);
      if (!Number.isFinite(cantidad) || cantidad <= 0) {
        throw new Error(`Cantidad inválida para el producto ${item.producto || item.promocion}`);
      }

      if (item.promocion) {
        const promotion = await Promotion.findById(item.promocion);
        if (!promotion) throw new Error(`Promoción no encontrada: ${item.promocion}`);

        const existed = oldByProduct.has(`promo:${String(item.promocion)}`);
        if (!existed && (!promotion.activo || promotion.estado !== 'activa')) {
          throw new Error(`La promoción "${promotion.nombre}" no está activa`);
        }

        const cantidadPromos = cantidad;
        const old = oldByProduct.get(`promo:${String(item.promocion)}`);
        const promoUnit = old ? old.precioVenta : promotion.precioFinal;
        const promoCost = old ? old.precioCompra : promotion.subtotalCosto;
        const promoSubtotal = promoUnit * cantidadPromos;

        for (const pi of promotion.items) {
          const product = await Product.findById(pi.producto);
          if (!product) continue;
          newConsumed.set(String(product._id), (newConsumed.get(String(product._id)) || 0) + (pi.cantidad * cantidadPromos));
        }

        subtotal += promoSubtotal;
        saleItems.push({
          producto: promotion.productoPrincipal,
          promocion: promotion._id,
          nombre: promotion.nombre,
          cantidad: cantidadPromos,
          precioVentaHisto: promoUnit,
          precioCompraHisto: promoCost,
          subtotal: promoSubtotal,
        });
        continue;
      }

      const product = await Product.findById(item.producto);
      if (!product) throw new Error(`Producto no encontrado: ${item.producto}`);

      const old = oldByProduct.get(String(product._id));

      let unitPrice;
      if (product.esGenerico) {
        unitPrice = old ? old.precioVenta : (item.precioUnitario !== undefined ? item.precioUnitario : product.precioVenta);
      } else {
        unitPrice = old ? old.precioVenta : product.precioVenta;
      }

      const itemSubtotal = unitPrice * cantidad;
      newConsumed.set(String(product._id), (newConsumed.get(String(product._id)) || 0) + cantidad);

      saleItems.push({
        producto: product._id,
        cantidad: cantidad,
        precioVentaHisto: unitPrice,
        precioCompraHisto: old ? old.precioCompra : product.precioCompra,
        subtotal: itemSubtotal,
      });
      subtotal += itemSubtotal;
    }

    const descuentoAplicado = Math.min(Math.max(Number(descuento) || 0, 0), 100);
    const discountAmount = subtotal * (descuentoAplicado / 100);
    const totalFinal = subtotal - discountAmount;
    const vuelto = montoPagado - totalFinal;

    if (vuelto < -0.01) {
      throw new Error('El monto pagado es menor al total de la venta editada');
    }

    // === Ajuste de stock por delta (devuelve lo quitado, descuenta lo agregado) ===
    const productIds = new Set([...oldConsumed.keys(), ...newConsumed.keys()]);
    const stockMovements = [];
    const productsToUpdate = [];

    for (const pid of productIds) {
      const diff = (newConsumed.get(pid) || 0) - (oldConsumed.get(pid) || 0);
      const rounded = Math.round((diff + Number.EPSILON) * 1000) / 1000;
      if (Math.abs(rounded) < 0.0001) continue;

      const product = await Product.findById(pid);
      if (!product) continue;
      const motivo = `Edición de ticket ${sale.numeroTicket}`;

      if (rounded > 0) {
        stockMovements.push({
          producto: product._id,
          tipo: 'venta',
          cantidad: rounded,
          stockAnterior: product.stock,
          stockNuevo: product.stock - rounded,
          motivo,
          usuario: req.user._id
        });
        productsToUpdate.push({ updateOne: { filter: { _id: product._id }, update: { $inc: { stock: -rounded } } } });
      } else {
        const amount = -rounded;
        stockMovements.push({
          producto: product._id,
          tipo: 'ajuste',
          cantidad: amount,
          stockAnterior: product.stock,
          stockNuevo: product.stock + amount,
          motivo,
          usuario: req.user._id
        });
        productsToUpdate.push({ updateOne: { filter: { _id: product._id }, update: { $inc: { stock: amount } } } });
      }
    }

    // === Puntos del cliente (recalcular contra el nuevo total) ===
    const puntosNuevos = sale.cliente ? await calcularPuntos(totalFinal) : 0;
    const puntosDelta = puntosNuevos - (sale.puntosGanados || 0);

    sale.items = saleItems;
    sale.subtotal = subtotal;
    sale.descuento = descuentoAplicado;
    sale.totalFinal = totalFinal;
    sale.metodoPago = metodoPago;
    sale.montoPagado = montoPagado;
    sale.vuelto = vuelto < 0 ? 0 : vuelto;
    sale.puntosGanados = puntosNuevos;
    if (notas !== undefined) sale.notas = notas || undefined;

    const impuestosConfig = await getImpuestosConfig();
    const deducciones = calcularImpuestosPago(metodoPago, totalFinal, impuestosConfig);
    sale.retencionIIBB = deducciones.retencionIIBB;
    sale.comisionMP = deducciones.comisionMP;
    sale.impuestosPago = deducciones.impuestosPago;
    sale.impuestosDetalle = deducciones.impuestosDetalle;
    sale.totalNeto = deducciones.totalNeto;

    if (fecha) {
      const parsed = new Date(fecha);
      if (isNaN(parsed.getTime())) throw new Error('Fecha de venta inválida');
      if (parsed.getTime() > Date.now()) throw new Error('No se puede registrar una venta en el futuro');
      sale.fecha = parsed;
    }

    await sale.save();

    if (sale.cliente && puntosDelta !== 0) {
      await Customer.findByIdAndUpdate(sale.cliente, { $inc: { puntos: puntosDelta } });
    }

    if (stockMovements.length > 0) {
      await StockMovement.insertMany(stockMovements);
    }
    if (productsToUpdate.length > 0) {
      await Product.bulkWrite(productsToUpdate);
    }

    const updated = await Sale.findById(sale._id)
      .populate('empleado', 'nombre')
      .populate('cliente', 'nombre telefono')
      .populate('items.producto', 'nombre sku')
      .populate('items.promocion', 'nombre numero');

    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getSales,
  getSaleById,
  createSale,
  cancelSale,
  setSaleCustomer,
  updateSale
};
