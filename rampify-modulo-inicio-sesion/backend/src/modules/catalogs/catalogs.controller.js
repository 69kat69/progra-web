const service = require("./catalogs.service");

async function listar(req, res) { res.json({ tipos: await service.listar(req.usuario.rol !== "Administrador del sistema") }); }
async function agregar(req, res) { res.status(201).json(await service.agregar(req.usuario, req.body.nombre)); }
async function editar(req, res) { res.json(await service.editar(req.usuario, req.params.id, req.body.nombre)); }
async function quitar(req, res) { res.json(await service.quitar(req.usuario, req.params.id)); }

module.exports = { listar, agregar, editar, quitar };
