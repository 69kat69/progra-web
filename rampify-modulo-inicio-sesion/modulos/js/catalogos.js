import { cargarDatos, guardarDatos, tiposIniciales, limitarEnvio } from "./datos.js";
import { escapar } from "./texto.js";

let tipos = cargarDatos("tipos", tiposIniciales);

function dibujarCatalogo() {
  document.getElementById("listaCatalogo").innerHTML = tipos.map((tipo, indice) => `
    <tr><td>${escapar(tipo.nombre || tipo)}</td><td>${tipo.activo === false ? "Inactivo" : "Activo"}</td>
    <td class="acciones"><button data-editar="${indice}">Editar</button><button data-borrar="${indice}">Eliminar</button></td></tr>
  `).join("");
  llenarSelectores();
  document.querySelectorAll("[data-editar]").forEach((b) => b.addEventListener("click", () => editar(Number(b.dataset.editar))));
  document.querySelectorAll("[data-borrar]").forEach((b) => b.addEventListener("click", () => eliminar(Number(b.dataset.borrar))));
}

function llenarSelectores() {
  const opciones = tipos.filter((t) => t.activo !== false).map((t) => t.nombre || t);
  const selector = document.getElementById("tipoReporte");
  const filtro = document.getElementById("filtroTipo");
  if (selector) selector.innerHTML = "<option value=''>Elige una opción</option>" + opciones.map((t) => `<option>${t}</option>`).join("");
  if (filtro) filtro.innerHTML = "<option value=''>Todos los tipos</option>" + opciones.map((t) => `<option>${t}</option>`).join("");
}

function editar(indice) {
  const viejo = tipos[indice].nombre || tipos[indice];
  const nuevo = prompt("Escribe el nuevo nombre (2 a 60 caracteres):", viejo);
  if (!nuevo) return;
  const nombre = nuevo.trim();
  if (nombre.length < 2 || nombre.length > 60) return alert("El nombre debe tener de 2 a 60 caracteres.");
  if (tipos.some((t, i) => i !== indice && (t.nombre || t).toLowerCase() === nombre.toLowerCase())) return alert("El elemento ya existe.");
  tipos[indice] = { nombre, activo: true };
  guardarDatos("tipos", tipos);
  dibujarCatalogo();
}

function eliminar(indice) {
  if (!confirm("¿Quitar este tipo de las opciones?")) return;
  tipos[indice] = { nombre: tipos[indice].nombre || tipos[indice], activo: false };
  guardarDatos("tipos", tipos);
  dibujarCatalogo();
}

export function iniciarCatalogos() {
  document.getElementById("formCatalogo").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const boton = evento.currentTarget.querySelector("button");
    const mensaje = document.getElementById("mensajeCatalogo");
    const nombre = document.getElementById("nombreTipo").value.trim();
    if (nombre.length < 2 || nombre.length > 60) return alert("El nombre debe tener de 2 a 60 caracteres.");
    if (tipos.some((t) => (t.nombre || t).toLowerCase() === nombre.toLowerCase())) return alert("El elemento ya existe.");
    if (!limitarEnvio(mensaje, boton)) return;
    tipos.push({ nombre, activo: true });
    guardarDatos("tipos", tipos);
    mensaje.textContent = "Tipo agregado.";
    evento.currentTarget.reset();
    dibujarCatalogo();
  });
  dibujarCatalogo();
}
