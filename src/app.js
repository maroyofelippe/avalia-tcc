const path = require('path');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const flash = require('./utils/flash');
const { carregarUsuario } = require('./middlewares/auth');

const app = express();

if (env.producao) app.set('trust proxy', 1);
app.disable('x-powered-by');

// View engine + layout (MVC: views em src/views)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('layout extractScripts', true);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", 'https://cdn.jsdelivr.net', "'unsafe-inline'"],
        fontSrc: ["'self'", 'https://cdn.jsdelivr.net', 'data:'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: null, // permite rodar em HTTP na rede local
      },
    },
  })
);

app.use(express.static(path.join(__dirname, 'public'), { maxAge: env.producao ? '1d' : 0 }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// Variáveis disponíveis em todas as views
app.use((req, res, next) => {
  res.locals.sessaoMinutos = env.sessaoMinutos;
  res.locals.rotaAtual = req.path;
  res.locals.baseUrl = `${req.protocol}://${req.get('host')}`;
  res.locals.erro = null;
  res.locals.titulo = 'AvaliaTCC';
  next();
});

app.use(carregarUsuario);
app.use('/api', require('./routes/api'));
app.use(flash);
app.use('/admin', require('./routes/admin'));
app.use(require('./routes/auth'));
app.use(require('./routes/publico'));

app.use((req, res) => {
  res.status(404).render('erro', { titulo: 'Não encontrada', mensagem: 'A página que você procura não existe.', status: 404 });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return;
  if (req.path.startsWith('/api')) return res.status(500).json({ erro: 'Erro interno' });
  res.status(500).render('erro', {
    titulo: 'Erro',
    mensagem: env.producao ? 'Ocorreu um erro inesperado. Tente novamente.' : err.message,
    status: 500,
  });
});

module.exports = app;
