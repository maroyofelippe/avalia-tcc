const { Evento, Unidade, Projeto, Questao, Votante, Voto, sequelize } = require('../models');

const RELACOES = ['aluno', 'ex_aluno', 'responsavel', 'professor'];
const cookieVotante = (eventoId) => `votante_${eventoId}`;

async function carregarEventoAberto(req, res) {
  const evento = await Evento.findByPk(req.params.eventoId, { include: Unidade });
  if (!evento || !evento.ativo) {
    res.status(404).render('erro', { titulo: 'Evento não encontrado', mensagem: 'Este evento não está disponível.', status: 404 });
    return null;
  }
  if (!evento.votacaoAberta) {
    res.status(403).render('votacao/encerrada', { titulo: 'Votação encerrada', evento });
    return null;
  }
  return evento;
}

async function votanteAtual(req, evento) {
  const token = req.cookies[cookieVotante(evento.id)];
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return null;
  return Votante.findOne({ where: { token, eventoId: evento.id } });
}

function dataNascimentoValida(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto || '')) return false;
  const d = new Date(`${texto}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== texto) return false;
  const anos = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
  return anos >= 5 && anos <= 110;
}

exports.listaEventos = async (req, res) => {
  const eventos = await Evento.findAll({ where: { ativo: true, votacaoAberta: true }, include: Unidade, order: [['nome', 'ASC']] });
  res.render('votacao/eventos', { titulo: 'Votação', eventos });
};

exports.identificacaoForm = async (req, res) => {
  const evento = await carregarEventoAberto(req, res);
  if (!evento) return;
  if (await votanteAtual(req, evento)) return res.redirect(`/votar/${evento.id}/projetos`);
  res.render('votacao/identificacao', { titulo: 'Identificação', evento, dados: {}, erro: null });
};

exports.identificar = async (req, res) => {
  const evento = await carregarEventoAberto(req, res);
  if (!evento) return;
  const dados = {
    alias: String(req.body.alias || '').trim(),
    relacao: req.body.relacao,
    dataNascimento: req.body.data_nascimento,
  };
  let erro = null;
  if (dados.alias.length < 2 || dados.alias.length > 60) erro = 'Informe um nome ou apelido (2 a 60 caracteres).';
  else if (!RELACOES.includes(dados.relacao)) erro = 'Selecione sua relação com a unidade.';
  else if (!dataNascimentoValida(dados.dataNascimento)) erro = 'Informe uma data de nascimento válida.';
  if (erro) return res.status(422).render('votacao/identificacao', { titulo: 'Identificação', evento, dados, erro });

  const votante = await Votante.create({ eventoId: evento.id, ...dados });
  res.cookie(cookieVotante(evento.id), votante.token, { httpOnly: true, sameSite: 'lax', maxAge: 2 * 24 * 3600 * 1000 });
  res.redirect(`/votar/${evento.id}/projetos`);
};

exports.projetos = async (req, res) => {
  const evento = await carregarEventoAberto(req, res);
  if (!evento) return;
  const votante = await votanteAtual(req, evento);
  if (!votante) return res.redirect(`/votar/${evento.id}`);
  const [projetos, avaliados] = await Promise.all([
    Projeto.findAll({ where: { eventoId: evento.id }, order: [['turma', 'ASC'], ['titulo', 'ASC']] }),
    Voto.findAll({ where: { votanteId: votante.id }, attributes: ['projetoId'], group: ['projetoId'] }),
  ]);
  const jaAvaliou = new Set(avaliados.map((v) => v.projetoId));
  res.render('votacao/projetos', { titulo: 'Projetos', evento, votante, projetos, jaAvaliou });
};

async function questoesDoEvento(evento) {
  return evento.getQuestaos({ where: { ativa: true }, joinTableAttributes: ['ordem'], order: [[sequelize.literal('"EventoQuestao"."ordem"'), 'ASC']] });
}

exports.avaliarForm = async (req, res) => {
  const evento = await carregarEventoAberto(req, res);
  if (!evento) return;
  const votante = await votanteAtual(req, evento);
  if (!votante) return res.redirect(`/votar/${evento.id}`);
  const projeto = await Projeto.findOne({ where: { id: req.params.projetoId, eventoId: evento.id } });
  if (!projeto) return res.redirect(`/votar/${evento.id}/projetos`);
  if (await Voto.count({ where: { votanteId: votante.id, projetoId: projeto.id } })) {
    res.flash('aviso', 'Você já avaliou este projeto. Obrigado!');
    return res.redirect(`/votar/${evento.id}/projetos`);
  }
  const questoes = await questoesDoEvento(evento);
  res.render('votacao/avaliar', { titulo: projeto.titulo, evento, projeto, questoes, erro: null });
};

exports.avaliar = async (req, res) => {
  const evento = await carregarEventoAberto(req, res);
  if (!evento) return;
  const votante = await votanteAtual(req, evento);
  if (!votante) return res.redirect(`/votar/${evento.id}`);
  const projeto = await Projeto.findOne({ where: { id: req.params.projetoId, eventoId: evento.id } });
  if (!projeto) return res.redirect(`/votar/${evento.id}/projetos`);

  const questoes = await questoesDoEvento(evento);
  const notas = questoes.map((q) => {
    const bruto = req.body[`nota_${q.id}`]; // não usar nota[id]: o qs compacta índices numéricos
    return /^(?:10|[0-9])$/.test(String(bruto)) ? { questaoId: q.id, nota: Number(bruto) } : null;
  });
  if (!questoes.length || notas.some((n) => n === null)) {
    return res.status(422).render('votacao/avaliar', { titulo: projeto.titulo, evento, projeto, questoes, erro: 'Responda todas as questões com uma nota de 0 a 10.' });
  }

  try {
    await Voto.bulkCreate(notas.map((n) => ({ ...n, eventoId: evento.id, projetoId: projeto.id, votanteId: votante.id })));
  } catch (e) {
    if (e.name === 'SequelizeUniqueConstraintError') {
      res.flash('aviso', 'Você já avaliou este projeto. Obrigado!');
      return res.redirect(`/votar/${evento.id}/projetos`);
    }
    throw e;
  }
  res.flash('sucesso', `Avaliação de "${projeto.titulo}" registrada. Obrigado!`);
  res.redirect(`/votar/${evento.id}/projetos`);
};
