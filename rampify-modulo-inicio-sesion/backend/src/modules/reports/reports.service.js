const { pool } = require("../../config/database");
const { AppError } = require("../../shared/errores");
const { pedir } = require("../../shared/validaciones");
const { guardarAccion } = require("../../services/auditoria.service");

const estados = ["Pendiente", "En proceso", "Solucionado", "Rechazado"];
const criterios = ["Incumple Términos y Condiciones", "Sin barrera de accesibilidad en la imagen", "Descripción ilegible", "Solicitud del autor"];

function crearFolio() {
  return "RMP-" + String(Math.floor(10000000 + Math.random() * 90000000));
}

async function guardarReporte(usuario, datos, imagen) {
  pedir(datos.idTipoProblema !== undefined && String(datos.idTipoProblema).trim() !== "" && Number.isInteger(Number(datos.idTipoProblema)), "Selecciona un tipo de problema.");
  pedir(typeof datos.descripcion === "string" && datos.descripcion.trim().length >= 10 && datos.descripcion.trim().length <= 500, "La descripción debe tener de 10 a 500 caracteres.");
  pedir(datos.latitud !== undefined && String(datos.latitud).trim() !== "" && Number.isFinite(Number(datos.latitud)) && Number(datos.latitud) >= -90 && Number(datos.latitud) <= 90, "La latitud debe estar entre -90 y 90.");
  pedir(datos.longitud !== undefined && String(datos.longitud).trim() !== "" && Number.isFinite(Number(datos.longitud)) && Number(datos.longitud) >= -180 && Number(datos.longitud) <= 180, "La longitud debe estar entre -180 y 180.");
  pedir(imagen && ["image/jpeg", "image/png"].includes(imagen.mimetype), "Adjunta una imagen JPG o PNG.");
  pedir(imagen.size <= 5 * 1024 * 1024, "La imagen no puede superar los 5 MB.");
  const firma = imagen.buffer.subarray(0, 8).toString("hex");
  const esJpeg = firma.startsWith("ffd8ff");
  const esPng = firma === "89504e470d0a1a0a";
  pedir((esJpeg && imagen.mimetype === "image/jpeg") || (esPng && imagen.mimetype === "image/png"), "El archivo no coincide con una imagen JPG o PNG válida.");

  const [tipos] = await pool.execute("SELECT id_tipo_problema FROM tipo_problema WHERE id_tipo_problema = ? AND activo = 1", [datos.idTipoProblema]);
  pedir(tipos.length === 1, "El tipo de problema ya no está disponible.");

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    let folio = crearFolio();
    let intentos = 0;
    let duplicado = true;
    while (duplicado && intentos < 5) {
      const [existe] = await conexion.execute("SELECT id_reporte FROM reporte WHERE folio = ?", [folio]);
      duplicado = existe.length > 0;
      if (duplicado) folio = crearFolio();
      intentos += 1;
    }
    pedir(!duplicado, "No se pudo generar el folio. Intenta de nuevo.");

    const [resultado] = await conexion.execute(
      `INSERT INTO reporte (folio, id_usuario, id_tipo_problema, id_estado_reporte, descripcion, latitud, longitud)
       VALUES (?, ?, ?, 1, ?, ?, ?)`,
      [folio, usuario.id, datos.idTipoProblema, datos.descripcion.trim(), Number(datos.latitud), Number(datos.longitud)]
    );
    await conexion.execute(
      "INSERT INTO imagen_reporte (id_reporte, imagen, tipo_mime) VALUES (?, ?, ?)",
      [resultado.insertId, imagen.buffer, imagen.mimetype]
    );
    await conexion.execute(
      `INSERT INTO historial_estado_reporte (id_reporte, id_estado_anterior, id_estado_nuevo, id_responsable)
       VALUES (?, NULL, 1, ?)`,
      [resultado.insertId, usuario.id]
    );
    await conexion.commit();
    await guardarAccion(usuario, "Crear reporte", "reporte", resultado.insertId, folio);
    return { id: resultado.insertId, folio, estado: "Pendiente" };
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

async function listarReportes(usuario, filtros = {}) {
  const revisarFecha = (fecha) => !fecha || (typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fecha) && !Number.isNaN(Date.parse(fecha)));
  pedir(revisarFecha(filtros.desde) && revisarFecha(filtros.hasta), "Las fechas deben usar el formato AAAA-MM-DD.");
  pedir(!filtros.desde || !filtros.hasta || filtros.hasta >= filtros.desde, "La fecha final es anterior a la fecha inicial.");
  const condiciones = ["r.eliminado = 0"];
  const valores = [];
  if (usuario.rol === "Usuario de la app") {
    condiciones.push("r.id_usuario = ?");
    valores.push(usuario.id);
  }
  if (filtros.estado) {
    pedir(estados.includes(filtros.estado), "El estado no es válido.");
    condiciones.push("er.nombre = ?");
    valores.push(filtros.estado);
  }
  if (filtros.tipo) {
    condiciones.push("tp.id_tipo_problema = ?");
    valores.push(Number(filtros.tipo));
  }
  if (filtros.desde) { condiciones.push("r.fecha_creacion >= ?"); valores.push(filtros.desde + " 00:00:00"); }
  if (filtros.hasta) { condiciones.push("r.fecha_creacion < DATE_ADD(?, INTERVAL 1 DAY)"); valores.push(filtros.hasta); }

  const [filas] = await pool.execute(
    `SELECT r.id_reporte, r.folio, r.descripcion, r.latitud, r.longitud,
            r.fecha_creacion, er.nombre AS estado, tp.nombre AS tipo,
            u.nombre AS reportado_por
       FROM reporte r
       JOIN estado_reporte er ON er.id_estado_reporte = r.id_estado_reporte
       JOIN tipo_problema tp ON tp.id_tipo_problema = r.id_tipo_problema
       JOIN usuario u ON u.id_usuario = r.id_usuario
      WHERE ${condiciones.join(" AND ")}
      ORDER BY r.fecha_creacion DESC LIMIT 200`,
    valores
  );
  return filas;
}

async function cercanos(latitud, longitud) {
  pedir(Number.isFinite(Number(latitud)) && Number(latitud) >= -90 && Number(latitud) <= 90, "Latitud inválida.");
  pedir(Number.isFinite(Number(longitud)) && Number(longitud) >= -180 && Number(longitud) <= 180, "Longitud inválida.");
  const [filas] = await pool.execute(
    `SELECT r.id_reporte, r.folio, r.descripcion, r.latitud, r.longitud,
            er.nombre AS estado, tp.nombre AS tipo,
            (6371 * ACOS(LEAST(1, GREATEST(-1,
              COS(RADIANS(?)) * COS(RADIANS(r.latitud)) *
              COS(RADIANS(r.longitud) - RADIANS(?)) +
              SIN(RADIANS(?)) * SIN(RADIANS(r.latitud))
            )))) AS distancia_km
       FROM reporte r
       JOIN estado_reporte er ON er.id_estado_reporte = r.id_estado_reporte
       JOIN tipo_problema tp ON tp.id_tipo_problema = r.id_tipo_problema
      WHERE r.eliminado = 0
      HAVING distancia_km <= 5
      ORDER BY distancia_km LIMIT 100`,
    [Number(latitud), Number(longitud), Number(latitud)]
  );
  return filas;
}

async function detalleReporte(usuario, id) {
  const [filas] = await pool.execute(
    `SELECT r.id_reporte, r.id_usuario, r.folio, r.descripcion, r.latitud, r.longitud,
            r.fecha_creacion, er.nombre AS estado, tp.nombre AS tipo,
            u.nombre AS reportado_por, ir.tipo_mime, ir.imagen
       FROM reporte r JOIN estado_reporte er ON er.id_estado_reporte = r.id_estado_reporte
       JOIN tipo_problema tp ON tp.id_tipo_problema = r.id_tipo_problema
       JOIN usuario u ON u.id_usuario = r.id_usuario
       LEFT JOIN imagen_reporte ir ON ir.id_reporte = r.id_reporte
      WHERE r.id_reporte = ? AND r.eliminado = 0`,
    [id]
  );
  const reporte = filas[0];
  if (!reporte) throw new AppError(404, "No se encontró el reporte.");
  if (usuario.rol === "Usuario de la app" && reporte.id_usuario !== usuario.id) throw new AppError(403, "Solo puedes consultar tus reportes.");
  if (reporte.imagen) reporte.imagen = reporte.imagen.toString("base64");
  return reporte;
}

async function cambiarEstado(usuario, id, nuevoEstado, criterio, comentario) {
  pedir(estados.includes(nuevoEstado), "El estado no es válido.");
  if (nuevoEstado === "Rechazado") pedir(usuario.rol === "Administrador del sistema", "Solo el administrador puede rechazar un reporte como inválido.");
  pedir(!comentario || comentario.length <= 300, "El comentario no puede superar 300 caracteres.");
  let criterioId = null;
  if (nuevoEstado === "Rechazado") {
    pedir(criterios.slice(0, 3).includes(criterio), "Selecciona un motivo válido para rechazar el reporte.");
    const [filas] = await pool.execute("SELECT id_criterio FROM criterio_invalido WHERE nombre = ?", [criterio]);
    pedir(filas.length === 1, "El criterio no existe en el catálogo.");
    criterioId = filas[0].id_criterio;
  }
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const [reportes] = await conexion.execute("SELECT id_estado_reporte FROM reporte WHERE id_reporte = ? AND eliminado = 0 FOR UPDATE", [id]);
    if (!reportes[0]) throw new AppError(404, "No se encontró el reporte.");
    const [nuevo] = await conexion.execute("SELECT id_estado_reporte FROM estado_reporte WHERE nombre = ?", [nuevoEstado]);
    pedir(nuevo.length === 1, "El estado no existe.");
    await conexion.execute("UPDATE reporte SET id_estado_reporte = ? WHERE id_reporte = ?", [nuevo[0].id_estado_reporte, id]);
    await conexion.execute(
      `INSERT INTO historial_estado_reporte
       (id_reporte, id_estado_anterior, id_estado_nuevo, id_responsable, id_criterio, comentario)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, reportes[0].id_estado_reporte, nuevo[0].id_estado_reporte, usuario.id, criterioId, comentario || null]
    );
    await conexion.commit();
    await guardarAccion(usuario, "Cambiar estado de reporte", "reporte", id, nuevoEstado);
    return { mensaje: "Estado actualizado.", estado: nuevoEstado };
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally { conexion.release(); }
}

async function eliminarReporte(usuario, id, motivo) {
  pedir(criterios.includes(motivo), "Selecciona un motivo válido para eliminar el reporte.");
  const [reglas] = await pool.execute("SELECT id_criterio FROM criterio_invalido WHERE nombre = ?", [motivo]);
  pedir(reglas.length === 1, "El criterio no existe en el catálogo.");
  const [resultado] = await pool.execute(
    `UPDATE reporte SET eliminado = 1, fecha_eliminacion = UTC_TIMESTAMP(), id_criterio_eliminacion = ?
      WHERE id_reporte = ? AND eliminado = 0`,
    [reglas[0].id_criterio, id]
  );
  pedir(resultado.affectedRows === 1, "No se encontró el reporte o ya fue eliminado.");
  await guardarAccion(usuario, "Eliminar reporte", "reporte", id, motivo);
  return { mensaje: "Reporte eliminado de las listas." };
}

async function denunciar(usuario, id, motivo, comentario) {
  pedir(["Mal uso de la app", "Incumple Términos y Condiciones"].includes(motivo), "Selecciona un motivo válido.");
  pedir(!comentario || comentario.length <= 300, "El comentario no puede superar 300 caracteres.");
  const [filas] = await pool.execute("SELECT id_usuario FROM reporte WHERE id_reporte = ? AND eliminado = 0", [id]);
  pedir(filas.length === 1, "No se encontró el reporte.");
  pedir(filas[0].id_usuario !== usuario.id, "No puedes denunciar tu propio reporte.");
  await pool.execute(
    "INSERT INTO denuncia_usuario (id_reporte, id_denunciante, id_denunciado, motivo, comentario) VALUES (?, ?, ?, ?, ?)",
    [id, usuario.id, filas[0].id_usuario, motivo, comentario || null]
  );
  await guardarAccion(usuario, "Denunciar usuario", "reporte", id, motivo);
  return { mensaje: "Denuncia recibida." };
}

async function obtenerImagen(usuario, id) {
  const [filas] = await pool.execute(
    `SELECT ir.imagen, ir.tipo_mime, r.id_usuario
       FROM imagen_reporte ir JOIN reporte r ON r.id_reporte = ir.id_reporte
      WHERE ir.id_reporte = ? AND r.eliminado = 0`,
    [id]
  );
  if (!filas[0]) throw new AppError(404, "El reporte no tiene imagen.");
  if (usuario.rol === "Usuario de la app" && filas[0].id_usuario !== usuario.id) throw new AppError(403, "Solo puedes consultar imágenes de tus reportes.");
  return filas[0];
}

module.exports = { guardarReporte, listarReportes, cercanos, detalleReporte, cambiarEstado, eliminarReporte, denunciar, obtenerImagen };
