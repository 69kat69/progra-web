import { cargarDatos, guardarDatos, usuariosIniciales, limitarEnvio } from "./datos.js";
import { escapar } from "./texto.js";

let usuarios = cargarDatos("usuarios", usuariosIniciales);

function dibujarUsuarios() {
  document.getElementById("listaUsuarios").innerHTML = usuarios.map((usuario, indice) => `
    <tr><td>${escapar(usuario.nombre)}</td><td>${escapar(usuario.correo)}</td><td>${escapar(usuario.estado)}</td>
    <td class="acciones"><button data-suspender="${indice}">Suspender</button><button data-banear="${indice}">Banear</button><button data-eliminar="${indice}">Eliminar datos</button></td></tr>
  `).join("");
  document.querySelectorAll("[data-suspender]").forEach((b) => b.addEventListener("click", () => cambiarEstado(Number(b.dataset.suspender), "Suspendida")));
  document.querySelectorAll("[data-banear]").forEach((b) => b.addEventListener("click", () => cambiarEstado(Number(b.dataset.banear), "Baneada")));
  document.querySelectorAll("[data-eliminar]").forEach((b) => b.addEventListener("click", () => eliminarDatos(Number(b.dataset.eliminar))));
}

function cambiarEstado(indice, estado) {
  const usuario = usuarios[indice];
  if (usuario.estado !== "Activa") return alert("Solo se banean cuentas Activas.");
  const motivo = prompt("Motivo: Inactividad de más de 365 días o Mal uso de la app.");
  if (!["Inactividad de más de 365 días", "Mal uso de la app"].includes(motivo)) return alert("Elige uno de los motivos permitidos.");
  if (motivo === "Inactividad de más de 365 días" && (usuario.diasInactivo || 0) <= 365) return alert("La cuenta todavía no supera 365 días de inactividad.");
  if (!confirm("¿Banear a " + usuario.nombre + "?")) return;
  usuario.estado = estado;
  usuario.motivo = motivo;
  guardarDatos("usuarios", usuarios);
  dibujarUsuarios();
}

function eliminarDatos(indice) {
  const usuario = usuarios[indice];
  if (!["Activa", "Suspendida", "Baneada"].includes(usuario.estado)) return alert("No se puede eliminar esta cuenta.");
  const contraAdmin = prompt("Confirma la acción con la contra del administrador:");
  if (!contraAdmin) return;
  if (!confirm("Se quitarán los datos personales de esta demostración. ¿Continuar?")) return;
  usuarios[indice].nombre = "Usuario eliminado";
  usuarios[indice].correo = "";
  usuarios[indice].estado = "Eliminada";
  guardarDatos("usuarios", usuarios);
  dibujarUsuarios();
}

export function iniciarUsuarios() {
  document.getElementById("usuarioAlerta").innerHTML = usuarios.filter((u) => u.estado === "Activa").map((u, i) => `<option value="${i}">${escapar(u.nombre)} (${escapar(u.correo)})</option>`).join("");
  dibujarUsuarios();
  document.getElementById("formAlerta").addEventListener("submit", (evento) => {
    evento.preventDefault();
    const mensaje = document.getElementById("mensajeAlerta");
    const boton = evento.currentTarget.querySelector("button");
    const texto = document.getElementById("textoAlerta").value.trim();
    if (texto.length < 10 || texto.length > 300) return mensaje.textContent = "Escribe de 10 a 300 caracteres.";
    const persona = usuarios[Number(document.getElementById("usuarioAlerta").value)];
    if (!persona || persona.estado !== "Activa") return mensaje.textContent = "Solo se alertan cuentas Activas.";
    if (!limitarEnvio(mensaje, boton)) return;
    mensaje.textContent = "Alerta de muestra enviada a " + persona.nombre + ".";
    evento.currentTarget.reset();
  });
}
