const service = require("./dashboard.service");

async function consultar(req, res) {
  res.json(await service.consultar(req.query));
}

module.exports = { consultar };
