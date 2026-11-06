const nodemailer = require("nodemailer");

async function enviarCorreo(destino, asunto, texto) {
  if (!process.env.MAIL_HOST || !process.env.MAIL_USER || !process.env.MAIL_PASSWORD) {
    if (process.env.NODE_ENV === "development") {
      console.log("Código de correo de desarrollo para", destino, ":", texto);
      return;
    }
    throw new Error("El servicio de correo no está configurado.");
  }

  const transportador = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 587),
    secure: Number(process.env.MAIL_PORT) === 465,
    auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASSWORD }
  });

  await transportador.sendMail({ from: process.env.MAIL_FROM, to: destino, subject: asunto, text });
}

module.exports = { enviarCorreo };
