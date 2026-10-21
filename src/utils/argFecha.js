// Utilidades de fecha en zona horaria de Argentina.
// El servidor puede correr en UTC, así que "hoy" se define por Argentina (UTC-3, sin horario de verano).
const ARG_TZ = 'America/Argentina/Buenos_Aires';
const OFFSET_UTC_ARG = 3; // Argentina = UTC-3

// 'YYYY-MM-DD' en zona horaria de Argentina
const argFechaCorta = (date = new Date()) => date.toLocaleDateString('en-CA', { timeZone: ARG_TZ });

// Primer milisegundo del día (00:00:00.000) en Argentina
const argInicioDelDia = (date = new Date()) => {
  const [y, m, d] = argFechaCorta(date).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, OFFSET_UTC_ARG, 0, 0, 0));
};

// Último milisegundo del día (23:59:59.999) en Argentina
const argFinDelDia = (date = new Date()) =>
  new Date(argInicioDelDia(date).getTime() + 24 * 60 * 60 * 1000 - 1);

// Convierte un 'YYYY-MM-DD' recibido en query/body al inicio del día en Argentina
const argFechaAInicio = (iso) => {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, OFFSET_UTC_ARG, 0, 0, 0));
};

// Día de la semana (0=domingo..6=sábado) según Argentina
const argDiaDeLaSemana = (date = new Date()) => new Date(argInicioDelDia(date).getTime()).getUTCDay();

// Hora (0..23) según Argentina
const argHora = (date = new Date()) => {
  const inicio = argInicioDelDia(date);
  return Math.floor((date.getTime() - inicio.getTime()) / 3600000);
};

module.exports = {
  ARG_TZ,
  argFechaCorta,
  argInicioDelDia,
  argFinDelDia,
  argFechaAInicio,
  argDiaDeLaSemana,
  argHora,
};
