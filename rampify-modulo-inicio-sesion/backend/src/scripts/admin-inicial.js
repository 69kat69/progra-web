require("dotenv").config();

const bcrypt = require("bcryptjs");
const { pool } = require("../config/database");
const { validarCorreo, validarNombre, validarContra } = require("../shared/validaciones");

async function crearAdministradorInicial() {
  const nombre = process.env.ADMIN_NAME || "";
  const correo = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const contra = process.env.ADMIN_PASSWORD || "";

  if (!validarNombre(nombre, 64)) throw new Error("Configura ADMIN_NAME con un nombre válido.");
  if (!validarCorreo(correo)) throw new Error("Configura ADMIN_EMAIL con un correo válido.");
  if (!validarContra(contra)) throw new Error("ADMIN_PASSWORD debe tener 8 a 64 caracteres, mayúscula, minúscula y número.");

  const [administradores] = await pool.execute("SELECT id_usuario FROM usuario WHERE id_rol = 3 LIMIT 1");
  if (administradores.length) throw new Error("Ya existe un administrador. Usa la invitación para crear los siguientes.");

  const contraHash = await bcrypt.hash(contra, 12);
  const [resultado] = await pool.execute(
    `INSERT INTO usuario (id_rol, id_estado_cuenta, nombre, correo, contrasena_hash)
     VALUES (3, 1, ?, ?, ?)`,
    [nombre.trim(), correo, contraHash]
  );
  console.log("Administrador inicial creado. ID:", resultado.insertId);
}

crearAdministradorInicial()
  .catch((error) => {
    console.error("No se pudo crear el administrador:", error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
