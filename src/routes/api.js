const router = require('express').Router();
const wrap = require('../utils/asyncHandler');
const dashboard = require('../controllers/dashboardController');

// Métricas públicas do evento (consumidas pelo dashboard a cada 2–3 min)
router.get('/eventos/:eventoId/metricas', wrap(dashboard.metricas));

module.exports = router;
