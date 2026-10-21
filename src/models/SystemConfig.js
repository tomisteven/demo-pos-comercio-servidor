const mongoose = require('mongoose');

// Impuesto / deducción que el comercio absorbe según el medio de pago.
// El precio para el cliente NO cambia: sale de la ganancia.
const impuestoSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  porcentaje: { type: Number, required: true, min: 0, max: 100 },
  metodoPago: {
    type: String,
    enum: ['efectivo', 'tarjeta', 'tarjeta_debito', 'transferencia'],
    required: true,
  },
  activo: { type: Boolean, default: true },
}, { _id: true });

const systemConfigSchema = new mongoose.Schema({
  singleton: { type: String, default: 'config', unique: true },

  // Metas y parámetros de negocio
  metaFacturacionDiaria: { type: Number, default: 40000, min: 0 },
  metaGananciaDiaria: { type: Number, default: 30000, min: 0 },
  metaFacturacionMensual: { type: Number, default: 4000000, min: 0 },
  margenGananciaDefecto: { type: Number, default: 30, min: 0 },
  pesosPorPunto: { type: Number, default: 200, min: 1 },

  // Datos de la tienda
  nombreTienda: { type: String, default: 'Poroto MiniMarket', trim: true },

  // Textos informativos del catálogo público
  catalogoTitulo: { type: String, default: 'Poroto MiniMarket', trim: true },
  catalogoSubtitulo: {
    type: String,
    default: 'Alimentos, bebidas, limpieza y mas. Elegi online, retira en el local o coordina el envio.',
    trim: true,
  },
  catalogoTextoEnvio: { type: String, default: 'Coordinamos el envio por WhatsApp', trim: true },
  catalogoTextoPago: { type: String, default: 'Efectivo, transferencia y tarjetas', trim: true },

  // Footer del catálogo público (datos de contacto, redes y textos)
  footerUbicacion: { type: String, default: 'Av. Siempre Viva 742, Buenos Aires, Argentina', trim: true },
  footerTelefono: { type: String, default: '+54 11 5555-1234', trim: true },
  footerEmail: { type: String, default: 'info@porotomimarket.com', trim: true },
  footerHorario: { type: String, default: 'Lunes a Sabado · 9:00 a 20:00 hs', trim: true },
  footerInstagram: { type: String, default: 'https://instagram.com/porotomimarket', trim: true },
  footerFacebook: { type: String, default: 'https://facebook.com/porotomimarket', trim: true },
  footerWhatsapp: { type: String, default: '5491162589131', trim: true },
  footerPedidosTexto: {
    type: String,
    default: 'Arma tu pedido en el catalogo y envialo por WhatsApp. Te confirmamos disponibilidad y formas de pago.',
    trim: true,
  },
  footerCopyright: { type: String, default: 'Precios sujetos a cambios sin previo aviso', trim: true },
  footerHechoCon: { type: String, default: 'Hecho con ♥ para tu barrio', trim: true },

  // Deducciones por medio de pago (configurables desde Configuración)
  impuestos: { type: [impuestoSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('SystemConfig', systemConfigSchema);
