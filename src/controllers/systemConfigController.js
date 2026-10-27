const { getSystemConfigDoc } = require('../utils/systemConfig');

// Campos de texto del footer del catálogo (opcionales: pueden quedar vacíos para ocultar)
const FOOTER_KEYS = [
  'footerUbicacion', 'footerTelefono', 'footerEmail', 'footerHorario',
  'footerInstagram', 'footerFacebook', 'footerWhatsapp',
  'footerPedidosTexto', 'footerCopyright', 'footerHechoCon',
];

const serialize = (cfg) => ({
  metaFacturacionDiaria: cfg.metaFacturacionDiaria,
  metaGananciaDiaria: cfg.metaGananciaDiaria,
  metaFacturacionMensual: cfg.metaFacturacionMensual,
  margenGananciaDefecto: cfg.margenGananciaDefecto,
  pesosPorPunto: cfg.pesosPorPunto,
  nombreTienda: cfg.nombreTienda,
  catalogoTitulo: cfg.catalogoTitulo,
  catalogoSubtitulo: cfg.catalogoSubtitulo,
  catalogoTextoEnvio: cfg.catalogoTextoEnvio,
  catalogoTextoPago: cfg.catalogoTextoPago,
  catalogoColorAcento: cfg.catalogoColorAcento,
  catalogoColorFondo: cfg.catalogoColorFondo,
  catalogoColorSuperficie: cfg.catalogoColorSuperficie,
  catalogoColorTexto: cfg.catalogoColorTexto,
  catalogoColorProducto: cfg.catalogoColorProducto,
  catalogoColorSubtitulo: cfg.catalogoColorSubtitulo,
  catalogoColorDescripcion: cfg.catalogoColorDescripcion,
  catalogoColorCategoria: cfg.catalogoColorCategoria,
  catalogoColorPrecio: cfg.catalogoColorPrecio,
  ...FOOTER_KEYS.reduce((acc, k) => { acc[k] = cfg[k]; return acc; }, {}),
  impuestos: (cfg.impuestos || []).map((i) => ({
    _id: i._id,
    nombre: i.nombre,
    porcentaje: i.porcentaje,
    metodoPago: i.metodoPago,
    activo: i.activo,
  })),
});

const serializePublico = (cfg) => ({
  nombreTienda: cfg.nombreTienda,
  catalogoTitulo: cfg.catalogoTitulo,
  catalogoSubtitulo: cfg.catalogoSubtitulo,
  catalogoTextoEnvio: cfg.catalogoTextoEnvio,
  catalogoTextoPago: cfg.catalogoTextoPago,
  catalogoColorAcento: cfg.catalogoColorAcento,
  catalogoColorFondo: cfg.catalogoColorFondo,
  catalogoColorSuperficie: cfg.catalogoColorSuperficie,
  catalogoColorTexto: cfg.catalogoColorTexto,
  catalogoColorProducto: cfg.catalogoColorProducto,
  catalogoColorSubtitulo: cfg.catalogoColorSubtitulo,
  catalogoColorDescripcion: cfg.catalogoColorDescripcion,
  catalogoColorCategoria: cfg.catalogoColorCategoria,
  catalogoColorPrecio: cfg.catalogoColorPrecio,
  ...FOOTER_KEYS.reduce((acc, k) => { acc[k] = cfg[k]; return acc; }, {}),
});

const getConfig = async (req, res) => {
  try {
    const config = await getSystemConfigDoc();
    res.json({ config: serialize(config) });
  } catch (error) {
    console.error('Error getSystemConfig:', error);
    res.status(500).json({ message: 'Error al obtener la configuración' });
  }
};

// Config pública (sin auth) para el catálogo: nombre de tienda y textos informativos.
const getPublicConfig = async (req, res) => {
  try {
    const config = await getSystemConfigDoc();
    res.json(serializePublico(config));
  } catch (error) {
    console.error('Error getPublicConfig:', error);
    res.status(500).json({ message: 'Error al obtener la configuración' });
  }
};

const NUMERICOS = ['metaFacturacionDiaria', 'metaGananciaDiaria', 'metaFacturacionMensual', 'margenGananciaDefecto', 'pesosPorPunto'];
const TEXTO = ['nombreTienda', 'catalogoTitulo', 'catalogoSubtitulo', 'catalogoTextoEnvio', 'catalogoTextoPago'];
const COLORES = [
  'catalogoColorAcento', 'catalogoColorFondo', 'catalogoColorSuperficie',
  'catalogoColorTexto', 'catalogoColorProducto', 'catalogoColorSubtitulo',
  'catalogoColorDescripcion', 'catalogoColorCategoria', 'catalogoColorPrecio',
];
const METODOS_PAGO = ['efectivo', 'tarjeta', 'tarjeta_debito', 'transferencia'];

const updateConfig = async (req, res) => {
  try {
    const config = await getSystemConfigDoc();
    let changed = false;

    for (const key of NUMERICOS) {
      if (req.body[key] === undefined) continue;
      const val = Number(req.body[key]);
      if (isNaN(val) || val < 0) {
        return res.status(400).json({ message: `${key} debe ser un número válido y mayor o igual a 0` });
      }
      config[key] = val;
      changed = true;
    }

    for (const key of TEXTO) {
      if (req.body[key] === undefined) continue;
      const val = String(req.body[key]).trim();
      if (!val) {
        return res.status(400).json({ message: `${key} no puede estar vacío` });
      }
      if (val.length > 300) {
        return res.status(400).json({ message: `${key} es demasiado largo (máx. 300 caracteres)` });
      }
      config[key] = val;
      changed = true;
    }

    // Colores del catálogo: formato hexadecimal #RRGGBB
    for (const key of COLORES) {
      if (req.body[key] === undefined) continue;
      const val = String(req.body[key]).trim();
      if (!/^#[0-9a-fA-F]{6}$/.test(val)) {
        return res.status(400).json({ message: `${key} debe ser un color hexadecimal (#RRGGBB)` });
      }
      config[key] = val.toLowerCase();
      changed = true;
    }

    // Campos del footer: opcionales (pueden quedar vacíos para ocultar), máx. 300
    for (const key of FOOTER_KEYS) {
      if (req.body[key] === undefined) continue;
      const val = String(req.body[key]).trim();
      if (val.length > 300) {
        return res.status(400).json({ message: `${key} es demasiado largo (máx. 300 caracteres)` });
      }
      config[key] = val;
      changed = true;
    }

    if (req.body.impuestos !== undefined) {
      if (!Array.isArray(req.body.impuestos)) {
        return res.status(400).json({ message: 'impuestos debe ser una lista' });
      }
      const limpios = [];
      for (const imp of req.body.impuestos) {
        const nombre = String(imp?.nombre || '').trim();
        const porcentaje = Number(imp?.porcentaje);
        const metodoPago = imp?.metodoPago;
        if (!nombre) return res.status(400).json({ message: 'Cada impuesto necesita un nombre' });
        if (isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) {
          return res.status(400).json({ message: `El porcentaje de "${nombre}" debe estar entre 0 y 100` });
        }
        if (!METODOS_PAGO.includes(metodoPago)) {
          return res.status(400).json({ message: `Medio de pago inválido en "${nombre}"` });
        }
        limpios.push({
          nombre,
          porcentaje,
          metodoPago,
          activo: imp?.activo !== false,
        });
      }
      config.impuestos = limpios;
      changed = true;
    }

    if (!changed) {
      return res.status(400).json({ message: 'No hay campos para actualizar' });
    }

    await config.save();
    res.json({ message: 'Configuración actualizada', config: serialize(config) });
  } catch (error) {
    console.error('Error updateSystemConfig:', error);
    res.status(500).json({ message: 'Error al actualizar la configuración' });
  }
};

module.exports = { getConfig, getPublicConfig, updateConfig };
