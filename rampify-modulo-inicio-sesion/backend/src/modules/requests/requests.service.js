const { pool } = require("../../config/database");
const { AppError } = require("../../shared/errores");
const { pedir } = require("../../shared/validaciones");
const { guardarAccion } = require("../../services/auditoria.service");

async function crearSolicitud(usuario, idReporte, motivo) {
  pedir(Number.isInteger(Number(idReporte)) && Number(idReporte) > 0, "Selecciona un reporte válido.");
  pedir(typeof motivo === "string" && motivo.trim().length >= 10 && motivo.trim().length <= 300, "El motivo debe tener de 10 a 300 caracteres.");
  const [reportes] = await pool.execute("SELECT id_usuario, eliminado FROM reporte WHERE id_reporte = ?", [idReporte]);
  pedir(reportes[0] && reportes[0].eliminado === 0, "No se encontró el reporte.");
  pedir(reportes[0].id_usuario === usuario.id, "Solo puedes solicitar la eliminación de tus reportes.");
  const [existentes] = await pool.execute("SELECT id_solicitud FROM solicitud_eliminacion_reporte WHERE id_reporte = ? AND estado = 'Pendiente'", [idReporte]);
  pedir(existentes.length === 0, "Ya existe una solicitud pendiente para este reporte.");
  const [resultado] = await pool.execute(
    "INSERT INTO solicitud_eliminacion_reporte (id_reporte, id_usuario, motivo) VALUES (?, ?, ?)",
    [idReporte, usuario.id, motivo.trim()]
  );
  await guardarAccion(usuario, "Solicitar eliminación de reporte", "solicitud_eliminacion_reporte", resultado.insertId);
  return { id: resultado.insertId, estado: "Pendiente" };
}

async function listarSolicitudes() {
  const [filas] = await pool.execute(
    `SELECT s.id_solicitud, s.id_reporte, s.motivo, s.estado, s.motivo_rechazo,
            s.fecha_solicitud, r.folio, u.nombre AS usuario
       FROM solicitud_eliminacion_reporte s
       JOIN reporte r ON r.id_reporte = s.id_reporte
       JOIN usuario u ON u.id_usuario = s.id_usuario
      ORDER BY s.fecha_solicitud DESC LIMIT 200`
  );
  return filas;
}

async function resolverSolicitud(admin, id, estado, motivoRechazo) {
  pedir(["Aprobada", "Rechazada"].includes(estado), "La decisión debe ser Aprobada o Rechazada.");
  if (estado === "Rechazada") pedir(typeof motivoRechazo === "string" && motivoRechazo.trim().length >= 10 && motivoRechazo.trim().length <= 200, "El motivo de rechazo debe tener de 10 a 200 caracteres.");

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const [solicitudes] = await conexion.execute(
      "SELECT id_reporte, estado FROM solicitud_eliminacion_reporte WHERE id_solicitud = ? FOR UPDATE",
      [id]
    );
    pedir(solicitudes[0] && solicitudes[0].estado === "Pendiente", "La solicitud ya fue atendida o no existe.");
    const solicitud = solicitudes[0];

    if (estado === "Aprobada") {
      const [criterio] = await conexion.execute("SELECT id_criterio FROM criterio_invalido WHERE nombre = 'Solicitud del autor'");
      const [reporte] = await conexion.execute(
        `UPDATE reporte SET eliminado = 1, fecha_eliminacion = UTC_TIMESTAMP(), id_criterio_eliminacion = ?
          WHERE id_reporte = ? AND eliminado = 0`,
        [criterio[0].id_criterio, solicitud.id_reporte]
      );
      pedir(reporte.affectedRows === 1, "El reporte ya fue eliminado.");
    }

    await conexion.execute(
      `UPDATE solicitud_eliminacion_reporte
          SET estado = ?, motivo_rechazo = ?, id_admin = ?, fecha_resolucion = UTC_TIMESTAMP()
        WHERE id_solicitud = ?`,
      [estado, estado === "Rechazada" ? motivoRechazo.trim() : null, admin.id, id]
    );
    await conexion.commit();
    await guardarAccion(admin, "Resolver solicitud de eliminación", "solicitud_eliminacion_reporte", Number(id), estado);
    return { mensaje: "Solicitud " + estado.toLowerCase() + "." };
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally { conexion.release(); }
}

module.exports = { crearSolicitud, listarSolicitudes, resolverSolicitud };
