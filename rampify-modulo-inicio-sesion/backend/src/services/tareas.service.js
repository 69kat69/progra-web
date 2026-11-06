const service = require("../modules/profile/profile.service");
const { borrarLogsAntiguos } = require("./logs.service");
const { pool } = require("../config/database");

async function iniciarTareas() {
  const eliminadas = await service.limpiarCuentasVencidas();
  if (eliminadas) console.log("Cuentas eliminadas por plazo:", eliminadas);
  const [resultado] = await pool.execute(
    `UPDATE sancion_cuenta s JOIN usuario u ON u.id_usuario = s.id_usuario
        SET u.id_estado_cuenta = 1, s.activa = 0
      WHERE s.tipo = 'Suspensión' AND s.activa = 1
        AND s.fecha_fin <= UTC_TIMESTAMP() AND u.id_estado_cuenta = 3`
  );
  if (resultado.affectedRows) console.log("Suspensiones vencidas:", resultado.affectedRows);
  await borrarLogsAntiguos();
}

function iniciarLimpiezaCuentas() {
  iniciarTareas().catch((error) => console.error("Error en tareas programadas:", error.message));
  setInterval(() => {
    iniciarTareas().catch((error) => console.error("Error en tareas programadas:", error.message));
  }, 60 * 60 * 1000);
}

module.exports = { iniciarLimpiezaCuentas };
