const bcrypt = require("bcryptjs");
const { randomInt } = require("node:crypto");
const { pool } = require("../../config/database");
const { AppError } = require("../../shared/errores");
const { validarCorreo, validarNombre, validarContra, pedir } = require("../../shared/validaciones");
const { enviarCorreo } = require("../../services/correo.service");
const { guardarAccion } = require("../../services/auditoria.service");

async function verPerfil(id) {
  const [usuarios] = await pool.execute(
    `SELECT u.id_usuario, u.nombre, u.correo, u.fecha_registro,
            u.fecha_eliminacion_programada, r.nombre AS rol, ec.nombre AS estado
       FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
       JOIN estado_cuenta ec ON ec.id_estado_cuenta = u.id_estado_cuenta
      WHERE u.id_usuario = ?`,
    [id]
  );
  pedir(usuarios.length === 1, "No se encontró la cuenta.");
  const [preferencias] = await pool.execute("SELECT notif_estado_reporte, notif_eliminacion_reporte FROM preferencia_notificacion WHERE id_usuario = ?", [id]);
  return { ...usuarios[0], notificaciones: preferencias[0] || { notif_estado_reporte: 1, notif_eliminacion_reporte: 1 } };
}

async function actualizarNombre(usuario, nombre) {
  pedir(validarNombre(nombre, 64), "El nombre debe tener de 2 a 64 letras y espacios.");
  await pool.execute("UPDATE usuario SET nombre = ? WHERE id_usuario = ? AND id_estado_cuenta = 1", [nombre.trim(), usuario.id]);
  await guardarAccion(usuario, "Actualizar nombre", "usuario", usuario.id);
  return { mensaje: "Nombre actualizado." };
}

async function solicitarCambioCorreo(usuario, correo) {
  pedir(validarCorreo(correo), "Escribe un correo válido.");
  const destino = correo.trim().toLowerCase();
  const [existe] = await pool.execute("SELECT id_usuario FROM usuario WHERE correo = ? AND id_usuario <> ?", [destino, usuario.id]);
  pedir(existe.length === 0, "El correo ya se encuentra registrado.");
  const [previos] = await pool.execute(
    `SELECT COUNT(*) AS total FROM codigo_verificacion
      WHERE id_usuario = ? AND tipo = 'Cambio de correo'
        AND fecha_creacion >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 60 MINUTE)`,
    [usuario.id]
  );
  pedir(previos[0].total < 4, "Límite de reenvíos alcanzado. Intenta de nuevo en una hora.");

  const codigo = String(randomInt(100000, 1000000));
  const hash = await bcrypt.hash(codigo, 10);
  await pool.execute("UPDATE codigo_verificacion SET usado = 1 WHERE id_usuario = ? AND tipo = 'Cambio de correo' AND usado = 0", [usuario.id]);
  await pool.execute(
    `INSERT INTO codigo_verificacion (id_usuario, tipo, correo_destino, codigo_hash, fecha_expiracion)
     VALUES (?, 'Cambio de correo', ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 MINUTE))`,
    [usuario.id, destino, hash]
  );
  try {
    await enviarCorreo(destino, "Confirma tu nuevo correo de Rampify", "Tu código es " + codigo + ". Vence en 10 minutos.");
  } catch (error) {
    await pool.execute("UPDATE codigo_verificacion SET usado = 1 WHERE id_usuario = ? AND tipo = 'Cambio de correo' AND usado = 0", [usuario.id]);
    throw error;
  }
  return { mensaje: "Si el correo puede usarse, recibirá un código de verificación." };
}

async function confirmarCambioCorreo(usuario, correo, codigo) {
  pedir(validarCorreo(correo) && /^\d{6}$/.test(codigo), "Escribe un correo válido y el código de 6 dígitos.");
  const [filas] = await pool.execute(
    `SELECT id_codigo, correo_destino, codigo_hash, intentos_incorrectos, fecha_expiracion
       FROM codigo_verificacion
      WHERE id_usuario = ? AND tipo = 'Cambio de correo' AND usado = 0
      ORDER BY fecha_creacion DESC LIMIT 1`,
    [usuario.id]
  );
  const registro = filas[0];
  const vence = registro ? new Date(registro.fecha_expiracion + "Z").getTime() : 0;
  const valido = registro && registro.correo_destino === correo.trim().toLowerCase() && vence > Date.now() && registro.intentos_incorrectos < 5 && await bcrypt.compare(codigo, registro.codigo_hash);
  if (!valido) {
    if (registro) {
      const intentos = Number(registro.intentos_incorrectos) + 1;
      await pool.execute("UPDATE codigo_verificacion SET intentos_incorrectos = ?, usado = ? WHERE id_codigo = ?", [intentos, intentos >= 5 || vence <= Date.now() ? 1 : 0, registro.id_codigo]);
      if (intentos >= 5) throw new AppError(400, "Código bloqueado. Solicita uno nuevo.");
    }
    throw new AppError(400, "Código incorrecto o vencido.");
  }

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const [actual] = await conexion.execute("SELECT usado FROM codigo_verificacion WHERE id_codigo = ? FOR UPDATE", [registro.id_codigo]);
    pedir(actual[0] && actual[0].usado === 0, "El código ya se usó.");
    await conexion.execute("UPDATE usuario SET correo = ? WHERE id_usuario = ?", [registro.correo_destino, usuario.id]);
    await conexion.execute("UPDATE codigo_verificacion SET usado = 1 WHERE id_codigo = ?", [registro.id_codigo]);
    await conexion.commit();
    await guardarAccion(usuario, "Actualizar correo", "usuario", usuario.id);
    return { mensaje: "Correo actualizado." };
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally { conexion.release(); }
}

async function actualizarContra(usuario, contraActual, contraNueva) {
  pedir(validarContra(contraNueva), "La contra debe tener de 8 a 64 caracteres, una mayúscula, una minúscula y un número.");
  const [filas] = await pool.execute("SELECT contrasena_hash FROM usuario WHERE id_usuario = ?", [usuario.id]);
  pedir(filas[0] && await bcrypt.compare(contraActual || "", filas[0].contrasena_hash), "La contra actual es incorrecta.");
  pedir(contraActual !== contraNueva, "La contra nueva debe ser distinta a la actual.");
  const hash = await bcrypt.hash(contraNueva, 12);
  await pool.execute("UPDATE usuario SET contrasena_hash = ? WHERE id_usuario = ?", [hash, usuario.id]);
  await guardarAccion(usuario, "Actualizar contra", "usuario", usuario.id);
  return { mensaje: "Contra actualizada." };
}

async function guardarNotificaciones(usuario, estadoReporte, eliminacionReporte) {
  pedir(typeof estadoReporte === "boolean" && typeof eliminacionReporte === "boolean", "Las preferencias deben ser verdaderas o falsas.");
  await pool.execute(
    `INSERT INTO preferencia_notificacion (id_usuario, notif_estado_reporte, notif_eliminacion_reporte)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE notif_estado_reporte = VALUES(notif_estado_reporte), notif_eliminacion_reporte = VALUES(notif_eliminacion_reporte)`,
    [usuario.id, estadoReporte, eliminacionReporte]
  );
  return { mensaje: "Preferencias guardadas." };
}

async function programarEliminacion(usuario, contra) {
  const [filas] = await pool.execute("SELECT contrasena_hash FROM usuario WHERE id_usuario = ? AND id_estado_cuenta = 1", [usuario.id]);
  pedir(filas[0] && await bcrypt.compare(contra || "", filas[0].contrasena_hash), "La contra es incorrecta.");
  await pool.execute("UPDATE usuario SET fecha_eliminacion_programada = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 DAY) WHERE id_usuario = ?", [usuario.id]);
  await guardarAccion(usuario, "Programar eliminación de cuenta", "usuario", usuario.id);
  return { mensaje: "La eliminación quedó programada para dentro de 30 días." };
}

async function cancelarEliminacion(usuario) {
  const [resultado] = await pool.execute("UPDATE usuario SET fecha_eliminacion_programada = NULL WHERE id_usuario = ? AND fecha_eliminacion_programada > UTC_TIMESTAMP()", [usuario.id]);
  pedir(resultado.affectedRows === 1, "No existe una eliminación pendiente por cancelar.");
  return { mensaje: "Eliminación cancelada." };
}

async function limpiarCuentasVencidas() {
  const [resultado] = await pool.execute(
    `UPDATE usuario SET nombre = NULL, correo = NULL, contrasena_hash = NULL,
            id_estado_cuenta = 5, fecha_eliminacion_programada = NULL
      WHERE fecha_eliminacion_programada IS NOT NULL
        AND fecha_eliminacion_programada <= UTC_TIMESTAMP()
        AND id_estado_cuenta = 1`
  );
  return resultado.affectedRows;
}

module.exports = {
  verPerfil,
  actualizarNombre,
  solicitarCambioCorreo,
  confirmarCambioCorreo,
  actualizarContra,
  guardarNotificaciones,
  programarEliminacion,
  cancelarEliminacion,
  limpiarCuentasVencidas
};
