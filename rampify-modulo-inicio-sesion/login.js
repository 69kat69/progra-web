const formLogin=document.getElementById("formularioLogin");
const formRec=document.getElementById("formularioRecuperacion");
const viewLogin=document.getElementById("vistaLogin");
const viewRec=document.getElementById("vistaRecuperacion");
const correo=document.getElementById("correo");
const pass=document.getElementById("contrasena");
const msgLogin=document.getElementById("mensajeLogin");
const correoRec=document.getElementById("correoRecuperacion");
const msgRec=document.getElementById("mensajeRecuperacion");

/** Comprueba el formato y longitud máxima del correo según RF_01 y RF_02. */
function emailValid(value){const v=value.trim();return v.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)}
/** Muestra un error de campo accesible. */
function fieldError(input,id,text){input.setAttribute("aria-invalid","true");document.getElementById(id).textContent=text}
/** Borra el mensaje de error de un campo. */
function clearError(input,id){input.removeAttribute("aria-invalid");document.getElementById(id).textContent=""}
/** Alterna las vistas de inicio de sesión y recuperación. */
function switchView(name){const login=name==="login";viewLogin.hidden=!login;viewRec.hidden=login;(login?correo:correoRec).focus()}
document.querySelectorAll("[data-vista]").forEach(button=>button.addEventListener("click",()=>switchView(button.dataset.vista)));

document.getElementById("botonMostrar").addEventListener("click",()=>{const show=pass.type==="password";pass.type=show?"text":"password";document.getElementById("botonMostrar").setAttribute("aria-label",show?"Ocultar contraseña":"Mostrar contraseña")});
formLogin.addEventListener("submit",event=>{event.preventDefault();msgLogin.textContent="";msgLogin.className="message";clearError(correo,"errorCorreo");clearError(pass,"errorContrasena");
 if(!correo.value.trim())return fieldError(correo,"errorCorreo","Ingresa tu correo electrónico."),correo.focus();
 if(!emailValid(correo.value))return fieldError(correo,"errorCorreo","Ingresa un correo válido de hasta 254 caracteres."),correo.focus();
 if(!pass.value)return fieldError(pass,"errorContrasena","Ingresa tu contraseña."),pass.focus();
 if(pass.value.length<8||pass.value.length>64)return fieldError(pass,"errorContrasena","La contraseña debe tener de 8 a 64 caracteres."),pass.focus();
 msgLogin.textContent="El formato es válido. La autenticación estará disponible al integrar el servidor.";
});

/** Presenta el paso activo del flujo de recuperación RF_02. */
function showStep(step){document.querySelectorAll(".step").forEach(panel=>panel.hidden=panel.dataset.step!==step);msgRec.textContent="";(step==="codigo"?document.getElementById("codigo"):step==="contrasena"?document.getElementById("nuevaContrasena"):correoRec).focus()}
formRec.addEventListener("submit",event=>{event.preventDefault();clearError(correoRec,"errorCorreoRecuperacion");msgRec.textContent="";
 if(!correoRec.value.trim()||!emailValid(correoRec.value)){fieldError(correoRec,"errorCorreoRecuperacion",correoRec.value.trim()?"Ingresa un correo válido de hasta 254 caracteres.":"Ingresa el correo de tu cuenta.");correoRec.focus();return}
 showStep("codigo");msgRec.textContent="Vista previa: no se envió un correo. El envío real requiere integrar el servidor.";
});
document.getElementById("botonValidarCodigo").addEventListener("click",()=>{const code=document.getElementById("codigo");clearError(code,"errorCodigo");if(!/^\d{6}$/.test(code.value)){fieldError(code,"errorCodigo","Ingresa los 6 dígitos del código.");code.focus();return}showStep("contrasena");msgRec.textContent="Vista previa: el código no se validó con un servidor."});
document.getElementById("botonReenviar").addEventListener("click",()=>{msgRec.textContent="El reenvío del código se habilitará al integrar el servidor."});
document.getElementById("botonMostrarNueva").addEventListener("click",()=>{const input=document.getElementById("nuevaContrasena"),show=input.type==="password";input.type=show?"text":"password";document.getElementById("botonMostrarNueva").setAttribute("aria-label",show?"Ocultar contraseña":"Mostrar contraseña")});
document.getElementById("botonGuardarContrasena").addEventListener("click",()=>{const input=document.getElementById("nuevaContrasena");clearError(input,"errorNuevaContrasena");if(input.value.length<8||input.value.length>64||!/[A-Z]/.test(input.value)||!/[a-z]/.test(input.value)||!/[0-9]/.test(input.value)){fieldError(input,"errorNuevaContrasena","Usa de 8 a 64 caracteres, con mayúscula, minúscula y número.");input.focus();return}msgRec.textContent="Vista previa: la contraseña no se actualizó. Esta acción requiere integrar el servidor."});
document.querySelectorAll("input").forEach(input=>input.addEventListener("input",()=>input.removeAttribute("aria-invalid")));
