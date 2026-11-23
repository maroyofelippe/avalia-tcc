const { Usuario } = require('../models');
const authService = require('../services/authService');
const env = require('../config/env');

exports.loginForm = (req, res) => {
  if (req.usuario) return res.redirect('/admin');
  res.render('auth/login', { titulo: 'Entrar', email: '', erro: null });
};

exports.login = async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const r = await authService.login(email, String(req.body.senha || ''), req.ip);
  if (!r.ok) return res.status(401).render('auth/login', { titulo: 'Entrar', email, erro: r.erro });
  authService.emitirCookie(res, r.usuario, r.sessao);
  res.redirect('/admin');
};

exports.logout = async (req, res) => {
  if (req.sessao) await authService.encerrar(req.sessao, 'logout');
  res.clearCookie(authService.COOKIE);
  res.flash('sucesso', 'Você saiu do sistema.');
  res.redirect('/login');
};

exports.ping = (req, res) => res.json({ ok: true }); // a renovação ocorre no middleware

exports.registroForm = (req, res) => {
  res.render('auth/registro', { titulo: 'Cadastro', dados: {}, erro: null, dominio: env.dominioInstitucional });
};

exports.registro = async (req, res) => {
  const nome = String(req.body.nome || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const { senha, confirmacao } = req.body;
  const dados = { nome, email };
  const falha = (erro) =>
    res.status(422).render('auth/registro', { titulo: 'Cadastro', dados, erro, dominio: env.dominioInstitucional });

  if (nome.length < 3 || nome.length > 120) return falha('Informe seu nome completo.');
  if (!authService.emailInstitucionalValido(email)) return falha(`Use seu e-mail institucional (${env.dominioInstitucional}).`);
  if (!authService.senhaForte(senha)) return falha('A senha deve ter ao menos 8 caracteres, com letras e números.');
  if (senha !== confirmacao) return falha('A confirmação da senha não confere.');
  if (await Usuario.findOne({ where: { email } })) return falha('Este e-mail já está cadastrado.');

  await Usuario.create({
    nome,
    email,
    senhaHash: await authService.hashSenha(senha),
    perfil: 'gestor',
    ativo: !env.aprovacaoCadastro,
  });
  res.flash(
    'sucesso',
    env.aprovacaoCadastro
      ? 'Cadastro recebido! Aguarde a aprovação do administrador para entrar.'
      : 'Cadastro concluído! Você já pode entrar.'
  );
  res.redirect('/login');
};
