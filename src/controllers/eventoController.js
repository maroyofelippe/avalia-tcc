const { Evento, Unidade, Questao, EventoQuestao, Projeto } = require('../models');

const naoEncontrado = (res) =>
  res.status(404).render('erro', { titulo: 'Não encontrado', mensagem: 'Evento não encontrado.', status: 404 });

function lerCampos(body) {
  return {
    nome: String(body.nome || '').trim(),
    ano: parseInt(body.ano, 10),
    unidadeId: parseInt(body.unidade_id, 10),
    dataEvento: body.data_evento || null,
    ativo: body.ativo === '1',
  };
}

function validar(c) {
  if (!c.nome) return 'Informe o nome do evento.';
  if (!Number.isInteger(c.ano) || c.ano < 2000 || c.ano > 2100) return 'Informe um ano válido.';
  if (!Number.isInteger(c.unidadeId)) return 'Selecione a unidade.';
  return null;
}

exports.index = async (req, res) => {
  const eventos = await Evento.findAll({
    include: [Unidade, { model: Projeto, attributes: ['id'] }],
    order: [['ano', 'DESC'], ['nome', 'ASC']],
  });
  res.render('admin/eventos/index', { titulo: 'Eventos', eventos });
};

exports.novo = async (req, res) => {
  const unidades = await Unidade.findAll({ order: [['nome', 'ASC']] });
  res.render('admin/eventos/form', {
    titulo: 'Novo evento',
    evento: { ano: new Date().getFullYear(), ativo: true },
    unidades,
    erro: null,
  });
};

exports.criar = async (req, res) => {
  const campos = lerCampos(req.body);
  const erro = validar(campos);
  if (erro) {
    const unidades = await Unidade.findAll({ order: [['nome', 'ASC']] });
    return res.status(422).render('admin/eventos/form', {
      titulo: 'Novo evento',
      evento: { ...campos, unidadeId: campos.unidadeId },
      unidades,
      erro,
    });
  }
  const evento = await Evento.create(campos);
  // por padrão o evento já recebe as questões padrão (podem ser trocadas depois)
  const padrao = await Questao.findAll({ where: { padrao: true, ativa: true }, order: [['id', 'ASC']] });
  await EventoQuestao.bulkCreate(padrao.map((q, i) => ({ eventoId: evento.id, questaoId: q.id, ordem: i + 1 })));
  res.flash('sucesso', 'Evento criado. Cadastre os projetos e abra a votação.');
  res.redirect(`/admin/eventos/${evento.id}/projetos`);
};

exports.editar = async (req, res) => {
  const evento = await Evento.findByPk(req.params.id);
  if (!evento) return naoEncontrado(res);
  const unidades = await Unidade.findAll({ order: [['nome', 'ASC']] });
  res.render('admin/eventos/form', { titulo: 'Editar evento', evento, unidades, erro: null });
};

exports.atualizar = async (req, res) => {
  const evento = await Evento.findByPk(req.params.id);
  if (!evento) return naoEncontrado(res);
  const campos = lerCampos(req.body);
  const erro = validar(campos);
  if (erro) {
    const unidades = await Unidade.findAll({ order: [['nome', 'ASC']] });
    return res.status(422).render('admin/eventos/form', {
      titulo: 'Editar evento',
      evento: { ...campos, id: evento.id },
      unidades,
      erro,
    });
  }
  await evento.update(campos);
  res.flash('sucesso', 'Evento atualizado.');
  res.redirect('/admin/eventos');
};

exports.excluir = async (req, res) => {
  const evento = await Evento.findByPk(req.params.id);
  if (evento) await evento.destroy(); // remove projetos, votantes e votos (CASCADE)
  res.flash('sucesso', 'Evento excluído junto com projetos e votos.');
  res.redirect('/admin/eventos');
};

exports.alternarVotacao = async (req, res) => {
  const evento = await Evento.findByPk(req.params.id);
  if (!evento) return naoEncontrado(res);
  evento.votacaoAberta = !evento.votacaoAberta;
  await evento.save();
  res.flash('sucesso', evento.votacaoAberta ? 'Votação aberta ao público.' : 'Votação encerrada.');
  res.redirect(req.get('Referer') || '/admin/eventos');
};

// QR Code (SVG) com o link público de votação do evento
exports.qr = async (req, res) => {
  const evento = await Evento.findByPk(req.params.id, { attributes: ['id'] });
  if (!evento) return naoEncontrado(res);
  const url = `${req.protocol}://${req.get('host')}/votar/${evento.id}`;
  const svg = await require('qrcode').toString(url, { type: 'svg', margin: 1, width: 320 });
  res.type('image/svg+xml').send(svg);
};

// Escolha das perguntas exibidas no evento
exports.questoesForm = async (req, res) => {
  const evento = await Evento.findByPk(req.params.id, { include: Unidade });
  if (!evento) return naoEncontrado(res);
  const [questoes, vinculos] = await Promise.all([
    Questao.findAll({ where: { ativa: true }, order: [['id', 'ASC']] }),
    EventoQuestao.findAll({ where: { eventoId: evento.id } }),
  ]);
  const selecionadas = new Map(vinculos.map((v) => [v.questaoId, v.ordem]));
  res.render('admin/eventos/questoes', { titulo: 'Questões do evento', evento, questoes, selecionadas });
};

exports.questoesSalvar = async (req, res) => {
  const evento = await Evento.findByPk(req.params.id);
  if (!evento) return naoEncontrado(res);
  const ids = [].concat(req.body.questoes || []).map((n) => parseInt(n, 10)).filter(Number.isInteger);
  const validas = await Questao.findAll({ where: { id: ids, ativa: true } });
  const ordemPorId = new Map(ids.map((id, i) => [id, i + 1]));
  await EventoQuestao.destroy({ where: { eventoId: evento.id } });
  await EventoQuestao.bulkCreate(
    validas
      .sort((a, b) => ordemPorId.get(a.id) - ordemPorId.get(b.id))
      .map((q, i) => ({ eventoId: evento.id, questaoId: q.id, ordem: i + 1 }))
  );
  res.flash('sucesso', `${validas.length} questão(ões) selecionada(s) para o evento.`);
  res.redirect('/admin/eventos');
};
