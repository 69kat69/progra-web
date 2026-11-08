import { cargarDatos, reportesIniciales, tiposIniciales, usuariosIniciales } from "./datos.js";
import { escapar } from "./texto.js";

let reportes = cargarDatos("reportes", reportesIniciales);

function mostrarBarras(contenedor, grupos) {
  const maximo = Math.max(1, ...Object.values(grupos));
  contenedor.innerHTML = Object.entries(grupos).map(([nombre, cantidad]) => {
    const ancho = Math.max(12, Math.round(cantidad / maximo * 100));
    return `<div class="barra" style="width:${ancho}%">${escapar(nombre)}: ${cantidad}</div>`;
  }).join("");
}

function actualizarDashboard() {
  reportes = cargarDatos("reportes", reportesIniciales);
  const estado = document.getElementById("filtroDashboard").value;
  const desde = document.getElementById("fechaDesde").value;
  const hasta = document.getElementById("fechaHasta").value;
  const tipo = document.getElementById("tipoDashboard").value;
  const mensaje = document.getElementById("mensajeDashboard");

  if (desde && hasta && hasta < desde) {
    mensaje.textContent = "La fecha final es anterior a la fecha inicial.";
    return;
  }

  const visibles = reportes.filter((r) => (!estado || r.estado === estado) && (!desde || r.fecha >= desde) && (!hasta || r.fecha <= hasta) && (!tipo || r.tipo === tipo));
  mensaje.textContent = visibles.length ? "" : "No hay datos para el filtro seleccionado.";
  document.getElementById("dashTotal").textContent = visibles.length;
  document.getElementById("dashActivos").textContent = visibles.filter((r) => r.estado === "Pendiente" || r.estado === "En proceso").length;
  const cuentas = JSON.parse(localStorage.getItem("rampify_usuarios") || "null") || usuariosIniciales;
  const personal = JSON.parse(localStorage.getItem("rampify_empleados") || "[]");
  const activas = cuentas.filter((u) => u.estado === "Activa").length + personal.filter((u) => u.estado === "Activa").length;
  document.getElementById("usuariosActivos").textContent = activas;

  const porEstado = { Pendiente: 0, "En proceso": 0, Solucionado: 0, Rechazado: 0 };
  const porTipo = {};
  visibles.forEach((r) => {
    porEstado[r.estado] = (porEstado[r.estado] || 0) + 1;
    porTipo[r.tipo] = (porTipo[r.tipo] || 0) + 1;
  });
  mostrarBarras(document.getElementById("barrasEstado"), porEstado);
  mostrarBarras(document.getElementById("barrasTipo"), porTipo);
  const porDia = {};
  visibles.forEach((r) => { porDia[r.fecha] = (porDia[r.fecha] || 0) + 1; });
  const dias = Object.entries(porDia).sort(([fechaA], [fechaB]) => fechaA.localeCompare(fechaB));
  const puntos = dias.map(([, cantidad], indice) => {
    const x = dias.length < 2 ? 300 : indice * 600 / (dias.length - 1);
    const y = 140 - cantidad / Math.max(1, ...dias.map((dato) => dato[1])) * 110;
    return x + "," + y;
  }).join(" ");
  document.getElementById("graficaDias").innerHTML = `<polyline points="${puntos}" fill="none" stroke="#205f4b" stroke-width="4" />`;

}

export function iniciarDashboard() {
  const tipos = JSON.parse(localStorage.getItem("rampify_tipos") || "null") || tiposIniciales;
  document.getElementById("tipoDashboard").innerHTML += tipos.filter((t) => t.activo !== false).map((t) => `<option>${escapar(t.nombre || t)}</option>`).join("");
  const hoy = new Date();
  const mesAntes = new Date(hoy);
  mesAntes.setDate(hoy.getDate() - 29);
  document.getElementById("fechaDesde").value = mesAntes.toISOString().slice(0, 10);
  document.getElementById("fechaHasta").value = hoy.toISOString().slice(0, 10);
  document.getElementById("aplicarFiltro").addEventListener("click", actualizarDashboard);
  actualizarDashboard();
}
