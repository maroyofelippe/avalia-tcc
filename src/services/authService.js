const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const env = require('../config/env');
const { Usuario, Sessao } = require('../models');

const COOKIE = 'avalia_token';
const REGEX_EMAIL_CPS = /^[a-z0-9._%+-]+@cps\.sp\.gov\.br$/i;
// hash fictício para igualar o tempo de resposta quando o e-mail não existe
const HASH_FALSO = bcrypt.hashSync('nao-existe', 10);

function emailInstitucionalValido(email) {
  return REGEX_EMAIL_CPS.test(email || '');
}

function senhaForte(senha) {
  return typeof senha === 'string' && senha.length >= 8 && /[A-Za-z]/.test(senha) && /\d/.test(senha);
}

function hashSenha(senha) {
  return bcrypt.hash(senha, 12);
}

function emitirCookie(res, usuario, sessao) {
  const token = jwt.sign({ sub: usuario.id, jti: sessao.id, perfil: usuario.perfil }, env.jwtSecret, {
    expiresIn: `${env.sessaoMinutos}m`,
  });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.cookieSecure,
    maxAge: env.sessaoMinutos * 60 * 1000,
  });
}

async function login(email, senha, ip) {
  const usuario = await Usuario.findOne({ where: { email } });
  const confere = await bcrypt.compare(senha, usuario ? usuario.senhaHash : HASH_FALSO);
  if (!usuario || !confere) return { ok: false, erro: 'E-mail ou senha inválidos.' };
  if (!usuario.ativo) return { ok: false, erro: 'Seu cadastro ainda não foi aprovado pelo administrador.' };
  const sessao = await Sessao.create({ usuarioId: usuario.id, ip });
  return { ok: true, usuario, sessao };
}

async function encerrar(sessao, motivo) {
  if (sessao.encerradaEm) return;
  sessao.encerradaEm = new Date();
  sessao.motivoEncerramento = motivo;
  await sessao.save();
}

function limiteInatividade() {
  return new Date(Date.now() - env.sessaoMinutos * 60 * 1000);
}

// Marca como encerradas as sessões sem atividade além do limite (rodado a cada minuto)
async function limparExpiradas() {
  try {
    await Sessao.update(
      { encerradaEm: new Date(), motivoEncerramento: 'inatividade' },
      { where: { encerradaEm: null, ultimaAtividade: { [Op.lt]: limiteInatividade() } } }
    );
  } catch (e) {
    console.error('Falha ao limpar sessões expiradas:', e.message);
  }
}

module.exports = {
  COOKIE,
  emailInstitucionalValido,
  senhaForte,
  hashSenha,
  emitirCookie,
  login,
  encerrar,
  limiteInatividade,
  limparExpiradas,
};
