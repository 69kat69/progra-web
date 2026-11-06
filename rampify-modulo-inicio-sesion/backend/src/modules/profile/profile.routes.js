const express = require("express");
const controller = require("./profile.controller");
const { requiereSesion } = require("../../middleware/sesion");
const { asyncHandler } = require("../../shared/errores");

const router = express.Router();
router.use(requiereSesion);
router.get("/", asyncHandler(controller.ver));
router.patch("/nombre", asyncHandler(controller.actualizarNombre));
router.post("/correo/codigo", asyncHandler(controller.pedirCodigoCorreo));
router.patch("/correo", asyncHandler(controller.confirmarCorreo));
router.patch("/contra", asyncHandler(controller.actualizarContra));
router.patch("/notificaciones", asyncHandler(controller.notificaciones));
router.delete("/cuenta", asyncHandler(controller.eliminarCuenta));
router.post("/cuenta/cancelar-eliminacion", asyncHandler(controller.cancelarEliminacion));

module.exports = router;
