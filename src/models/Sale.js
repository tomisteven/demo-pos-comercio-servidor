const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema(
  {
    numeroTicket: {
      type: String,
      required: true,
      unique: true,
    },
    fecha: {
      type: Date,
      default: Date.now,
    },
    empleado: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    cliente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    puntosGanados: {
      type: Number,
      default: 0,
    },
    items: [
      {
        producto: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
          required: true,
        },
        promocion: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Promotion',
        },
        nombre: { // Nombre de la línea en el ticket (ej: nombre de la promoción)
          type: String,
        },
        cantidad: {
          type: Number,
          required: true,
        },
        precioVentaHisto: { // Guardamos el precio al momento de la venta
          type: Number,
          required: true,
        },
        precioCompraHisto: { // Coste en ese momento
          type: Number,
          required: true,
        },
        subtotal: {
          type: Number,
          required: true,
        },
      },
    ],
    subtotal: {
      type: Number,
      required: true,
    },
    descuento: {
      type: Number,
      default: 0, // Porcentaje 0 a 100
    },
    totalFinal: {
      type: Number,
      required: true,
    },
    metodoPago: {
      type: String,
      enum: ['efectivo', 'tarjeta', 'tarjeta_debito', 'transferencia'],
      required: true,
    },
    // Deducciones del medio de pago que absorbe el comercio (no cambian el precio al cliente)
    retencionIIBB: {
      type: Number,
      default: 0,
    },
    comisionMP: {
      type: Number,
      default: 0,
    },
    impuestosPago: {
      type: Number,
      default: 0,
    },
    // Desglose de cada impuesto aplicado (nombre, % y monto) para reportes
    impuestosDetalle: {
      type: [
        new mongoose.Schema({
          nombre: { type: String },
          porcentaje: { type: Number, default: 0 },
          monto: { type: Number, default: 0 },
        }, { _id: false }),
      ],
      default: [],
    },
    totalNeto: {
      type: Number,
      default: 0,
    },
    montoPagado: {
      type: Number,
      required: true,
    },
    vuelto: {
      type: Number,
      required: true,
    },
    estado: {
      type: String,
      enum: ['completada', 'anulada'],
      default: 'completada',
    },
    notas: {
      type: String,
    },
  },
  { timestamps: true }
);

saleSchema.index({ fecha: -1 });
saleSchema.index({ cliente: 1, fecha: -1 });

const Sale = mongoose.model('Sale', saleSchema);
module.exports = Sale;
