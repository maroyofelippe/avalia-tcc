const router = require('express').Router();
const wrap = require('../utils/asyncHandler');
const dashboard = require('../controllers/dashboardController');

// Métricas públicas do evento (consumidas pelo dashboard a cada 2–3 min)
router.get('/eventos/:eventoId/metricas', (req, res, next) => (req.usuario ? next() : res.status(401).json({ erro: 'Não autorizado' })), wrap(dashboard.metricas));

module.exports = router;
