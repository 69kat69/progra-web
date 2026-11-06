const auth = require("./auth.service");
const { pool } = require("../../config/database");
const { AppError } = require("../../shared/errores");

async function iniciarSesion(req, res) {
  const datos = await auth.iniciarSesion(req.body.correo, req.body.contra);
  res.json(datos);
}

async function registrarUsuario(req, res) {
  const datos = await auth.registrar(req.body, "usuario");
  res.status(201).json({ mensaje: "Cuenta creada.", ...datos });
}

async function pedirRegistroEmpleado(req, res) {
  const datos = await auth.registrar(req.body, "empleado");
  res.status(201).json({ mensaje: "Petición enviada, pendiente de autorización.", ...datos });
}

async function registrarAdmin(req, res) {
  const datos = await auth.registrarAdmin(req.body);
  res.status(201).json({ mensaje: "Cuenta de administrador creada.", ...datos });
}

async function enviarCodigo(req, res) {
  const datos = await auth.enviarCodigoRecuperacion(req.body.correo);
  res.json(datos);
}

async function verificarCodigo(req, res) {
  const datos = await auth.verificarCodigo(req.body.correo, req.body.codigo);
  res.json(datos);
}

async function cambiarContra(req, res) {
  const datos = await auth.cambiarContraConCodigo(req.body.correo, req.body.codigo, req.body.contra);
  res.json(datos);
}

async function verSesion(req, res) {
  const [filas] = await pool.execute(
    `SELECT u.id_usuario, u.nombre, u.correo, r.nombre AS rol
       FROM usuario u JOIN rol r ON r.id_rol = u.id_rol
      WHERE u.id_usuario = ? AND u.id_estado_cuenta = 1`,
    [req.usuario.id]
  );
  if (!filas[0]) throw new AppError(401, "La cuenta ya no está activa.");
  res.json({ usuario: filas[0] });
}

function cerrarSesion(req, res) {
  res.json({ mensaje: "Sesión cerrada. El cliente debe borrar su token." });
}

module.exports = {
  iniciarSesion,
  registrarUsuario,
  pedirRegistroEmpleado,
  registrarAdmin,
  enviarCodigo,
  verificarCodigo,
  cambiarContra,
  verSesion,
  cerrarSesion
};
