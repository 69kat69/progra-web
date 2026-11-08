export const tiposIniciales = [
  "Rampas obstruidas",
  "Veredas en mal estado",
  "Semáforos sin audio",
  "Cruces peatonales peligrosos"
];

export const reportesIniciales = [
  { folio: "RMP-00001001", tipo: "Rampas obstruidas", descripcion: "Hay una rampa bloqueada por un automóvil.", estado: "Pendiente", fecha: "2026-11-04", latitud: 19.4326, longitud: -99.1332, mio: true },
  { folio: "RMP-00001002", tipo: "Veredas en mal estado", descripcion: "La banqueta está rota y dificulta el paso.", estado: "En proceso", fecha: "2026-11-03", latitud: 19.4350, longitud: -99.1400, mio: false },
  { folio: "RMP-00001003", tipo: "Semáforos sin audio", descripcion: "El cruce no tiene señal audible.", estado: "Solucionado", fecha: "2026-11-02", latitud: 19.4280, longitud: -99.1300, mio: true }
];

export const empleadosIniciales = [
  { nombre: "Mariana López", correo: "mariana@ejemplo.com", estado: "Pendiente de autorización" },
  { nombre: "Diego Torres", correo: "diego@ejemplo.com", estado: "Pendiente de autorización" },
  { nombre: "Elena Ruiz", correo: "elena@ejemplo.com", estado: "Activa" }
];

export const usuariosIniciales = [
  { nombre: "Ana Pérez", correo: "ana@ejemplo.com", estado: "Activa", diasInactivo: 400 },
  { nombre: "Luis Gómez", correo: "luis@ejemplo.com", estado: "Activa" },
  { nombre: "Sofía Ruiz", correo: "sofia@ejemplo.com", estado: "Suspendida" }
];

export function cargarDatos(clave, iniciales) {
  const guardado = localStorage.getItem("rampify_" + clave);
  return guardado ? JSON.parse(guardado) : structuredClone(iniciales);
}

export function guardarDatos(clave, datos) {
  localStorage.setItem("rampify_" + clave, JSON.stringify(datos));
}

export function crearFolio() {
  const numero = Math.floor(10000000 + Math.random() * 90000000);
  return "RMP-" + numero;
}

export function limitarEnvio(mensaje, boton) {
  const ahora = Date.now();
  let envios = JSON.parse(sessionStorage.getItem("rampify_envios") || "[]");
  envios = envios.filter((hora) => ahora - hora < 60000);
  const bloqueo = Number(sessionStorage.getItem("rampify_bloqueo") || 0);
  if (bloqueo && ahora >= bloqueo) {
    sessionStorage.removeItem("rampify_bloqueo");
    envios = [];
    sessionStorage.setItem("rampify_envios", "[]");
  }

  if (ahora < bloqueo) {
    iniciarCuenta(boton, mensaje, bloqueo);
    return false;
  }

  if (envios.length >= 5) {
    const nuevoBloqueo = ahora + 30000;
    sessionStorage.setItem("rampify_bloqueo", nuevoBloqueo);
    iniciarCuenta(boton, mensaje, nuevoBloqueo);
    return false;
  }

  envios.push(ahora);
  sessionStorage.setItem("rampify_envios", JSON.stringify(envios));
  if (envios.length >= 5) {
    const nuevoBloqueo = ahora + 30000;
    sessionStorage.setItem("rampify_bloqueo", nuevoBloqueo);
    setTimeout(() => iniciarCuenta(boton, mensaje, nuevoBloqueo), 0);
  }
  return true;
}

function iniciarCuenta(boton, mensaje, termina) {
  boton.disabled = true;
  const actualizar = () => {
    const segundos = Math.ceil((termina - Date.now()) / 1000);
    if (segundos <= 0) {
      boton.disabled = false;
      mensaje.textContent = "Ya puedes volver a enviar.";
      return;
    }
    mensaje.textContent = "Espera " + segundos + " segundos antes de enviar otra vez.";
    setTimeout(actualizar, 1000);
  };
  actualizar();
}
