require("dotenv").config();

const app = require("./app");
const { pool } = require("./config/database");
const { iniciarLimpiezaCuentas } = require("./services/tareas.service");

const puerto = Number(process.env.PORT || 4000);

async function iniciarServidor() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.includes("CAMBIA")) {
    console.error("Configura JWT_SECRET en backend/.env con una clave aleatoria de al menos 32 caracteres.");
    process.exit(1);
  }

  try {
    await pool.query("SELECT 1");
    console.log("Base de datos conectada.");
    iniciarLimpiezaCuentas();
    app.listen(puerto, () => console.log("API Rampify escuchando en http://localhost:" + puerto));
  } catch (error) {
    console.error("No se pudo conectar con MySQL:", error.message);
    process.exit(1);
  }
}

iniciarServidor();
