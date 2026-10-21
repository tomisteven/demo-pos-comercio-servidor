const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Promotion = require('../models/Promotion');
const StockMovement = require('../models/StockMovement');
const Customer = require('../models/Customer');
const generateTicketNumber = require('../utils/generateTicketNumber');
const { calcularPuntos } = require('../utils/loyalty');
const { getImpuestosConfig, calcularImpuestosPago } = require('../utils/impuestos');

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * Nucleo de registracion de una venta.
 *
 * Recalcula TODO desde la base de datos (el payload del cliente es solo una
 * guia): precios historicos, costo, descuento, vuelto, deducciones por medio
 * de pago, puntos del cliente y movimientos de stock.
 *
 * @param {object}  opts
 * @param {Array}   opts.items            Lineas: { producto|promocion, cantidad, precioUnitario? }
 * @param {number}  [opts.descuento]      Porcentaje 0-100
 * @param {string}  opts.metodoPago       efectivo | tarjeta | tarjeta_debito | transferencia
 * @param {number}  opts.montoPagado
 * @param {string}  [opts.cliente]        ObjectId de Customer
 * @param {string}  [opts.notas]
 * @param {Date}    [opts.fecha]          Permite cargar ventas retroactivas
 * @param {objectId}opts.usuarioId        Empleado que registra la venta
 * @param {boolean} [opts.usarPreciosFijos]  Usa el precioUnitario del payload (presupuestos)
 * @param {boolean} [opts.permitirPromocionInactiva]  Convierte presupuestos de promos vencidas
 * @returns {Promise<Sale>} Venta creada
 */
const crearVenta = async ({
  items,
  descuento = 0,
  metodoPago,
  montoPagado,
  cliente = null,
  notas,
  fecha,
  usuarioId,
  usarPreciosFijos = false,
  permitirPromocionInactiva = false,
}) => {
  if (!items || items.length === 0) {
    throw new Error('No hay productos en la venta');
  }

  // Fecha de venta retroactiva (ej: cargar ventas de un dia anterior)
  let fechaVenta = null;
  if (fecha) {
    const parsed = new Date(fecha);
    if (isNaN(parsed.getTime())) {
      throw new Error('Fecha de venta inválida');
    }
    if (parsed.getTime() > Date.now()) {
      throw new Error('No se puede registrar una venta en el futuro');
    }
    fechaVenta = parsed;
  }

  let customerDoc = null;
  if (cliente) {
    customerDoc = await Customer.findById(cliente);
    if (!customerDoc) {
      throw new Error('Cliente no encontrado');
    }
  }

  let subtotal = 0;
  const saleItems = [];
  const stockMovements = [];
  const productsToUpdate = [];

  for (const item of items) {
    const cantidad = Number(item.cantidad);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new Error(`Cantidad inválida para el producto ${item.producto || item.promocion}`);
    }

    // === Venta de promoción: descuenta stock de cada producto que la compone ===
    if (item.promocion) {
      const promotion = await Promotion.findById(item.promocion);

      if (!promotion) {
        throw new Error(`Promoción no encontrada: ${item.promocion}`);
      }
      if (!permitirPromocionInactiva && (!promotion.activo || promotion.estado !== 'activa')) {
        throw new Error(`La promoción "${promotion.nombre}" no está activa`);
      }

      const promoUnit = usarPreciosFijos && item.precioUnitario !== undefined
        ? Number(item.precioUnitario)
        : promotion.precioFinal;
      const promoSubtotal = promoUnit * cantidad;

      for (const pi of promotion.items) {
        const product = await Product.findById(pi.producto);

        if (!product) {
          throw new Error(`Producto de la promoción no encontrado: ${pi.producto}`);
        }

        const stockDeduction = pi.cantidad * cantidad;
        const availableStock = product.stock || 0;

        if (availableStock < stockDeduction - 0.0001) {
          throw new Error(`Stock insuficiente para el producto: ${product.nombre}. Solicitado: ${stockDeduction.toFixed(2)}, Disponible: ${availableStock.toFixed(2)}`);
        }

        stockMovements.push({
          producto: product._id,
          tipo: 'venta',
          cantidad: stockDeduction,
          stockAnterior: product.stock,
          stockNuevo: product.stock - stockDeduction,
          motivo: 'Venta de promoción',
          usuario: usuarioId
        });

        productsToUpdate.push({
          updateOne: {
            filter: { _id: product._id },
            update: { $inc: { stock: -stockDeduction } }
          }
        });
      }

      subtotal += promoSubtotal;

      saleItems.push({
        producto: promotion.productoPrincipal,
        promocion: promotion._id,
        nombre: promotion.nombre,
        cantidad,
        precioVentaHisto: promoUnit,
        precioCompraHisto: promotion.subtotalCosto,
        subtotal: promoSubtotal
      });

      continue;
    }

    const product = await Product.findById(item.producto);

    if (!product) {
      throw new Error(`Producto no encontrado: ${item.producto}`);
    }

    // === Producto genérico: el precio se cobra en el momento de la venta ===
    let precioVentaHisto;
    if (product.esGenerico) {
      if (item.precioUnitario === undefined || item.precioUnitario === null || item.precioUnitario < 0) {
        throw new Error(`Debe proporcionar un precio para el producto genérico: ${product.nombre}`);
      }
      precioVentaHisto = Number(item.precioUnitario);
    } else if (usarPreciosFijos && item.precioUnitario !== undefined && item.precioUnitario !== null) {
      // Presupuesto: se respeta el precio cotizado, no el de catálogo actual
      precioVentaHisto = Number(item.precioUnitario);
    } else {
      precioVentaHisto = product.precioVenta;
    }

    const itemSubtotal = precioVentaHisto * cantidad;

    // Se permite vender igual si el registro de stock dice 0 pero hay stock físico.
    // El stock se descuenta igual y puede quedar negativo hasta reposición.

    subtotal += itemSubtotal;

    saleItems.push({
      producto: product._id,
      cantidad,
      precioVentaHisto,
      precioCompraHisto: product.precioCompra,
      subtotal: itemSubtotal
    });

    stockMovements.push({
      producto: product._id,
      tipo: 'venta',
      cantidad,
      stockAnterior: product.stock,
      stockNuevo: product.stock - cantidad,
      motivo: 'Venta completada',
      usuario: usuarioId
    });

    productsToUpdate.push({
      updateOne: {
        filter: { _id: product._id },
        update: { $inc: { stock: -cantidad } }
      }
    });
  }

  const descuentoAplicado = Math.min(Math.max(Number(descuento) || 0, 0), 100);
  const discountAmount = subtotal * (descuentoAplicado / 100);
  const totalFinal = round2(subtotal - discountAmount);
  const vuelto = Number(montoPagado) - totalFinal;

  if (vuelto < -0.01) {
    throw new Error('El monto pagado es menor al total de la venta');
  }

  const numeroTicket = await generateTicketNumber();
  const puntosGanados = customerDoc ? await calcularPuntos(totalFinal) : 0;
  const impuestosConfig = await getImpuestosConfig();
  const deducciones = calcularImpuestosPago(metodoPago, totalFinal, impuestosConfig);

  const sale = new Sale({
    numeroTicket,
    fecha: fechaVenta || undefined,
    empleado: usuarioId,
    cliente: customerDoc?._id,
    puntosGanados,
    items: saleItems,
    subtotal: round2(subtotal),
    descuento: descuentoAplicado,
    totalFinal,
    metodoPago,
    montoPagado,
    vuelto: vuelto < 0 ? 0 : round2(vuelto),
    retencionIIBB: deducciones.retencionIIBB,
    comisionMP: deducciones.comisionMP,
    impuestosPago: deducciones.impuestosPago,
    impuestosDetalle: deducciones.impuestosDetalle,
    totalNeto: deducciones.totalNeto,
    estado: 'completada',
    notas: notas || undefined
  });

  const createdSale = await sale.save();

  if (customerDoc) {
    if (!customerDoc.esAfiliado) {
      customerDoc.esAfiliado = true;
      customerDoc.fechaAfiliacion = customerDoc.fechaAfiliacion || new Date();
    }
    customerDoc.puntos += puntosGanados;
    await customerDoc.save();
  }

  // Modificar los motivos de stock para incluir el nro de ticket
  stockMovements.forEach(sm => {
    sm.motivo = `Venta ${createdSale.numeroTicket}`;
  });

  if (stockMovements.length > 0) {
    await StockMovement.insertMany(stockMovements);
  }
  if (productsToUpdate.length > 0) {
    await Product.bulkWrite(productsToUpdate);
  }

  return createdSale;
};

module.exports = { crearVenta };
