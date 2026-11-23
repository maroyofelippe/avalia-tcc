const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { Usuario, Sessao } = require('../models');
const authService = require('../services/authService');

// Intervalo mínimo entre gravações de "última atividade" (reduz escrita no banco)
const MIN_TOUCH_MS = 30 * 1000;

/**
 * Identifica o usuário logado (opcional). Valida JWT + sessão no banco.
 * Requisições em segundo plano (header X-Background: 1, ex.: atualização do dashboard)
 * NÃO renovam a sessão — assim o refresh automático não impede o logout por inatividade.
 */
async function carregarUsuario(req, res, next) {
  req.usuario = null;
  req.sessao = null;
  res.locals.usuario = null;
  res.locals.sessaoAtual = null;

  const token = req.cookies[authService.COOKIE];
  if (!token) return next();

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const sessao = await Sessao.findByPk(payload.jti);
    if (!sessao || sessao.encerradaEm) throw new Error('sessão encerrada');

    if (sessao.ultimaAtividade < authService.limiteInatividade()) {
      await authService.encerrar(sessao, 'inatividade');
      req.sessaoExpirada = true;
      throw new Error('sessão expirada');
    }

    const usuario = await Usuario.findByPk(payload.sub);
    if (!usuario || !usuario.ativo) throw new Error('usuário inativo');

    const emSegundoPlano = req.get('X-Background') === '1';
    if (!emSegundoPlano && Date.now() - sessao.ultimaAtividade.getTime() > MIN_TOUCH_MS) {
      sessao.ultimaAtividade = new Date();
      await sessao.save();
      authService.emitirCookie(res, usuario, sessao); // renova o JWT (sessão deslizante)
    }

    req.usuario = usuario;
    req.sessao = sessao;
    res.locals.usuario = usuario;
    res.locals.sessaoAtual = sessao;
  } catch (e) {
    if (e.name === 'TokenExpiredError') req.sessaoExpirada = true;
    res.clearCookie(authService.COOKIE);
  }
  next();
}

function exigirLogin(req, res, next) {
  if (req.usuario) return next();
  if (req.sessaoExpirada) res.flash('aviso', 'Sua sessão expirou por inatividade. Entre novamente.');
  else res.flash('aviso', 'Faça login para continuar.');
  res.redirect('/login');
}

function exigirAdmin(req, res, next) {
  if (req.usuario && req.usuario.perfil === 'admin') return next();
  res.status(403).render('erro', { titulo: 'Acesso negado', mensagem: 'Apenas administradores acessam esta área.', status: 403 });
}

module.exports = { carregarUsuario, exigirLogin, exigirAdmin };
