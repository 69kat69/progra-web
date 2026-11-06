const fs = require("node:fs/promises");
const path = require("node:path");

const carpetaLogs = path.join(__dirname, "../../logs");

async function guardarError(datos) {
  await fs.mkdir(carpetaLogs, { recursive: true });
  const fecha = new Date().toISOString().slice(0, 10);
  const archivo = path.join(carpetaLogs, "errores-" + fecha + ".log");
  await fs.appendFile(archivo, JSON.stringify({ fechaHora: new Date().toISOString(), ...datos }) + "\n", "utf8");
}

async function borrarLogsAntiguos() {
  await fs.mkdir(carpetaLogs, { recursive: true });
  const limite = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const archivos = await fs.readdir(carpetaLogs);
  for (const nombre of archivos) {
    if (!/^errores-\d{4}-\d{2}-\d{2}\.log$/.test(nombre)) continue;
    const ruta = path.join(carpetaLogs, nombre);
    const datos = await fs.stat(ruta);
    if (datos.mtimeMs < limite) await fs.unlink(ruta);
  }
}

module.exports = { guardarError, borrarLogsAntiguos };
