const jwt = require("jsonwebtoken");
const envios = new Map();
const MINUTO = 60 * 1000;
const BLOQUEO = 30 * 1000;

function limitarPeticiones(req, res, next) {
  if (req.method === "OPTIONS") return next();
  const ahora = Date.now();
  let id = "";
  const cabecera = req.headers.authorization || "";
  if (cabecera.startsWith("Bearer ")) {
    try { id = String(jwt.verify(cabecera.slice(7), process.env.JWT_SECRET).id); } catch (error) { id = ""; }
  }
  const llave = id ? "usuario:" + id : "ip:" + req.ip;
  const datos = envios.get(llave) || { fechas: [], bloqueadoHasta: 0 };

  if (ahora < datos.bloqueadoHasta) {
    const segundos = Math.ceil((datos.bloqueadoHasta - ahora) / 1000);
    res.setHeader("Retry-After", segundos);
    return res.status(429).json({ mensaje: "Espera antes de enviar otra petición.", segundos });
  }

  datos.fechas = datos.fechas.filter((fecha) => ahora - fecha < MINUTO);
  if (datos.fechas.length >= 5) {
    datos.bloqueadoHasta = ahora + BLOQUEO;
    datos.fechas = [];
    envios.set(llave, datos);
    res.setHeader("Retry-After", Math.ceil(BLOQUEO / 1000));
    return res.status(429).json({ mensaje: "Llegaste al límite de peticiones. Espera antes de continuar.", segundos: 30 });
  }

  datos.fechas.push(ahora);
  envios.set(llave, datos);
  next();
}

module.exports = { limitarPeticiones };

