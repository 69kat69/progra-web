const { pool } = require("../../config/database");
const { pedir } = require("../../shared/validaciones");

const formatos = ["Pendiente", "En proceso", "Solucionado", "Rechazado"];

function revisarFecha(fecha) {
  return !fecha || (typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fecha) && !Number.isNaN(Date.parse(fecha)));
}

async function consultar(filtros) {
  const hoy = new Date();
  const hasta = filtros.hasta || hoy.toISOString().slice(0, 10);
  const fechaInicial = new Date(hasta + "T00:00:00Z");
  fechaInicial.setUTCDate(fechaInicial.getUTCDate() - 29);
  const desde = filtros.desde || fechaInicial.toISOString().slice(0, 10);

  pedir(revisarFecha(desde) && revisarFecha(hasta), "Las fechas deben usar el formato AAAA-MM-DD.");
  pedir(hasta >= desde, "La fecha final es anterior a la fecha inicial.");
  if (filtros.estado) pedir(formatos.includes(filtros.estado), "El estado no es válido.");
  if (filtros.tipo) pedir(Number.isInteger(Number(filtros.tipo)) && Number(filtros.tipo) > 0, "El tipo de problema no es válido.");

  const condiciones = ["r.eliminado = 0", "r.fecha_creacion >= ?", "r.fecha_creacion < DATE_ADD(?, INTERVAL 1 DAY)"];
  const valores = [desde + " 00:00:00", hasta];
  if (filtros.estado) { condiciones.push("er.nombre = ?"); valores.push(filtros.estado); }
  if (filtros.tipo) { condiciones.push("tp.id_tipo_problema = ?"); valores.push(Number(filtros.tipo)); }
  const where = condiciones.join(" AND ");

  const [totales] = await pool.execute(
    `SELECT COUNT(*) AS reportes,
            SUM(er.nombre IN ('Pendiente','En proceso')) AS activos
       FROM reporte r JOIN estado_reporte er ON er.id_estado_reporte = r.id_estado_reporte
       JOIN tipo_problema tp ON tp.id_tipo_problema = r.id_tipo_problema
      WHERE ${where}`,
    valores
  );
  const [porEstado] = await pool.execute(
    `SELECT er.nombre AS estado, COUNT(*) AS total
       FROM reporte r JOIN estado_reporte er ON er.id_estado_reporte = r.id_estado_reporte
       JOIN tipo_problema tp ON tp.id_tipo_problema = r.id_tipo_problema
      WHERE ${where} GROUP BY er.id_estado_reporte, er.nombre ORDER BY er.id_estado_reporte`,
    valores
  );
  const [porTipo] = await pool.execute(
    `SELECT tp.id_tipo_problema, tp.nombre AS tipo, COUNT(*) AS total
       FROM reporte r JOIN estado_reporte er ON er.id_estado_reporte = r.id_estado_reporte
       JOIN tipo_problema tp ON tp.id_tipo_problema = r.id_tipo_problema
      WHERE ${where} GROUP BY tp.id_tipo_problema, tp.nombre ORDER BY total DESC`,
    valores
  );
  const [porDia] = await pool.execute(
    `SELECT DATE(r.fecha_creacion) AS fecha, COUNT(*) AS total
       FROM reporte r JOIN estado_reporte er ON er.id_estado_reporte = r.id_estado_reporte
       JOIN tipo_problema tp ON tp.id_tipo_problema = r.id_tipo_problema
      WHERE ${where} GROUP BY DATE(r.fecha_creacion) ORDER BY fecha`,
    valores
  );
  const [zonas] = await pool.execute(
    `SELECT ROUND(r.latitud, 3) AS latitud, ROUND(r.longitud, 3) AS longitud, COUNT(*) AS total
       FROM reporte r JOIN estado_reporte er ON er.id_estado_reporte = r.id_estado_reporte
       JOIN tipo_problema tp ON tp.id_tipo_problema = r.id_tipo_problema
      WHERE ${where} GROUP BY ROUND(r.latitud, 3), ROUND(r.longitud, 3)
      ORDER BY total DESC LIMIT 100`,
    valores
  );
  const [usuarios] = await pool.execute("SELECT COUNT(*) AS total FROM usuario WHERE id_estado_cuenta = 1");

  return {
    rango: { desde, hasta },
    reportes: Number(totales[0].reportes || 0),
    reportesActivos: Number(totales[0].activos || 0),
    usuariosActivos: Number(usuarios[0].total || 0),
    porEstado,
    porTipo,
    porDia,
    zonas
  };
}

module.exports = { consultar };
