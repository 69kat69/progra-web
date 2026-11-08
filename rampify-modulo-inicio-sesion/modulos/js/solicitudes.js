import { cargarDatos, guardarDatos, reportesIniciales, limitarEnvio } from "./datos.js";
import { escapar } from "./texto.js";

let reportes = cargarDatos("reportes", reportesIniciales);
let solicitudes = cargarDatos("solicitudes", []);

function dibujarSolicitudes() {
  const selector = document.getElementById("reporteSolicitud");
  const propios = reportes.filter((r) => r.mio);
  selector.innerHTML = propios.map((r) => `<option value="${r.folio}">${r.folio}</option>`).join("");

  document.getElementById("listaSolicitudes").innerHTML = solicitudes.map((s, indice) => {
    const botones = localStorage.getItem("rampify_rol") === "admin" && s.estado === "Pendiente"
      ? `<button data-aprobar="${indice}">Aprobar</button><button data-rechazar="${indice}">Rechazar</button>`
      : "";
    return `<tr><td>${escapar(s.folio)}</td><td>${escapar(s.motivo)}</td><td>${escapar(s.estado)}</td><td class="acciones">${botones}</td></tr>`;
  }).join("");

  document.querySelectorAll("[data-aprobar]").forEach((b) => b.addEventListener("click", () => resolver(Number(b.dataset.aprobar), "Aprobada")));
  document.querySelectorAll("[data-rechazar]").forEach((b) => b.addEventListener("click", () => resolver(Number(b.dataset.rechazar), "Rechazada")));
}

function resolver(indice, estado) {
  if (estado === "Rechazada") {
    const motivo = prompt("Escribe el motivo del rechazo (10 a 200 caracteres):");
    if (!motivo || motivo.trim().length < 10 || motivo.trim().length > 200) return alert("El motivo debe tener de 10 a 200 caracteres.");
    solicitudes[indice].motivoRechazo = motivo.trim();
  }
  if (estado === "Aprobada") {
    const reporte = reportes.find((r) => r.folio === solicitudes[indice].folio);
    if (reporte) reporte.eliminado = true;
    guardarDatos("reportes", reportes);
  }
  solicitudes[indice].estado = estado;
  guardarDatos("solicitudes", solicitudes);
  dibujarSolicitudes();
}

export function iniciarSolicitudes() {
  document.getElementById("formSolicitud").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const boton = evento.currentTarget.querySelector("button");
    const mensaje = document.getElementById("mensajeSolicitud");
    const motivo = document.getElementById("motivoSolicitud").value.trim();
    if (motivo.length < 10 || motivo.length > 300) {
      mensaje.textContent = "El motivo debe tener de 10 a 300 caracteres.";
      return;
    }
    if (!limitarEnvio(mensaje, boton)) return;
    solicitudes.push({ folio: document.getElementById("reporteSolicitud").value, motivo, estado: "Pendiente" });
    guardarDatos("solicitudes", solicitudes);
    mensaje.textContent = "Solicitud agregada a la demostración.";
    evento.currentTarget.reset();
    dibujarSolicitudes();
  });
  dibujarSolicitudes();
}
