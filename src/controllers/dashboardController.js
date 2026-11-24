const env = require('../config/env');
const { Evento, Unidade } = require('../models');
const { metricasEvento } = require('../services/npsService');

exports.lista = async (req, res) => {
  const eventos = await Evento.findAll({ where: { ativo: true }, include: Unidade, order: [['ano', 'DESC'], ['nome', 'ASC']] });
  res.render('dashboard/lista', { titulo: 'Resultados', eventos });
};

exports.view = async (req, res) => {
  const evento = await Evento.findByPk(req.params.eventoId, { include: Unidade });
  if (!evento || (!evento.ativo && !req.usuario)) {
    return res.status(404).render('erro', { titulo: 'Não encontrado', mensagem: 'Evento não encontrado.', status: 404 });
  }
  // Admin logado: atualização a cada 2 min; demais: 3 min
  const admin = req.usuario && req.usuario.perfil === 'admin';
  const intervaloSeg = admin ? env.refreshAdminSeg : env.refreshPublicoSeg;
  // QR Code (SVG inline) com o link público de votação, para o público acessar a partir da tela de resultados
  const urlVotacao = `${req.protocol}://${req.get('host')}/votar/${evento.id}`;
  const qrSvg = await require('qrcode').toString(urlVotacao, { type: 'svg', margin: 1, width: 140 });
  res.render('dashboard/index', { titulo: `Resultados — ${evento.nome}`, evento, intervaloSeg, qrSvg, urlVotacao });
};

exports.metricas = async (req, res) => {
  const evento = await Evento.findByPk(req.params.eventoId, { attributes: ['id'] });
  if (!evento) return res.status(404).json({ erro: 'Evento não encontrado' });
  res.set('Cache-Control', 'no-store');
  res.json(await metricasEvento(evento.id));
};
