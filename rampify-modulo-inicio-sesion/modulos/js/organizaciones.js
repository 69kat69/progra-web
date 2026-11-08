import { cargarDatos, guardarDatos, empleadosIniciales, limitarEnvio } from "./datos.js";
import { escapar } from "./texto.js";

let empleados = cargarDatos("empleados", empleadosIniciales);

function dibujarEmpleados() {
  document.getElementById("listaEmpleados").innerHTML = empleados.map((empleado, indice) => {
    let botones = "";
    if (empleado.estado === "Pendiente de autorización") {
      botones = `<button data-aceptar="${indice}">Aprobar</button><button data-negar="${indice}">Rechazar</button>`;
    } else if (empleado.estado === "Activa") {
      botones = `<button data-suspender="${indice}">Suspender</button><button data-baja="${indice}">Dar de baja</button>`;
    }
    return `<tr><td>${escapar(empleado.nombre)}</td><td>${escapar(empleado.correo)}</td><td>${escapar(empleado.estado)}</td><td class="acciones">${botones}</td></tr>`;
  }).join("");

  document.querySelectorAll("[data-aceptar]").forEach((b) => b.addEventListener("click", () => cambiarEstado(Number(b.dataset.aceptar), "Activa")));
  document.querySelectorAll("[data-negar]").forEach((b) => b.addEventListener("click", () => cambiarEstado(Number(b.dataset.negar), "Rechazada")));
  document.querySelectorAll("[data-suspender]").forEach((b) => b.addEventListener("click", () => cambiarEstado(Number(b.dataset.suspender), "Suspendida")));
  document.querySelectorAll("[data-baja]").forEach((b) => b.addEventListener("click", () => cambiarEstado(Number(b.dataset.baja), "Eliminada")));
}

function cambiarEstado(indice, estado) {
  const empleado = empleados[indice];
  if (estado === "Rechazada") {
    const motivo = prompt("Motivo del rechazo (10 a 200 caracteres):");
    if (!motivo || motivo.trim().length < 10 || motivo.trim().length > 200) return alert("Escribe un motivo de 10 a 200 caracteres.");
    empleado.motivo = motivo.trim();
  }
  if (estado === "Suspendida") {
    const dias = Number(prompt("Días de suspensión (1 a 365):"));
    if (!Number.isInteger(dias) || dias < 1 || dias > 365) return alert("La suspensión debe durar de 1 a 365 días.");
    empleado.diasSuspension = dias;
  }
  if (!confirm("¿Cambiar el estado a " + estado + "?")) return;
  empleado.estado = estado;
  guardarDatos("empleados", empleados);
  dibujarEmpleados();
}

export function iniciarOrganizaciones() {
  dibujarEmpleados();
  document.getElementById("formInvitacion").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const boton = evento.currentTarget.querySelector("button");
    const mensaje = document.getElementById("mensajeInvitacion");
    if (!limitarEnvio(mensaje, boton)) return;
    const correo = document.getElementById("correoInvitacion").value.trim();
    const token = "RMP-" + Math.floor(10000000 + Math.random() * 90000000);
    const invitaciones = JSON.parse(localStorage.getItem("rampify_invitaciones") || "[]");
    invitaciones.push({ correo, token, vence: Date.now() + 24 * 60 * 60 * 1000, usada: false });
    localStorage.setItem("rampify_invitaciones", JSON.stringify(invitaciones));
    mensaje.textContent = "Invitación de muestra: " + token + ". Vence en 24 horas y sirve una vez.";
    evento.currentTarget.reset();
  });
}
