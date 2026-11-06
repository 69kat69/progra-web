const { pool } = require("../../config/database");
const { pedir } = require("../../shared/validaciones");
const { guardarAccion } = require("../../services/auditoria.service");

async function listar(activos = true) {
  const condicion = activos ? "WHERE activo = 1" : "";
  const [filas] = await pool.query(`SELECT id_tipo_problema, nombre, activo, fecha_creacion FROM tipo_problema ${condicion} ORDER BY nombre`);
  return filas;
}

async function agregar(usuario, nombre) {
  pedir(typeof nombre === "string" && nombre.trim().length >= 2 && nombre.trim().length <= 60, "El nombre debe tener de 2 a 60 caracteres.");
  const [resultado] = await pool.execute("INSERT INTO tipo_problema (nombre) VALUES (?)", [nombre.trim()]);
  await guardarAccion(usuario, "Agregar tipo de problema", "tipo_problema", resultado.insertId, nombre.trim());
  return { id: resultado.insertId, nombre: nombre.trim(), activo: true };
}

async function editar(usuario, id, nombre) {
  pedir(typeof nombre === "string" && nombre.trim().length >= 2 && nombre.trim().length <= 60, "El nombre debe tener de 2 a 60 caracteres.");
  const [resultado] = await pool.execute("UPDATE tipo_problema SET nombre = ? WHERE id_tipo_problema = ? AND activo = 1", [nombre.trim(), id]);
  pedir(resultado.affectedRows === 1, "No se encontró un elemento activo.");
  await guardarAccion(usuario, "Editar tipo de problema", "tipo_problema", Number(id), nombre.trim());
  return { mensaje: "Elemento actualizado." };
}

async function quitar(usuario, id) {
  const [resultado] = await pool.execute("UPDATE tipo_problema SET activo = 0 WHERE id_tipo_problema = ? AND activo = 1", [id]);
  pedir(resultado.affectedRows === 1, "No se encontró un elemento activo.");
  await guardarAccion(usuario, "Desactivar tipo de problema", "tipo_problema", Number(id));
  return { mensaje: "Elemento retirado de las opciones. Los reportes anteriores conservan su tipo." };
}

module.exports = { listar, agregar, editar, quitar };
