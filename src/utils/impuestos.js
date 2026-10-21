const { getSystemConfigDoc } = require('./systemConfig');

// Deducciones por defecto (se usan si la config todavía no tiene impuestos cargados).
// Mismos valores que el sistema hardcodeado original.
const IMPUESTOS_DEFECTO = [
  { nombre: 'Retención IIBB', porcentaje: 2.5, metodoPago: 'tarjeta', activo: true },
  { nombre: 'Comisión Mercado Pago', porcentaje: 6.29, metodoPago: 'tarjeta', activo: true },
  { nombre: 'Retención IIBB', porcentaje: 2.5, metodoPago: 'tarjeta_debito', activo: true },
  { nombre: 'Comisión Mercado Pago', porcentaje: 2, metodoPago: 'tarjeta_debito', activo: true },
];

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Devuelve la lista de impuestos activos desde la config (o los de defecto).
const getImpuestosConfig = async () => {
  try {
    const config = await getSystemConfigDoc();
    const lista = (config.impuestos || []).filter((i) => i && i.activo);
    return lista.length > 0 ? lista : IMPUESTOS_DEFECTO;
  } catch {
    return IMPUESTOS_DEFECTO;
  }
};

// Calcula las deducciones de un medio de pago dado un total.
// `impuestos` es la lista de impuestos configurados (activos).
const calcularImpuestosPago = (metodoPago, totalFinal, impuestos = IMPUESTOS_DEFECTO) => {
  const total = Number(totalFinal) || 0;
  const aplicables = (impuestos || []).filter(
    (i) => i && i.activo && i.metodoPago === metodoPago && Number(i.porcentaje) > 0
  );

  if (aplicables.length === 0) {
    return {
      retencionIIBB: 0,
      comisionMP: 0,
      impuestosPago: 0,
      totalNeto: round2(total),
      tieneDeducciones: false,
      impuestosDetalle: [],
    };
  }

  let retencionIIBB = 0;
  let comisionMP = 0;
  let impuestosPago = 0;
  const impuestosDetalle = [];

  for (const imp of aplicables) {
    const monto = round2((total * Number(imp.porcentaje)) / 100);
    impuestosPago += monto;
    impuestosDetalle.push({
      nombre: imp.nombre,
      porcentaje: Number(imp.porcentaje),
      monto,
    });

    // Compatibilidad con el desglose histórico del reporte de impuestos.
    if (/\biibb\b/i.test(imp.nombre)) retencionIIBB += monto;
    else if (/\bmercado\b|\bmp\b/i.test(imp.nombre)) comisionMP += monto;
  }

  return {
    retencionIIBB: round2(retencionIIBB),
    comisionMP: round2(comisionMP),
    impuestosPago: round2(impuestosPago),
    totalNeto: round2(total - impuestosPago),
    tieneDeducciones: true,
    impuestosDetalle,
  };
};

module.exports = { IMPUESTOS_DEFECTO, getImpuestosConfig, calcularImpuestosPago };
