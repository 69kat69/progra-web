import { iniciarReportes } from "./reportes.js";
import { iniciarSolicitudes } from "./solicitudes.js";
import { iniciarPerfil } from "./perfil.js";
import { iniciarCatalogos } from "./catalogos.js";
import { iniciarOrganizaciones } from "./organizaciones.js";
import { iniciarUsuarios } from "./usuarios.js";
import { iniciarDashboard } from "./dashboard.js";

const nombresRoles = {
  ciudadano: "Usuario de la app",
  empleado: "Empleado de la asociación",
  admin: "Administrador"
};

function cambiarPantalla(id) {
  document.querySelectorAll(".pantalla").forEach((pantalla) => {
    pantalla.classList.toggle("activa", pantalla.id === id);
  });
  document.querySelectorAll("nav button").forEach((boton) => {
    boton.classList.toggle("seleccionado", boton.dataset.seccion === id);
  });
}

function cambiarRol(rol) {
  localStorage.setItem("rampify_rol", rol);
  document.getElementById("nombreRol").textContent = nombresRoles[rol];
  document.querySelectorAll("nav button").forEach((boton) => {
    const roles = (boton.dataset.roles || "ciudadano,empleado,admin").split(",");
    boton.hidden = !roles.includes(rol);
  });
  cambiarPantalla("inicio");
  document.getElementById("navegacion").querySelector("button:not([hidden])")?.click();
}

document.getElementById("linkSalir").addEventListener("click", () => {
  localStorage.removeItem("rampify_rol");
});

document.querySelectorAll("nav button").forEach((boton) => {
  boton.addEventListener("click", () => cambiarPantalla(boton.dataset.seccion));
});

document.getElementById("rolDemo").addEventListener("change", (evento) => {
  cambiarRol(evento.target.value);
});

iniciarReportes();
iniciarSolicitudes();
iniciarPerfil();
iniciarCatalogos();
iniciarOrganizaciones();
iniciarUsuarios();
iniciarDashboard();

const rolGuardado = localStorage.getItem("rampify_rol") || "ciudadano";
document.getElementById("rolDemo").value = rolGuardado;
cambiarRol(rolGuardado);
