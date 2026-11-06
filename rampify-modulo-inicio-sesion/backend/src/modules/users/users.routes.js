const express = require("express");
const controller = require("./users.controller");
const { requiereSesion, requiereRol } = require("../../middleware/sesion");
const { asyncHandler } = require("../../shared/errores");

const router = express.Router();
router.use(requiereSesion, requiereRol("Administrador del sistema"));
router.get("/", asyncHandler(controller.listar));
router.get("/denuncias", asyncHandler(controller.denuncias));
router.post("/:id/banear", asyncHandler(controller.banear));
router.delete("/:id", asyncHandler(controller.eliminar));
router.post("/:id/alertas", asyncHandler(controller.alertar));

module.exports = router;
