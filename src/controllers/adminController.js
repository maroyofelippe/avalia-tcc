const { Unidade, Evento, Projeto, Questao, Voto, Votante } = require('../models');

exports.painel = async (req, res) => {
  const [unidades, eventos, projetos, questoes, avaliadores, respostas, listaEventos] = await Promise.all([
    Unidade.count(),
    Evento.count(),
    Projeto.count(),
    Questao.count({ where: { ativa: true } }),
    Votante.count(),
    Voto.count(),
    Evento.findAll({ include: Unidade, order: [['createdAt', 'DESC']], limit: 8 }),
  ]);
  res.render('admin/painel', {
    titulo: 'Painel',
    totais: { unidades, eventos, projetos, questoes, avaliadores, respostas },
    eventos: listaEventos,
  });
};
