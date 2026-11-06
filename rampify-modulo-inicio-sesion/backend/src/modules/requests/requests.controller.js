const service = require("./requests.service");

async function crear(req, res) {
  const solicitud = await service.crearSolicitud(req.usuario, req.body.idReporte, req.body.motivo);
  res.status(201).json({ mensaje: "Solicitud recibida.", solicitud });
}

async function listar(req, res) {
  res.json({ solicitudes: await service.listarSolicitudes() });
}

async function resolver(req, res) {
  res.json(await service.resolverSolicitud(req.usuario, req.params.id, req.body.estado, req.body.motivoRechazo));
}

module.exports = { crear, listar, resolver };
