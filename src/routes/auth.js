const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const wrap = require('../utils/asyncHandler');
const auth = require('../controllers/authController');
const { exigirLogin } = require('../middlewares/auth');

const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
});
const limiteRegistro = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false });

router.get('/login', auth.loginForm);
router.post('/login', limiteLogin, wrap(auth.login));
router.post('/logout', wrap(auth.logout));
router.get('/registro', auth.registroForm);
router.post('/registro', limiteRegistro, wrap(auth.registro));
router.post('/sessao/ping', exigirLogin, auth.ping);

module.exports = router;
