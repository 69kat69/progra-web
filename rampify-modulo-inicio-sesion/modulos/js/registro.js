import { cargarDatos, guardarDatos, empleadosIniciales, limitarEnvio } from "./datos.js";

const tipo = document.getElementById("tipoCuenta");
const invitacion = document.getElementById("campoInvitacion");
const formulario = document.getElementById("formRegistro");
const empleados = cargarDatos("empleados", empleadosIniciales);
const cuentas = JSON.parse(localStorage.getItem("rampify_registros") || "[]");

// Enseña el campo de invitación para esa cuenta.
tipo.addEventListener("change", () => {
  invitacion.hidden = tipo.value !== "admin";
  document.getElementById("codigoInvitacion").required = tipo.value === "admin";
});

formulario.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const boton = formulario.querySelector("button");
  const mensaje = document.getElementById("mensajeRegistro");
  const nombre = document.getElementById("nombreRegistro").value.trim();
  const correo = document.getElementById("correoRegistro").value.trim();
  const contra = document.getElementById("contraRegistro").value;
  const acepta = document.getElementById("aceptaAviso").checked;

  if (nombre.length < 2 || nombre.length > 64 || !/^[\p{L} ]+$/u.test(nombre)) {
    mensaje.textContent = "El nombre debe tener de 2 a 64 letras y espacios.";
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo) || correo.length > 254) {
    mensaje.textContent = "Escribe un correo válido de hasta 254 caracteres.";
    return;
  }
  const contraValida = contra.length >= 8 && contra.length <= 64 && /[A-Z]/.test(contra) && /[a-z]/.test(contra) && /[0-9]/.test(contra);
  if (!contraValida) {
    mensaje.textContent = "Revisa los requisitos de la contra.";
    return;
  }
  if (!acepta) {
    mensaje.textContent = "Debes aceptar el aviso de privacidad para continuar.";
    return;
  }
  if (cuentas.some((cuenta) => cuenta.correo.toLowerCase() === correo.toLowerCase())) {
    mensaje.textContent = "El correo ya se encuentra registrado.";
    return;
  }
  let invitacionValida = null;
  let invitaciones = [];
  if (tipo.value === "admin") {
    invitaciones = JSON.parse(localStorage.getItem("rampify_invitaciones") || "[]");
    invitacionValida = invitaciones.find((i) => i.correo.toLowerCase() === correo.toLowerCase() && i.token === document.getElementById("codigoInvitacion").value && !i.usada && Date.now() < i.vence);
    if (!invitacionValida) {
      mensaje.textContent = "La invitación venció, ya se usó o no coincide con este correo.";
      return;
    }
  }
  if (!limitarEnvio(mensaje, boton)) return;
  if (invitacionValida) {
    invitacionValida.usada = true;
    localStorage.setItem("rampify_invitaciones", JSON.stringify(invitaciones));
  }

  cuentas.push({ nombre, correo, rol: tipo.value, estado: tipo.value === "empleado" ? "Pendiente de autorización" : "Activa" });
  localStorage.setItem("rampify_registros", JSON.stringify(cuentas));

  if (tipo.value === "empleado") {
    empleados.push({ nombre, correo, estado: "Pendiente de autorización" });
    guardarDatos("empleados", empleados);
    mensaje.textContent = "Solicitud de registro guardada en esta demostración.";
  } else {
    mensaje.textContent = tipo.value === "admin"
      ? "Registro de invitación completado en esta demostración."
      : "Cuenta creada en esta demostración. Ya puedes volver al inicio.";
  }
  formulario.reset();
  invitacion.hidden = true;
});
