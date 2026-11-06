const express = require("express");
const controller = require("./auth.controller");
const { asyncHandler } = require("../../shared/errores");
const { requiereSesion } = require("../../middleware/sesion");

const router = express.Router();

router.post("/login", asyncHandler(controller.iniciarSesion));
router.post("/registro", asyncHandler(controller.registrarUsuario));
router.post("/registro-empleado", asyncHandler(controller.pedirRegistroEmpleado));
router.post("/registro-admin", asyncHandler(controller.registrarAdmin));
router.post("/recuperar/codigo", asyncHandler(controller.enviarCodigo));
router.post("/recuperar/verificar", asyncHandler(controller.verificarCodigo));
router.post("/recuperar/contra", asyncHandler(controller.cambiarContra));
router.get("/sesion", requiereSesion, asyncHandler(controller.verSesion));
router.post("/logout", requiereSesion, controller.cerrarSesion);

module.exports = router;
