import { cargarDatos, guardarDatos, crearFolio, reportesIniciales, tiposIniciales, limitarEnvio } from "./datos.js";
import { escapar } from "./texto.js";

let reportes = cargarDatos("reportes", reportesIniciales);
let tipos = cargarDatos("tipos", tiposIniciales);

function llenarTipos() {
  const selector = document.getElementById("tipoReporte");
  const filtro = document.getElementById("filtroTipo");
  const denuncia = document.getElementById("reporteDenunciado");
  selector.innerHTML = "<option value=''>Elige una opción</option>" + tipos.filter((tipo) => tipo.activo !== false).map((tipo) => `<option>${escapar(tipo.nombre || tipo)}</option>`).join("");
  filtro.innerHTML = "<option value=''>Todos los tipos</option>" + tipos.filter((tipo) => tipo.activo !== false).map((tipo) => `<option>${escapar(tipo.nombre || tipo)}</option>`).join("");
  denuncia.innerHTML = reportes.filter((reporte) => !reporte.eliminado).map((reporte) => `<option>${escapar(reporte.folio)}</option>`).join("");
}

function dibujarReportes() {
  const cuerpo = document.getElementById("listaReportes");
  const buscar = document.getElementById("buscarReporte").value.toLowerCase();
  const estado = document.getElementById("filtroEstado").value;
  const tipo = document.getElementById("filtroTipo").value;
  const rol = localStorage.getItem("rampify_rol") || "ciudadano";
  const visibles = reportes.filter((reporte) => {
    const texto = (reporte.folio + " " + reporte.descripcion).toLowerCase();
    const esCercano = document.getElementById("filtroVistaCiudadano").value === "cercanos";
    const esMio = rol !== "ciudadano" || esCercano || reporte.mio;
    return !reporte.eliminado && texto.includes(buscar) && (!estado || reporte.estado === estado) && (!tipo || reporte.tipo === tipo) && esMio;
  });

  cuerpo.innerHTML = visibles.map((reporte) => {
    const botones = rol === "empleado"
      ? `<select data-cambio="${escapar(reporte.folio)}"><option>${escapar(reporte.estado)}</option><option>Pendiente</option><option>En proceso</option><option>Solucionado</option></select>`
      : rol === "admin"
        ? `<button data-rechazar="${escapar(reporte.folio)}">Rechazar</button><button data-eliminar="${escapar(reporte.folio)}">Eliminar</button>`
        : "Ver";
    return `<tr><td>${escapar(reporte.folio)}</td><td>${escapar(reporte.tipo)}</td><td>${escapar(reporte.descripcion)}</td><td><span class="estado">${escapar(reporte.estado)}</span></td><td>${escapar(reporte.fecha)}</td><td class="acciones">${botones}</td></tr>`;
  }).join("");

  document.getElementById("sinReportes").hidden = visibles.length > 0;
  document.getElementById("vistaCiudadano").hidden = rol !== "ciudadano";
  document.getElementById("totalReportes").textContent = reportes.length;
  document.getElementById("totalPendientes").textContent = reportes.filter((r) => r.estado === "Pendiente").length;
  document.getElementById("totalProceso").textContent = reportes.filter((r) => r.estado === "En proceso").length;

  cuerpo.querySelectorAll("[data-rechazar]").forEach((boton) => boton.addEventListener("click", () => {
    const criterio = prompt("Escribe el motivo: Incumple Términos y Condiciones, Sin barrera de accesibilidad en la imagen o Descripción ilegible.");
    const opciones = ["Incumple Términos y Condiciones", "Sin barrera de accesibilidad en la imagen", "Descripción ilegible"];
    if (!opciones.includes(criterio)) return alert("Elige uno de los motivos permitidos.");
    const reporte = reportes.find((r) => r.folio === boton.dataset.rechazar);
    if (reporte) { reporte.estado = "Rechazado"; reporte.criterio = criterio; guardarDatos("reportes", reportes); dibujarReportes(); }
  }));
  cuerpo.querySelectorAll("[data-eliminar]").forEach((boton) => boton.addEventListener("click", () => {
    const motivo = prompt("Motivo de eliminación: Solicitud del autor, Incumple Términos y Condiciones, Sin barrera de accesibilidad en la imagen o Descripción ilegible.");
    const motivos = ["Solicitud del autor", "Incumple Términos y Condiciones", "Sin barrera de accesibilidad en la imagen", "Descripción ilegible"];
    if (!motivos.includes(motivo)) return alert("Elige un motivo permitido.");
    if (!confirm("¿Confirmas la eliminación lógica del reporte?")) return;
    const reporte = reportes.find((r) => r.folio === boton.dataset.eliminar);
    if (reporte) { reporte.eliminado = true; reporte.motivoEliminacion = motivo; }
    guardarDatos("reportes", reportes);
    dibujarReportes();
  }));
  cuerpo.querySelectorAll("[data-cambio]").forEach((selector) => {
    selector.addEventListener("change", () => {
      const reporte = reportes.find((r) => r.folio === selector.dataset.cambio);
      if (reporte) {
        reporte.estado = selector.value;
        guardarDatos("reportes", reportes);
        dibujarReportes();
      }
    });
  });
}

function crearReporte(evento) {
  evento.preventDefault();
  const form = evento.currentTarget;
  const boton = form.querySelector("button[type=submit]");
  const mensaje = document.getElementById("mensajeCrear");
  const descripcion = document.getElementById("descripcionReporte");
  const imagen = document.getElementById("imagenReporte").files[0];
  const latitud = Number(document.getElementById("latitud").value);
  const longitud = Number(document.getElementById("longitud").value);

  if (descripcion.value.trim().length < 10 || descripcion.value.length > 500) {
    mensaje.textContent = "La descripción debe tener de 10 a 500 caracteres.";
    return;
  }
  if (!imagen || !["image/jpeg", "image/png"].includes(imagen.type) || imagen.size > 5 * 1024 * 1024) {
    mensaje.textContent = "Selecciona una imagen JPG o PNG de máximo 5 MB.";
    return;
  }
  if (latitud < -90 || latitud > 90 || longitud < -180 || longitud > 180) {
    mensaje.textContent = "Revisa las coordenadas de la ubicación.";
    return;
  }
  if (!limitarEnvio(mensaje, boton)) return;

  reportes.unshift({
    folio: crearFolio(),
    tipo: document.getElementById("tipoReporte").value,
    descripcion: descripcion.value.trim(),
    estado: "Pendiente",
    fecha: new Date().toISOString().slice(0, 10),
    latitud,
    longitud,
    mio: true
  });
  guardarDatos("reportes", reportes);
  form.reset();
  document.getElementById("latitud").value = "19.4326";
  document.getElementById("longitud").value = "-99.1332";
  mensaje.textContent = "Reporte guardado en esta demostración. Folio: " + reportes[0].folio;
  dibujarReportes();
}

export function iniciarReportes() {
  llenarTipos();
  dibujarReportes();
  document.getElementById("formCrearReporte").addEventListener("submit", crearReporte);
  document.getElementById("filtroVistaCiudadano").addEventListener("change", dibujarReportes);
  document.getElementById("formDenuncia").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const mensaje = document.getElementById("mensajeDenuncia");
    const boton = evento.currentTarget.querySelector("button");
    if (!limitarEnvio(mensaje, boton)) return;
    mensaje.textContent = "Denuncia guardada en esta demostración.";
    evento.currentTarget.reset();
  });
  ["buscarReporte", "filtroEstado", "filtroTipo"].forEach((id) => {
    document.getElementById(id).addEventListener("input", dibujarReportes);
  });
  document.getElementById("imagenReporte").addEventListener("change", (evento) => {
    const archivo = evento.target.files[0];
    const vista = document.getElementById("previewImagen");
    if (!archivo || !["image/jpeg", "image/png"].includes(archivo.type) || archivo.size > 5 * 1024 * 1024) {
      vista.hidden = true;
      return;
    }
    vista.src = URL.createObjectURL(archivo);
    vista.hidden = false;
  });

  document.getElementById("descripcionReporte").addEventListener("input", (evento) => {
    document.getElementById("contadorDescripcion").textContent = evento.target.value.length + " / 500";
  });
}
