const bcrypt = require("bcryptjs");
const { pool } = require("../../config/database");
const { AppError } = require("../../shared/errores");
const { pedir } = require("../../shared/validaciones");
const { guardarAccion } = require("../../services/auditoria.service");

async function listarUsuarios() {
  const [filas] = await pool.execute(
    `SELECT id_usuario, nombre, correo, id_estado_cuenta, ultimo_acceso, fecha_registro
       FROM usuario WHERE id_rol = 1 ORDER BY fecha_registro DESC LIMIT 300`
  );
  return filas;
}

async function listarDenuncias() {
  const [filas] = await pool.execute(
    `SELECT d.id_denuncia, d.id_reporte, d.id_denunciante, d.id_denunciado,
            d.motivo, d.comentario, d.fecha_denuncia, r.folio,
            quien.nombre AS denunciante, reportado.nombre AS usuario_reportado
       FROM denuncia_usuario d
       JOIN reporte r ON r.id_reporte = d.id_reporte
       JOIN usuario quien ON quien.id_usuario = d.id_denunciante
       JOIN usuario reportado ON reportado.id_usuario = d.id_denunciado
      ORDER BY d.fecha_denuncia DESC LIMIT 300`
  );
  return filas;
}

async function banear(usuarioAdmin, id, motivo, comentario) {
  pedir(["Inactividad de más de 365 días", "Mal uso de la app"].includes(motivo), "Elige un motivo permitido.");
  pedir(!comentario || comentario.length <= 300, "El comentario no puede superar 300 caracteres.");
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const [usuarios] = await conexion.execute(
      `SELECT id_usuario, ultimo_acceso, fecha_registro FROM usuario
        WHERE id_usuario = ? AND id_rol = 1 AND id_estado_cuenta = 1 FOR UPDATE`,
      [id]
    );
    pedir(usuarios[0], "Solo se banean cuentas de Usuario de la app en estado Activa.");
    if (motivo === "Inactividad de más de 365 días") {
      const [dias] = await conexion.execute(
        "SELECT TIMESTAMPDIFF(DAY, COALESCE(ultimo_acceso, fecha_registro), UTC_TIMESTAMP()) AS dias FROM usuario WHERE id_usuario = ?",
        [id]
      );
      pedir(dias[0].dias > 365, "La cuenta todavía no supera 365 días de inactividad.");
    }
    await conexion.execute(
      `INSERT INTO sancion_cuenta (id_usuario, id_admin, tipo, motivo, comentario, dias, fecha_fin, activa)
       VALUES (?, ?, 'Baneo', ?, ?, NULL, NULL, 1)`,
      [id, usuarioAdmin.id, motivo, comentario || null]
    );
    await conexion.execute("UPDATE usuario SET id_estado_cuenta = 4 WHERE id_usuario = ?", [id]);
    await conexion.commit();
    await guardarAccion(usuarioAdmin, "Banear usuario", "usuario", Number(id), motivo);
    return { mensaje: "Cuenta baneada. Sus reportes se conservan." };
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally { conexion.release(); }
}

async function eliminarDatosPersonales(admin, id, contraAdmin) {
  const [admins] = await pool.execute("SELECT contrasena_hash FROM usuario WHERE id_usuario = ? AND id_rol = 3 AND id_estado_cuenta = 1", [admin.id]);
  pedir(admins[0] && await bcrypt.compare(contraAdmin || "", admins[0].contrasena_hash), "La contra del administrador es incorrecta.");
  const [resultado] = await pool.execute(
    `UPDATE usuario SET nombre = NULL, correo = NULL, contrasena_hash = NULL,
            id_estado_cuenta = 5, fecha_eliminacion_programada = NULL
      WHERE id_usuario = ? AND id_rol = 1 AND id_estado_cuenta IN (1, 3, 4)`,
    [id]
  );
  pedir(resultado.affectedRows === 1, "No se encontró una cuenta que se pueda eliminar.");
  await guardarAccion(admin, "Eliminar datos personales", "usuario", Number(id), "Infracción grave de los Términos y Condiciones");
  return { mensaje: "Datos personales eliminados. Los reportes anónimos se conservan." };
}

async function enviarAlerta(admin, id, mensaje) {
  pedir(typeof mensaje === "string" && mensaje.trim().length >= 10 && mensaje.trim().length <= 300, "El mensaje debe tener de 10 a 300 caracteres.");
  const [usuarios] = await pool.execute("SELECT id_usuario FROM usuario WHERE id_usuario = ? AND id_rol = 1 AND id_estado_cuenta = 1", [id]);
  pedir(usuarios.length === 1, "Solo se alertan cuentas Activas.");
  const [resultado] = await pool.execute("INSERT INTO alerta_usuario (id_usuario, id_admin, mensaje) VALUES (?, ?, ?)", [id, admin.id, mensaje.trim()]);
  await guardarAccion(admin, "Alertar usuario", "alerta_usuario", resultado.insertId);
  return { mensaje: "Alerta registrada y lista para notificarse." };
}

module.exports = { listarUsuarios, listarDenuncias, banear, eliminarDatosPersonales, enviarAlerta };
