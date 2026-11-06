const bcrypt = require("bcryptjs");
const { randomBytes } = require("node:crypto");
const { pool } = require("../../config/database");
const { pedir } = require("../../shared/validaciones");
const { AppError } = require("../../shared/errores");
const { enviarCorreo } = require("../../services/correo.service");
const { guardarAccion } = require("../../services/auditoria.service");

async function listarSolicitudes() {
  const [filas] = await pool.execute(
    `SELECT u.id_usuario, u.nombre, u.correo, u.fecha_registro
       FROM usuario u
      WHERE u.id_rol = 2 AND u.id_estado_cuenta = 2
      ORDER BY u.fecha_registro ASC`
  );
  return filas;
}

async function resolverRegistro(admin, idUsuario, decision, motivo) {
  pedir(["Aprobar", "Rechazar"].includes(decision), "La decisión debe ser Aprobar o Rechazar.");
  if (decision === "Rechazar") pedir(typeof motivo === "string" && motivo.trim().length >= 10 && motivo.trim().length <= 200, "El motivo debe tener de 10 a 200 caracteres.");

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const [filas] = await conexion.execute("SELECT id_usuario FROM usuario WHERE id_usuario = ? AND id_rol = 2 AND id_estado_cuenta = 2 FOR UPDATE", [idUsuario]);
    pedir(filas.length === 1, "La solicitud ya fue atendida o no existe.");
    const nuevoEstado = decision === "Aprobar" ? 1 : 5;
    await conexion.execute("UPDATE usuario SET id_estado_cuenta = ? WHERE id_usuario = ?", [nuevoEstado, idUsuario]);
    await conexion.execute("INSERT INTO decision_registro (id_usuario, id_admin, decision, motivo) VALUES (?, ?, ?, ?)", [idUsuario, admin.id, decision, decision === "Rechazar" ? motivo.trim() : null]);
    await conexion.commit();
    await guardarAccion(admin, decision + " solicitud de empleado", "usuario", Number(idUsuario));
    return { mensaje: decision === "Aprobar" ? "Empleado aprobado." : "Solicitud rechazada." };
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally { conexion.release(); }
}

async function sancionarEmpleado(admin, idUsuario, dias, motivo, comentario) {
  pedir(Number.isInteger(Number(dias)) && Number(dias) >= 1 && Number(dias) <= 365, "La suspensión debe durar de 1 a 365 días.");
  pedir(typeof motivo === "string" && motivo.trim().length >= 10 && motivo.trim().length <= 60, "El motivo debe tener de 10 a 60 caracteres.");
  pedir(!comentario || comentario.length <= 300, "El comentario no puede superar 300 caracteres.");
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const [filas] = await conexion.execute("SELECT id_usuario FROM usuario WHERE id_usuario = ? AND id_rol = 2 AND id_estado_cuenta = 1 FOR UPDATE", [idUsuario]);
    pedir(filas.length === 1, "Solo se suspenden empleados con cuenta Activa.");
    await conexion.execute(
      `INSERT INTO sancion_cuenta (id_usuario, id_admin, tipo, motivo, comentario, dias, fecha_inicio, fecha_fin, activa)
       VALUES (?, ?, 'Suspensión', ?, ?, ?, UTC_TIMESTAMP(), DATE_ADD(UTC_TIMESTAMP(), INTERVAL ${Number(dias)} DAY), 1)`,
      [idUsuario, admin.id, motivo.trim(), comentario || null, Number(dias)]
    );
    await conexion.execute("UPDATE usuario SET id_estado_cuenta = 3 WHERE id_usuario = ?", [idUsuario]);
    await conexion.commit();
    await guardarAccion(admin, "Suspender empleado", "usuario", Number(idUsuario), motivo.trim());
    return { mensaje: "Empleado suspendido." };
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally { conexion.release(); }
}

async function darDeBaja(admin, idUsuario, contraAdmin) {
  const [admins] = await pool.execute("SELECT contrasena_hash FROM usuario WHERE id_usuario = ? AND id_rol = 3 AND id_estado_cuenta = 1", [admin.id]);
  pedir(admins[0] && await bcrypt.compare(contraAdmin || "", admins[0].contrasena_hash), "La contra del administrador es incorrecta.");
  const [resultado] = await pool.execute("UPDATE usuario SET id_estado_cuenta = 5 WHERE id_usuario = ? AND id_rol = 2 AND id_estado_cuenta IN (1, 3)", [idUsuario]);
  pedir(resultado.affectedRows === 1, "No se encontró un empleado activo o suspendido.");
  await guardarAccion(admin, "Dar de baja empleado", "usuario", Number(idUsuario));
  return { mensaje: "Empleado dado de baja." };
}

async function invitarAdministrador(admin, correo) {
  pedir(typeof correo === "string" && correo.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo), "Escribe un correo válido.");
  const destino = correo.trim().toLowerCase();
  const [usuarios] = await pool.execute("SELECT id_usuario FROM usuario WHERE correo = ?", [destino]);
  pedir(usuarios.length === 0, "El correo ya tiene una cuenta.");
  const [pendientes] = await pool.execute("SELECT id_invitacion FROM invitacion_admin WHERE correo = ? AND usada = 0 AND fecha_expiracion > UTC_TIMESTAMP()", [destino]);
  pedir(pendientes.length === 0, "Ya existe una invitación vigente para ese correo.");

  const token = randomBytes(32).toString("base64url");
  const hash = await bcrypt.hash(token, 12);
  await pool.execute(
    "INSERT INTO invitacion_admin (id_admin, correo, token_hash, fecha_expiracion) VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 24 HOUR))",
    [admin.id, destino, hash]
  );
  await enviarCorreo(destino, "Invitación de administrador de Rampify", "Abre el formulario de registro y usa esta invitación: " + token + ". Vence en 24 horas y solo puede usarse una vez.");
  await guardarAccion(admin, "Invitar administrador", "invitacion_admin", null, destino);
  return { mensaje: "Invitación enviada. Vence en 24 horas y puede usarse una sola vez." };
}

module.exports = { listarSolicitudes, resolverRegistro, sancionarEmpleado, darDeBaja, invitarAdministrador };
