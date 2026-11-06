const express = require("express");
const multer = require("multer");
const controller = require("./reports.controller");
const { requiereSesion, requiereRol } = require("../../middleware/sesion");
const { asyncHandler, AppError } = require("../../shared/errores");

const router = express.Router();
const imagen = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 6, parts: 8 },
  fileFilter(req, file, next) {
    if (!["image/jpeg", "image/png"].includes(file.mimetype)) return next(new AppError(400, "La imagen debe ser JPG o PNG."));
    next(null, true);
  }
});

router.use(requiereSesion);
router.post("/", requiereRol("Usuario de la app"), imagen.single("imagen"), asyncHandler(controller.crear));
router.get("/cercanos", requiereRol("Usuario de la app"), asyncHandler(controller.cercanos));
router.get("/mios", requiereRol("Usuario de la app"), asyncHandler(controller.listar));
router.get("/", requiereRol("Empleado de la asociación", "Administrador del sistema"), asyncHandler(controller.listar));
router.get("/:id/imagen", asyncHandler(controller.imagen));
router.get("/:id", asyncHandler(controller.detalle));
router.patch("/:id/estado", requiereRol("Empleado de la asociación", "Administrador del sistema"), asyncHandler(controller.cambiarEstado));
router.delete("/:id", requiereRol("Administrador del sistema"), asyncHandler(controller.eliminar));
router.post("/:id/denuncias", requiereRol("Usuario de la app", "Empleado de la asociación"), asyncHandler(controller.denunciar));

module.exports = router;
