const { pool } = require("../config/database");

async function guardarAccion(usuario, accion, entidad = null, idEntidad = null, detalle = null) {
  try {
    await pool.execute(
      "INSERT INTO bitacora (id_usuario, id_rol, accion, entidad, id_entidad, detalle) VALUES (?, ?, ?, ?, ?, ?)",
      [usuario.id, usuario.idRol, accion, entidad, idEntidad, detalle]
    );
  } catch (error) {
    console.error("No se pudo guardar la acción en bitacora:", error.message);
  }
}

module.exports = { guardarAccion };
