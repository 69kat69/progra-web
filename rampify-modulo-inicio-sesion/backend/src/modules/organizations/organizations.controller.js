const service = require("./organizations.service");

async function listar(req, res) { res.json({ solicitudes: await service.listarSolicitudes() }); }
async function resolver(req, res) { res.json(await service.resolverRegistro(req.usuario, req.params.id, req.body.decision, req.body.motivo)); }
async function suspender(req, res) { res.json(await service.sancionarEmpleado(req.usuario, req.params.id, req.body.dias, req.body.motivo, req.body.comentario)); }
async function baja(req, res) { res.json(await service.darDeBaja(req.usuario, req.params.id, req.body.contra)); }
async function invitar(req, res) { res.status(201).json(await service.invitarAdministrador(req.usuario, req.body.correo)); }

module.exports = { listar, resolver, suspender, baja, invitar };
