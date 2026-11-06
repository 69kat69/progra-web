const service = require("./users.service");

async function listar(req, res) { res.json({ usuarios: await service.listarUsuarios() }); }
async function denuncias(req, res) { res.json({ denuncias: await service.listarDenuncias() }); }
async function banear(req, res) { res.json(await service.banear(req.usuario, req.params.id, req.body.motivo, req.body.comentario)); }
async function eliminar(req, res) { res.json(await service.eliminarDatosPersonales(req.usuario, req.params.id, req.body.contra)); }
async function alertar(req, res) { res.status(201).json(await service.enviarAlerta(req.usuario, req.params.id, req.body.mensaje)); }

module.exports = { listar, denuncias, banear, eliminar, alertar };
