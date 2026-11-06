const { guardarError } = require("../services/logs.service");

function requestId(req, res, next) {
  const { randomUUID } = require("node:crypto");
  req.idPeticion = randomUUID();
  res.setHeader("X-Request-Id", req.idPeticion);
  next();
}

function rutaNoEncontrada(req, res) {
  res.status(404).json({ mensaje: "La ruta solicitada no existe.", idPeticion: req.idPeticion });
}

function manejarError(error, req, res, next) {
  const estado = error.status || 500;
  if (estado >= 500) {
    const datos = { idPeticion: req.idPeticion, metodo: req.method, ruta: req.path, mensaje: error.message };
    console.error(new Date().toISOString(), datos);
    guardarError(datos).catch((problema) => console.error("No se pudo guardar el log:", problema.message));
  }
  if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ mensaje: "El dato ya existe.", idPeticion: req.idPeticion });
  if (error.code === "LIMIT_FILE_SIZE") return res.status(400).json({ mensaje: "La imagen no puede superar los 5 MB.", idPeticion: req.idPeticion });
  res.status(estado).json({ mensaje: estado >= 500 ? "Ocurrió un error interno." : error.message, idPeticion: req.idPeticion });
}

module.exports = { requestId, manejarError, rutaNoEncontrada };
