const express = require("express");
const controller = require("./organizations.controller");
const { requiereSesion, requiereRol } = require("../../middleware/sesion");
const { asyncHandler } = require("../../shared/errores");

const router = express.Router();
router.use(requiereSesion, requiereRol("Administrador del sistema"));
router.get("/empleados/solicitudes", asyncHandler(controller.listar));
router.patch("/empleados/:id/decision", asyncHandler(controller.resolver));
router.post("/empleados/:id/suspension", asyncHandler(controller.suspender));
router.delete("/empleados/:id", asyncHandler(controller.baja));
router.post("/administradores/invitaciones", asyncHandler(controller.invitar));

module.exports = router;
