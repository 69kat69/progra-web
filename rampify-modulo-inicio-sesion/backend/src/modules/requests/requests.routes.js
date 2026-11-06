const express = require("express");
const controller = require("./requests.controller");
const { requiereSesion, requiereRol } = require("../../middleware/sesion");
const { asyncHandler } = require("../../shared/errores");

const router = express.Router();
router.use(requiereSesion);
router.post("/reportes", requiereRol("Usuario de la app"), asyncHandler(controller.crear));
router.get("/reportes", requiereRol("Administrador del sistema"), asyncHandler(controller.listar));
router.patch("/reportes/:id", requiereRol("Administrador del sistema"), asyncHandler(controller.resolver));

module.exports = router;
