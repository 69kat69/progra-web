const express = require("express");
const controller = require("./dashboard.controller");
const { requiereSesion, requiereRol } = require("../../middleware/sesion");
const { asyncHandler } = require("../../shared/errores");

const router = express.Router();
router.use(requiereSesion, requiereRol("Empleado de la asociación", "Administrador del sistema"));
router.get("/", asyncHandler(controller.consultar));

module.exports = router;
