const { AppError } = require("./errores");

function validarCorreo(correo) {
  return typeof correo === "string" && correo.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

function validarNombre(nombre, maximo = 64) {
  return typeof nombre === "string" && nombre.trim().length >= 2 && nombre.trim().length <= maximo && /^\p{L}[\p{L} ]*$/u.test(nombre.trim());
}

function validarContra(contra) {
  return typeof contra === "string" && contra.length >= 8 && contra.length <= 64 && /[A-Z]/.test(contra) && /[a-z]/.test(contra) && /[0-9]/.test(contra);
}

function pedir(ok, mensaje) {
  if (!ok) throw new AppError(400, mensaje);
}

module.exports = { validarCorreo, validarNombre, validarContra, pedir };
