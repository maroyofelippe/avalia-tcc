const { Op } = require('sequelize');
const { Usuario, Sessao } = require('../models');
const authService = require('../services/authService');

async function listarComStatus() {
  const usuarios = await Usuario.findAll({
    include: {
      model: Sessao,
      required: false,
      where: { encerradaEm: null, ultimaAtividade: { [Op.gte]: authService.limiteInatividade() } },
    },
    order: [['nome', 'ASC']],
  });
  const agora = Date.now();
  return usuarios.map((u) => {
    const ativas = (u.Sessaos || []).sort((a, b) => a.inicio - b.inicio);
    const sessao = ativas[0];
    return {
      id: u.id,
      nome: u.nome,
      email: u.email,
      perfil: u.perfil,
      ativo: u.ativo,
      nativo: u.nativo,
      online: ativas.length > 0,
      logadoDesde: sessao ? sessao.inicio.toISOString() : null,
      segundosLogado: sessao ? Math.floor((agora - sessao.inicio.getTime()) / 1000) : 0,
      ultimaAtividade: sessao ? sessao.ultimaAtividade.toISOString() : null,
    };
  });
}

exports.index = async (req, res) => {
  res.render('admin/usuarios/index', { titulo: 'Usuários', usuarios: await listarComStatus() });
};

// Atualização em segundo plano da tela (não renova a sessão do admin)
exports.statusJson = async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await listarComStatus());
};

async function alvo(req, res) {
  const u = await Usuario.findByPk(req.params.id);
  if (!u) {
    res.redirect('/admin/usuarios');
    return null;
  }
  if (u.nativo || u.id === req.usuario.id) {
    res.flash('erro', 'O admin nativo e a sua própria conta não podem ser alterados aqui.');
    res.redirect('/admin/usuarios');
    return null;
  }
  return u;
}

exports.alternarAtivo = async (req, res) => {
  const u = await alvo(req, res);
  if (!u) return;
  u.ativo = !u.ativo;
  await u.save();
  if (!u.ativo) await Sessao.update({ encerradaEm: new Date(), motivoEncerramento: 'desativado' }, { where: { usuarioId: u.id, encerradaEm: null } });
  res.flash('sucesso', `Usuário ${u.ativo ? 'ativado' : 'desativado'}.`);
  res.redirect('/admin/usuarios');
};

exports.alterarPerfil = async (req, res) => {
  const u = await alvo(req, res);
  if (!u) return;
  u.perfil = req.body.perfil === 'admin' ? 'admin' : 'gestor';
  await u.save();
  res.flash('sucesso', 'Perfil atualizado.');
  res.redirect('/admin/usuarios');
};

exports.derrubarSessao = async (req, res) => {
  const u = await Usuario.findByPk(req.params.id);
  if (u && u.id !== req.usuario.id) {
    await Sessao.update({ encerradaEm: new Date(), motivoEncerramento: 'encerrada_por_admin' }, { where: { usuarioId: u.id, encerradaEm: null } });
    res.flash('sucesso', 'Sessões do usuário encerradas.');
  }
  res.redirect('/admin/usuarios');
};
