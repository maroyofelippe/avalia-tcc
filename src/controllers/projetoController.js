const { Evento, Unidade, Projeto } = require('../models');

async function carregarEvento(req, res) {
  const evento = await Evento.findByPk(req.params.eventoId, { include: Unidade });
  if (!evento) res.status(404).render('erro', { titulo: 'Não encontrado', mensagem: 'Evento não encontrado.', status: 404 });
  return evento;
}

function lerCampos(body) {
  return {
    titulo: String(body.titulo || '').trim(),
    curso: String(body.curso || '').trim() || null,
    turma: String(body.turma || '').trim(),
    ano: parseInt(body.ano, 10),
    equipe: String(body.equipe || '').trim() || null,
    descricao: String(body.descricao || '').trim() || null,
  };
}

function validar(c) {
  if (!c.titulo) return 'Informe o título do projeto.';
  if (!c.turma) return 'Informe a turma.';
  if (!Number.isInteger(c.ano) || c.ano < 2000 || c.ano > 2100) return 'Informe um ano válido.';
  return null;
}

exports.index = async (req, res) => {
  const evento = await carregarEvento(req, res);
  if (!evento) return;
  const projetos = await Projeto.findAll({ where: { eventoId: evento.id }, order: [['turma', 'ASC'], ['titulo', 'ASC']] });
  res.render('admin/projetos/index', { titulo: 'Projetos', evento, projetos });
};

exports.novo = async (req, res) => {
  const evento = await carregarEvento(req, res);
  if (!evento) return;
  res.render('admin/projetos/form', { titulo: 'Novo projeto', evento, projeto: { ano: evento.ano }, erro: null });
};

exports.criar = async (req, res) => {
  const evento = await carregarEvento(req, res);
  if (!evento) return;
  const campos = lerCampos(req.body);
  const erro = validar(campos);
  if (erro) return res.status(422).render('admin/projetos/form', { titulo: 'Novo projeto', evento, projeto: campos, erro });
  await Projeto.create({ ...campos, eventoId: evento.id });
  res.flash('sucesso', 'Projeto cadastrado.');
  res.redirect(`/admin/eventos/${evento.id}/projetos`);
};

exports.editar = async (req, res) => {
  const evento = await carregarEvento(req, res);
  if (!evento) return;
  const projeto = await Projeto.findOne({ where: { id: req.params.id, eventoId: evento.id } });
  if (!projeto) return res.redirect(`/admin/eventos/${evento.id}/projetos`);
  res.render('admin/projetos/form', { titulo: 'Editar projeto', evento, projeto, erro: null });
};

exports.atualizar = async (req, res) => {
  const evento = await carregarEvento(req, res);
  if (!evento) return;
  const projeto = await Projeto.findOne({ where: { id: req.params.id, eventoId: evento.id } });
  if (!projeto) return res.redirect(`/admin/eventos/${evento.id}/projetos`);
  const campos = lerCampos(req.body);
  const erro = validar(campos);
  if (erro) return res.status(422).render('admin/projetos/form', { titulo: 'Editar projeto', evento, projeto: { ...campos, id: projeto.id }, erro });
  await projeto.update(campos);
  res.flash('sucesso', 'Projeto atualizado.');
  res.redirect(`/admin/eventos/${evento.id}/projetos`);
};

exports.excluir = async (req, res) => {
  const evento = await carregarEvento(req, res);
  if (!evento) return;
  await Projeto.destroy({ where: { id: req.params.id, eventoId: evento.id } });
  res.flash('sucesso', 'Projeto excluído (votos associados também).');
  res.redirect(`/admin/eventos/${evento.id}/projetos`);
};
