const service = require("./reports.service");

async function crear(req, res) {
  const datos = await service.guardarReporte(req.usuario, req.body, req.file);
  res.status(201).json(datos);
}

async function listar(req, res) {
  res.json({ reportes: await service.listarReportes(req.usuario, req.query) });
}

async function cercanos(req, res) {
  res.json({ reportes: await service.cercanos(req.query.latitud, req.query.longitud) });
}

async function detalle(req, res) {
  const reporte = await service.detalleReporte(req.usuario, req.params.id);
  res.json({ reporte });
}

async function cambiarEstado(req, res) {
  const resultado = await service.cambiarEstado(req.usuario, req.params.id, req.body.estado, req.body.criterio, req.body.comentario);
  res.json(resultado);
}

async function eliminar(req, res) {
  res.json(await service.eliminarReporte(req.usuario, req.params.id, req.body.motivo));
}

async function denunciar(req, res) {
  const resultado = await service.denunciar(req.usuario, req.params.id, req.body.motivo, req.body.comentario);
  res.status(201).json(resultado);
}

async function imagen(req, res) {
  const archivo = await service.obtenerImagen(req.usuario, req.params.id);
  res.type(archivo.tipo_mime).send(archivo.imagen);
}

module.exports = { crear, listar, cercanos, detalle, cambiarEstado, eliminar, denunciar, imagen };
