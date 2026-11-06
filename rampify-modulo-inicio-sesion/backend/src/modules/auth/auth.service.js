const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomInt } = require("node:crypto");
const { pool } = require("../../config/database");
const { AppError } = require("../../shared/errores");
const { validarCorreo, validarNombre, validarContra, pedir } = require("../../shared/validaciones");
const { enviarCorreo } = require("../../services/correo.service");
const { guardarAccion } = require("../../services/auditoria.service");

const MENSAJE_RECUPERACION = "Si el correo está registrado, recibirá un código de verificación.";

function crearToken(usuario) {
  return jwt.sign(
    { id: usuario.id_usuario, rol: usuario.rol, idRol: usuario.id_rol },
    process.env.JWT_SECRET,
    { expiresIn: (process.env.JWT_MINUTES || 30) + "m" }
  );
}

async function buscarUsuario(correo) {
  const [filas] = await pool.execute(
    `SELECT u.id_usuario, u.id_rol, u.id_estado_cuenta, u.nombre, u.correo,
            u.contrasena_hash AS contraHash, u.intentos_fallidos, u.bloqueo_hasta,
            r.nombre AS rol, ec.nombre AS estado
       FROM usuario u
       JOIN rol r ON r.id_rol = u.id_rol
       JOIN estado_cuenta ec ON ec.id_estado_cuenta = u.id_estado_cuenta
      WHERE u.correo = ? LIMIT 1`,
    [correo]
  );
  return filas[0] || null;
}

async function iniciarSesion(correo, contra) {
  pedir(validarCorreo(correo), "Escribe un correo válido.");
  pedir(typeof contra === "string" && contra.length >= 8 && contra.length <= 64, "La contra debe tener de 8 a 64 caracteres.");

  const usuario = await buscarUsuario(correo.trim().toLowerCase());
  if (!usuario) throw new AppError(401, "Correo o contra incorrectos.");

  if (usuario.bloqueo_hasta) {
    const termina = new Date(usuario.bloqueo_hasta + "Z").getTime();
    if (termina > Date.now()) {
      const minutos = Math.ceil((termina - Date.now()) / 60000);
      throw new AppError(423, "Cuenta bloqueada. Intenta de nuevo en " + minutos + " minutos.");
    }
    await pool.execute("UPDATE usuario SET intentos_fallidos = 0, bloqueo_hasta = NULL WHERE id_usuario = ?", [usuario.id_usuario]);
    usuario.intentos_fallidos = 0;
  }

  const contraCorrecta = usuario.contraHash && await bcrypt.compare(contra, usuario.contraHash);
  if (!contraCorrecta) {
    const intentos = Number(usuario.intentos_fallidos) + 1;
    if (intentos >= 5) {
      await pool.execute(
        "UPDATE usuario SET intentos_fallidos = 5, bloqueo_hasta = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 15 MINUTE) WHERE id_usuario = ?",
        [usuario.id_usuario]
      );
      throw new AppError(423, "Cuenta bloqueada por 15 minutos después de 5 intentos fallidos.");
    }
    await pool.execute("UPDATE usuario SET intentos_fallidos = ? WHERE id_usuario = ?", [intentos, usuario.id_usuario]);
    throw new AppError(401, "Correo o contra incorrectos. Intentos restantes: " + (5 - intentos) + ".");
  }

  if (usuario.id_estado_cuenta !== 1) {
    throw new AppError(403, "La cuenta está " + usuario.estado + " y no puede iniciar sesión.");
  }

  await pool.execute(
    "UPDATE usuario SET intentos_fallidos = 0, bloqueo_hasta = NULL, ultimo_acceso = UTC_TIMESTAMP() WHERE id_usuario = ?",
    [usuario.id_usuario]
  );
  const token = crearToken(usuario);
  await guardarAccion({ id: usuario.id_usuario, idRol: usuario.id_rol }, "Iniciar sesión", "usuario", usuario.id_usuario);
  return { token, usuario: { id: usuario.id_usuario, nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol } };
}

async function registrar(body, tipoCuenta) {
  const { nombre, correo, contra, aceptaAviso } = body;
  pedir(validarNombre(nombre, 64), "El nombre debe tener de 2 a 64 letras y espacios.");
  pedir(validarCorreo(correo), "Escribe un correo válido de hasta 254 caracteres.");
  pedir(validarContra(contra), "La contra debe tener de 8 a 64 caracteres, una mayúscula, una minúscula y un número.");
  pedir(aceptaAviso === true, "Debes aceptar el aviso de privacidad para continuar.");

  const rol = tipoCuenta === "empleado" ? 2 : 1;
  const estado = tipoCuenta === "empleado" ? 2 : 1;
  const contraHash = await bcrypt.hash(contra, 12);
  const [resultado] = await pool.execute(
    `INSERT INTO usuario (id_rol, id_estado_cuenta, nombre, correo, contrasena_hash, fecha_aceptacion_aviso)
     VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
    [rol, estado, nombre.trim(), correo.trim().toLowerCase(), contraHash]
  );
  return {
    id: resultado.insertId,
    estado: tipoCuenta === "empleado" ? "Pendiente de autorización" : "Activa"
  };
}

async function registrarAdmin(body) {
  const { nombre, correo, contra, aceptaAviso, invitacion } = body;
  pedir(validarNombre(nombre, 64), "El nombre debe tener de 2 a 64 letras y espacios.");
  pedir(validarCorreo(correo), "Escribe un correo válido.");
  pedir(validarContra(contra), "La contra no cumple los requisitos.");
  pedir(aceptaAviso === true, "Debes aceptar el aviso de privacidad.");
  pedir(typeof invitacion === "string" && invitacion.length > 12, "La invitación no es válida.");

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const [filas] = await conexion.execute(
      `SELECT id_invitacion, token_hash FROM invitacion_admin
        WHERE correo = ? AND usada = 0 AND fecha_expiracion > UTC_TIMESTAMP() FOR UPDATE`,
      [correo.trim().toLowerCase()]
    );
    let invitacionValida = null;
    for (const fila of filas) {
      if (await bcrypt.compare(invitacion, fila.token_hash)) invitacionValida = fila;
    }
    pedir(invitacionValida, "La invitación venció, ya se usó o no coincide con el correo.");

    const hash = await bcrypt.hash(contra, 12);
    const [usuarioNuevo] = await conexion.execute(
      `INSERT INTO usuario (id_rol, id_estado_cuenta, nombre, correo, contrasena_hash, fecha_aceptacion_aviso)
       VALUES (3, 1, ?, ?, ?, UTC_TIMESTAMP())`,
      [nombre.trim(), correo.trim().toLowerCase(), hash]
    );
    await conexion.execute(
      "UPDATE invitacion_admin SET usada = 1, id_usuario_creado = ? WHERE id_invitacion = ?",
      [usuarioNuevo.insertId, invitacionValida.id_invitacion]
    );
    await conexion.commit();
    return { id: usuarioNuevo.insertId, estado: "Activa" };
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

async function enviarCodigoRecuperacion(correo) {
  pedir(validarCorreo(correo), "Escribe un correo válido.");
  const respuesta = { mensaje: MENSAJE_RECUPERACION };
  const usuario = await buscarUsuario(correo.trim().toLowerCase());
  if (!usuario || usuario.id_estado_cuenta !== 1) return respuesta;

  const [cuantos] = await pool.execute(
    `SELECT COUNT(*) AS total FROM codigo_verificacion
      WHERE id_usuario = ? AND tipo = 'Recuperación'
        AND fecha_creacion >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 60 MINUTE)`,
    [usuario.id_usuario]
  );
  if (cuantos[0].total >= 4) return respuesta;

  const codigo = String(randomInt(100000, 1000000));
  const codigoHash = await bcrypt.hash(codigo, 10);
  await pool.execute(
    "UPDATE codigo_verificacion SET usado = 1 WHERE id_usuario = ? AND tipo = 'Recuperación' AND usado = 0",
    [usuario.id_usuario]
  );
  await pool.execute(
    `INSERT INTO codigo_verificacion (id_usuario, tipo, correo_destino, codigo_hash, fecha_expiracion)
     VALUES (?, 'Recuperación', ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 10 MINUTE))`,
    [usuario.id_usuario, usuario.correo, codigoHash]
  );
  try {
    await enviarCorreo(usuario.correo, "Código para recuperar Rampify", "Tu código es " + codigo + ". Vence en 10 minutos.");
  } catch (error) {
    await pool.execute("UPDATE codigo_verificacion SET usado = 1 WHERE id_usuario = ? AND tipo = 'Recuperación' AND usado = 0", [usuario.id_usuario]);
    throw error;
  }
  return respuesta;
}

async function consultarCodigo(correo, codigo, conexion = pool) {
  const usuario = await buscarUsuario(correo.trim().toLowerCase());
  if (!usuario || usuario.id_estado_cuenta !== 1) throw new AppError(400, "Código incorrecto o vencido.");
  const [codigos] = await conexion.execute(
    `SELECT id_codigo, codigo_hash, intentos_incorrectos, fecha_expiracion
       FROM codigo_verificacion
      WHERE id_usuario = ? AND tipo = 'Recuperación' AND usado = 0
      ORDER BY fecha_creacion DESC LIMIT 1`,
    [usuario.id_usuario]
  );
  const registro = codigos[0];
  if (!registro) throw new AppError(400, "Código incorrecto o vencido.");

  const expiracion = new Date(registro.fecha_expiracion + "Z").getTime();
  const coincide = expiracion > Date.now() && registro.intentos_incorrectos < 5 && await bcrypt.compare(codigo, registro.codigo_hash);
  if (!coincide) {
    const intentos = Number(registro.intentos_incorrectos) + 1;
    await conexion.execute(
      "UPDATE codigo_verificacion SET intentos_incorrectos = ?, usado = ? WHERE id_codigo = ?",
      [intentos, intentos >= 5 || expiracion <= Date.now() ? 1 : 0, registro.id_codigo]
    );
    throw new AppError(400, intentos >= 5 ? "Código bloqueado. Solicita uno nuevo." : "Código incorrecto o vencido.");
  }
  return { usuario, registro };
}

async function verificarCodigo(correo, codigo) {
  pedir(validarCorreo(correo) && /^\d{6}$/.test(codigo), "Escribe el correo y el código de 6 dígitos.");
  await consultarCodigo(correo, codigo);
  return { valido: true };
}

async function cambiarContraConCodigo(correo, codigo, contra) {
  pedir(validarCorreo(correo), "Escribe un correo válido.");
  pedir(/^\d{6}$/.test(codigo), "Escribe el código de 6 dígitos.");
  pedir(validarContra(contra), "La contra debe tener de 8 a 64 caracteres, una mayúscula, una minúscula y un número.");
  const { usuario, registro } = await consultarCodigo(correo, codigo);
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const [codigos] = await conexion.execute("SELECT usado FROM codigo_verificacion WHERE id_codigo = ? FOR UPDATE", [registro.id_codigo]);
    pedir(codigos[0] && codigos[0].usado === 0, "Código incorrecto o vencido.");
    const hash = await bcrypt.hash(contra, 12);
    await conexion.execute("UPDATE usuario SET contrasena_hash = ?, intentos_fallidos = 0, bloqueo_hasta = NULL WHERE id_usuario = ?", [hash, usuario.id_usuario]);
    await conexion.execute("UPDATE codigo_verificacion SET usado = 1 WHERE id_codigo = ?", [registro.id_codigo]);
    await conexion.commit();
    await guardarAccion({ id: usuario.id_usuario, idRol: usuario.id_rol }, "Recuperar contra", "usuario", usuario.id_usuario);
    return { mensaje: "Contra actualizada. Vuelve a iniciar sesión." };
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

module.exports = {
  iniciarSesion,
  registrar,
  registrarAdmin,
  enviarCodigoRecuperacion,
  verificarCodigo,
  cambiarContraConCodigo
};
