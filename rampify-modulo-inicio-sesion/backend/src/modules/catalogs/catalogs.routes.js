const express = require("express");
const controller = require("./catalogs.controller");
const { requiereSesion, requiereRol } = require("../../middleware/sesion");
const { asyncHandler } = require("../../shared/errores");

const router = express.Router();
router.use(requiereSesion);
router.get("/", asyncHandler(controller.listar));
router.post("/", requiereRol("Administrador del sistema"), asyncHandler(controller.agregar));
router.patch("/:id", requiereRol("Administrador del sistema"), asyncHandler(controller.editar));
router.delete("/:id", requiereRol("Administrador del sistema"), asyncHandler(controller.quitar));

module.exports = router;
