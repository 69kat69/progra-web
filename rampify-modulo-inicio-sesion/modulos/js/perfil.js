import { limitarEnvio } from "./datos.js";

let codigoCorreoPrueba = "";
let primerEnvioCorreo = true;
let venceCorreo = 0;
let intentosCorreo = 0;
let reenviosCorreo = [];

export function iniciarPerfil() {
  document.getElementById("formPerfil").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const boton = evento.currentTarget.querySelector("button");
    const mensaje = document.getElementById("mensajePerfil");
    const nombre = document.getElementById("nombrePerfil").value.trim();
    if (nombre.length < 2 || nombre.length > 64 || !/^[\p{L} ]+$/u.test(nombre)) {
      mensaje.textContent = "El nombre debe tener de 2 a 64 letras y espacios.";
      return;
    }
    if (!limitarEnvio(mensaje, boton)) return;
    mensaje.textContent = "Datos actualizados en esta demostración.";
  });

  document.getElementById("enviarCodigoCorreo").addEventListener("click", () => {
    const mensaje = document.getElementById("mensajeCorreo");
    const boton = document.getElementById("enviarCodigoCorreo");
    if (!document.getElementById("correoNuevo").checkValidity()) {
      mensaje.textContent = "Escribe un correo válido.";
      return;
    }
    const ahora = Date.now();
    reenviosCorreo = reenviosCorreo.filter((hora) => ahora - hora < 60 * 60 * 1000);
    if (reenviosCorreo.length >= 3) {
      mensaje.textContent = "Límite de reenvíos alcanzado. Espera antes de pedir otro código.";
      return;
    }
    if (!limitarEnvio(mensaje, boton)) return;
    reenviosCorreo.push(ahora);
    intentosCorreo = 0;
    venceCorreo = ahora + 10 * 60 * 1000;
    codigoCorreoPrueba = primerEnvioCorreo ? "123456" : String(Math.floor(100000 + Math.random() * 900000));
    primerEnvioCorreo = false;
    mensaje.textContent = "Código de demostración: 123456. Tiene 10 minutos.";
  });

  document.getElementById("formCorreo").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const mensaje = document.getElementById("mensajeCorreo");
    const boton = evento.currentTarget.querySelector("button[type=submit]");
    if (intentosCorreo >= 5) {
      mensaje.textContent = "Código bloqueado. Pide uno nuevo.";
      return;
    }
    if (!codigoCorreoPrueba || Date.now() > venceCorreo || document.getElementById("codigoCorreo").value !== codigoCorreoPrueba) {
      intentosCorreo += 1;
      mensaje.textContent = intentosCorreo >= 5
        ? "Código bloqueado. Pide uno nuevo."
        : "Código incorrecto o vencido. Intentos restantes: " + (5 - intentosCorreo) + ".";
      return;
    }
    if (!limitarEnvio(mensaje, boton)) return;
    mensaje.textContent = "Correo actualizado en esta demostración.";
    codigoCorreoPrueba = "";
    evento.currentTarget.reset();
  });

  document.getElementById("formContra").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const nueva = document.getElementById("contraNueva").value;
    const mensaje = document.getElementById("mensajeContra");
    const boton = evento.currentTarget.querySelector("button");
    const valida = nueva.length >= 8 && nueva.length <= 64 && /[A-Z]/.test(nueva) && /[a-z]/.test(nueva) && /[0-9]/.test(nueva);
    if (!valida) {
      mensaje.textContent = "Usa de 8 a 64 caracteres, una mayúscula, una minúscula y un número.";
      return;
    }
    if (!limitarEnvio(mensaje, boton)) return;
    mensaje.textContent = "Contra actualizada en esta demostración.";
    evento.currentTarget.reset();
  });

  document.getElementById("guardarNotif").addEventListener("click", (evento) => {
    const mensaje = document.getElementById("mensajeNotif");
    if (!limitarEnvio(mensaje, evento.currentTarget)) return;
    localStorage.setItem("rampify_notif_estado", document.getElementById("notifEstado").checked);
    localStorage.setItem("rampify_notif_baja", document.getElementById("notifBaja").checked);
    mensaje.textContent = "Preferencias guardadas.";
  });

  const estado = localStorage.getItem("rampify_eliminar_cuenta");
  if (estado) mostrarCuentaProgramada();

  document.getElementById("botonEliminarCuenta").addEventListener("click", () => {
    if (!confirm("¿Programar la eliminación de tu cuenta dentro de 30 días?")) return;
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + 30);
    localStorage.setItem("rampify_eliminar_cuenta", fecha.toISOString());
    mostrarCuentaProgramada();
  });

  document.getElementById("botonCancelarEliminacion").addEventListener("click", () => {
    localStorage.removeItem("rampify_eliminar_cuenta");
    document.getElementById("estadoEliminacion").textContent = "Tu cuenta está activa.";
    document.getElementById("botonEliminarCuenta").hidden = false;
    document.getElementById("botonCancelarEliminacion").hidden = true;
    document.getElementById("mensajeCuenta").textContent = "Eliminación cancelada.";
  });
}

function mostrarCuentaProgramada() {
  const fecha = new Date(localStorage.getItem("rampify_eliminar_cuenta"));
  document.getElementById("estadoEliminacion").textContent = "Eliminación programada para " + fecha.toLocaleDateString("es-MX") + ".";
  document.getElementById("botonEliminarCuenta").hidden = true;
  document.getElementById("botonCancelarEliminacion").hidden = false;
}
