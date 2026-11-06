require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { limitarPeticiones } = require("./middleware/rate-limit");
const { requestId, manejarError, rutaNoEncontrada } = require("./middleware/errores");

const authRoutes = require("./modules/auth/auth.routes");
const reportRoutes = require("./modules/reports/reports.routes");
const requestRoutes = require("./modules/requests/requests.routes");
const profileRoutes = require("./modules/profile/profile.routes");
const organizationRoutes = require("./modules/organizations/organizations.routes");
const catalogRoutes = require("./modules/catalogs/catalogs.routes");
const userRoutes = require("./modules/users/users.routes");
const dashboardRoutes = require("./modules/dashboard/dashboard.routes");

const app = express();

app.use(requestId);
app.use(helmet());
app.use(cors({ origin: process.env.FRONT_URL || "http://localhost:3000", exposedHeaders: ["X-Nueva-Sesion", "X-Request-Id"] }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, mensaje: "API Rampify disponible", idPeticion: req.idPeticion });
});

app.use("/api", limitarPeticiones);
app.use("/api/auth", authRoutes);
app.use("/api/reportes", reportRoutes);
app.use("/api/solicitudes", requestRoutes);
app.use("/api/perfil", profileRoutes);
app.use("/api/organizaciones", organizationRoutes);
app.use("/api/catalogos", catalogRoutes);
app.use("/api/usuarios", userRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use(rutaNoEncontrada);
app.use(manejarError);

module.exports = app;
