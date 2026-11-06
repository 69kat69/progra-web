const jwt = require("jsonwebtoken");
const { AppError } = require("../shared/errores");
const { pool } = require("../config/database");

async function requiereSesion(req, res, next) {
  const cabecera = req.headers.authorization || "";
  const token = cabecera.startsWith("Bearer ") ? cabecera.slice(7) : "";
  if (!token) return next(new AppError(401, "Inicia sesión para continuar."));

  try {
    req.usuario = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return next(new AppError(401, "La sesión venció. Inicia sesión nuevamente."));
  }

  try {
    const [filas] = await pool.execute("SELECT id_estado_cuenta FROM usuario WHERE id_usuario = ? AND (fecha_eliminacion_programada IS NULL OR fecha_eliminacion_programada > UTC_TIMESTAMP())", [req.usuario.id]);
    if (!filas[0] || filas[0].id_estado_cuenta !== 1) return next(new AppError(403, "La cuenta está inactiva y no puede acceder."));
    res.setHeader("X-Nueva-Sesion", jwt.sign(
      { id: req.usuario.id, rol: req.usuario.rol, idRol: req.usuario.idRol },
      process.env.JWT_SECRET,
      { expiresIn: (process.env.JWT_MINUTES || 30) + "m" }
    ));
    next();
  } catch (error) {
    next(error);
  }
}

function requiereRol(...roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) return next(new AppError(403, "Acceso denegado."));
    next();
  };
}

module.exports = { requiereSesion, requiereRol };
