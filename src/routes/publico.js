const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const wrap = require('../utils/asyncHandler');
const home = require('../controllers/homeController');
const votacao = require('../controllers/votacaoController');
const { exigirLogin } = require('../middlewares/auth');
const dashboard = require('../controllers/dashboardController');

// Feira escolar costuma sair por um único IP (NAT do Wi-Fi), por isso o limite é folgado.
const limiteVotos = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Muitas requisições. Aguarde alguns minutos.',
});

router.get('/', wrap(home.index));

router.get('/votar', wrap(votacao.listaEventos));
router.get('/votar/:eventoId', wrap(votacao.identificacaoForm));
router.post('/votar/:eventoId', limiteVotos, wrap(votacao.identificar));
router.get('/votar/:eventoId/projetos', wrap(votacao.projetos));
router.get('/votar/:eventoId/projetos/:projetoId', wrap(votacao.avaliarForm));
router.post('/votar/:eventoId/projetos/:projetoId', limiteVotos, wrap(votacao.avaliar));

// Resultados: somente admin e usuários cadastrados e ativos (autorizados pelo admin)
router.get('/dashboard', exigirLogin, wrap(dashboard.lista));
router.get('/dashboard/:eventoId', exigirLogin, wrap(dashboard.view));

module.exports = router;
