// Inicio de sesión
const formularioLogin = document.getElementById("formularioLogin");

const correo = document.getElementById("correo");

const contra = document.getElementById("contra");

const mensajeLogin = document.getElementById("mensajeLogin");

const vistaLogin = document.getElementById("vistaLogin");


// Recuperación
const formularioRecuperacion = document.getElementById("formularioRecuperacion");

const correoRecuperacion = document.getElementById("correoRecuperacion");

const mensajeRecuperacion = document.getElementById("mensajeRecuperacion");

const vistaRecuperacion = document.getElementById("vistaRecuperacion");


// Revisar correo
function correoEsValido(valor) {
  const correoLimpio = valor.trim();
  const formatoCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return correoLimpio.length <= 254 && formatoCorreo.test(correoLimpio);
}


// Mostrar error
function mostrarError(campo, idError, texto) {
  campo.setAttribute("aria-invalid", "true");
  document.getElementById(idError).textContent = texto;
}


// Quitar error
function quitarError(campo, idError) {
  campo.removeAttribute("aria-invalid");
  document.getElementById(idError).textContent = "";
}


// Cambiar de pantalla
function cambiarVista(nombreVista) {
  const mostrarLogin = nombreVista === "login";

  vistaLogin.hidden = !mostrarLogin;
  vistaRecuperacion.hidden = mostrarLogin;

  if (mostrarLogin) {
    correo.focus();
  } else {
    correoRecuperacion.focus();
  }
}


// Botones para cambiar de pantalla
document.querySelectorAll("[data-vista]").forEach((boton) => {
  boton.addEventListener("click", () => {
    cambiarVista(boton.dataset.vista);
  });
});


// Mostrar u ocultar contra
function cambiarVisibilidadContra(campo, boton) {
  const mostrar = campo.type === "password";

  campo.type = mostrar ? "text" : "password";
  boton.setAttribute(
    "aria-label",
    mostrar ? "Ocultar contraseña" : "Mostrar contraseña"
  );
}


// Muestra u oculta la contraseña del inicio de sesión.
document.getElementById("botonMostrar").addEventListener("click", (evento) => {
  cambiarVisibilidadContra(contra, evento.currentTarget);
});


// Validar el inicio de sesión
formularioLogin.addEventListener("submit", (evento) => {
  evento.preventDefault();

  mensajeLogin.textContent = "";
  quitarError(correo, "errorCorreo");
  quitarError(contra, "errorContra");

  if (!correo.value.trim()) {
    mostrarError(correo, "errorCorreo", "Ingresa tu correo electrónico.");
    correo.focus();
    return;
  }

  if (!correoEsValido(correo.value)) {
    mostrarError(correo, "errorCorreo", "Ingresa un correo válido de hasta 254 caracteres.");
    correo.focus();
    return;
  }

  if (!contra.value) {
    mostrarError(contra, "errorContra", "Ingresa tu contraseña.");
    contra.focus();
    return;
  }

  if (contra.value.length < 8 || contra.value.length > 64) {
    mostrarError(
      contra,
      "errorContra",
      "La contraseña debe tener de 8 a 64 caracteres."
    );
    contra.focus();
    return;
  }

  mensajeLogin.textContent = "Formato correcto.";
});


// Cambiar paso de recuperación
function mostrarPasoRecuperacion(nombrePaso) {
  const pasos = document.querySelectorAll(".step");

  pasos.forEach((paso) => {
    paso.hidden = paso.dataset.step !== nombrePaso;
  });

  mensajeRecuperacion.textContent = "";

  if (nombrePaso === "codigo") {
    document.getElementById("codigo").focus();
  } else if (nombrePaso === "contra") {
    document.getElementById("nuevaContra").focus();
  } else {
    correoRecuperacion.focus();
  }
}


let codigoPrueba = "123456";
let intentosCodigo = 0;
let venceCodigo = 0;
let reenviosCodigo = [];
let codigoBloqueado = false;

// Revisar correo para recuperación
formularioRecuperacion.addEventListener("submit", (evento) => {
  evento.preventDefault();
  quitarError(correoRecuperacion, "errorCorreoRecuperacion");
  mensajeRecuperacion.textContent = "";

  if (!correoRecuperacion.value.trim()) {
    mostrarError(
      correoRecuperacion,
      "errorCorreoRecuperacion",
      "Ingresa el correo de tu cuenta."
    );
    correoRecuperacion.focus();
    return;
  }

  if (!correoEsValido(correoRecuperacion.value)) {
    mostrarError(
      correoRecuperacion,
      "errorCorreoRecuperacion",
      "Ingresa un correo válido de hasta 254 caracteres."
    );
    correoRecuperacion.focus();
    return;
  }

  mostrarPasoRecuperacion("codigo");
  intentosCodigo = 0;
  codigoBloqueado = false;
  codigoPrueba = "123456";
  venceCodigo = Date.now() + 10 * 60 * 1000;
  mensajeRecuperacion.textContent = "Si el correo existe, recibirá un código. Código de demostración: 123456 (dura 10 minutos).";
});


// Revisar el código de prueba
document.getElementById("botonValidarCodigo").addEventListener("click", () => {
  const codigo = document.getElementById("codigo");
  quitarError(codigo, "errorCodigo");

  if (codigoBloqueado) {
    mensajeRecuperacion.textContent = "Código bloqueado. Solicita uno nuevo.";
    return;
  }
  if (Date.now() > venceCodigo || codigo.value !== codigoPrueba) {
    intentosCodigo += 1;
    if (intentosCodigo >= 5) {
      codigoBloqueado = true;
      mostrarError(codigo, "errorCodigo", "Código bloqueado. Solicita uno nuevo.");
    } else {
      mostrarError(codigo, "errorCodigo", "Código incorrecto o vencido. Intentos restantes: " + (5 - intentosCodigo) + ".");
    }
    codigo.focus();
    return;
  }

  mostrarPasoRecuperacion("contra");
  mensajeRecuperacion.textContent = "";
});


// Volver a mostrar el código de prueba
document.getElementById("botonReenviar").addEventListener("click", () => {
  const ahora = Date.now();
  reenviosCodigo = reenviosCodigo.filter((hora) => ahora - hora < 60 * 60 * 1000);
  if (reenviosCodigo.length >= 3) {
    const minutos = Math.ceil((60 * 60 * 1000 - (ahora - reenviosCodigo[0])) / 60000);
    mensajeRecuperacion.textContent = "Límite de reenvíos alcanzado. Intenta de nuevo en " + minutos + " minutos.";
    return;
  }
  reenviosCodigo.push(ahora);
  intentosCodigo = 0;
  codigoBloqueado = false;
  venceCodigo = ahora + 10 * 60 * 1000;
  codigoPrueba = String(Math.floor(100000 + Math.random() * 900000));
  document.getElementById("codigo").value = "";
  mensajeRecuperacion.textContent = "Código reenviado. Código de demostración: " + codigoPrueba + " (dura 10 minutos).";
});


// Mostrar u ocultar contra nueva
document.getElementById("botonMostrarContra").addEventListener("click", (evento) => {
  const nuevaContra = document.getElementById("nuevaContra");
  cambiarVisibilidadContra(nuevaContra, evento.currentTarget);
});


// Guardar contra nueva
document.getElementById("botonGuardarContra").addEventListener("click", () => {
  const nuevaContra = document.getElementById("nuevaContra");
  quitarError(nuevaContra, "errorNuevaContra");

  const tieneMayuscula = /[A-Z]/.test(nuevaContra.value);
  const tieneMinuscula = /[a-z]/.test(nuevaContra.value);
  const tieneNumero = /[0-9]/.test(nuevaContra.value);
  const tieneLongitudValida =
    nuevaContra.value.length >= 8 && nuevaContra.value.length <= 64;

  if (!tieneLongitudValida || !tieneMayuscula || !tieneMinuscula || !tieneNumero) {
    mostrarError(
      nuevaContra,
      "errorNuevaContra",
      "Usa de 8 a 64 caracteres, con mayúscula, minúscula y número."
    );
    nuevaContra.focus();
    return;
  }

  codigoBloqueado = true;
  mensajeRecuperacion.textContent = "Contra actualizada en la demostración. Vuelve al inicio de sesión.";
});


// Quitar error al escribir
document.querySelectorAll("input").forEach((campo) => {
  campo.addEventListener("input", () => {
    campo.removeAttribute("aria-invalid");
  });
});


