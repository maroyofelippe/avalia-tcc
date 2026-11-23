const { Evento, Unidade } = require('../models');

exports.index = async (req, res) => {
  const eventos = await Evento.findAll({
    where: { ativo: true },
    include: Unidade,
    order: [['ano', 'DESC'], ['nome', 'ASC']],
  });
  res.render('home', { titulo: 'Avaliação de TCC', eventos });
};
