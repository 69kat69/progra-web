const service = require("./profile.service");

async function ver(req, res) { res.json({ perfil: await service.verPerfil(req.usuario.id) }); }
async function actualizarNombre(req, res) { res.json(await service.actualizarNombre(req.usuario, req.body.nombre)); }
async function pedirCodigoCorreo(req, res) { res.json(await service.solicitarCambioCorreo(req.usuario, req.body.correo)); }
async function confirmarCorreo(req, res) { res.json(await service.confirmarCambioCorreo(req.usuario, req.body.correo, req.body.codigo)); }
async function actualizarContra(req, res) { res.json(await service.actualizarContra(req.usuario, req.body.contraActual, req.body.contraNueva)); }
async function notificaciones(req, res) { res.json(await service.guardarNotificaciones(req.usuario, req.body.estadoReporte, req.body.eliminacionReporte)); }
async function eliminarCuenta(req, res) { res.json(await service.programarEliminacion(req.usuario, req.body.contra)); }
async function cancelarEliminacion(req, res) { res.json(await service.cancelarEliminacion(req.usuario)); }

module.exports = { ver, actualizarNombre, pedirCodigoCorreo, confirmarCorreo, actualizarContra, notificaciones, eliminarCuenta, cancelarEliminacion };
