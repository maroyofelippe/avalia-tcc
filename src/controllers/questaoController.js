const { Questao } = require('../models');

exports.index = async (req, res) => {
  const questoes = await Questao.findAll({ order: [['id', 'ASC']] });
  res.render('admin/questoes/index', { titulo: 'Questões', questoes });
};

exports.novo = (req, res) => {
  res.render('admin/questoes/form', { titulo: 'Nova questão', questao: { ativa: true }, erro: null });
};

exports.criar = async (req, res) => {
  const texto = String(req.body.texto || '').trim();
  if (texto.length < 10 || texto.length > 300) {
    return res.status(422).render('admin/questoes/form', {
      titulo: 'Nova questão',
      questao: { texto, ativa: true },
      erro: 'O texto deve ter entre 10 e 300 caracteres.',
    });
  }
  await Questao.create({ texto, ativa: req.body.ativa === '1' });
  res.flash('sucesso', 'Questão cadastrada. Selecione-a nos eventos desejados.');
  res.redirect('/admin/questoes');
};

exports.editar = async (req, res) => {
  const questao = await Questao.findByPk(req.params.id);
  if (!questao) return res.redirect('/admin/questoes');
  res.render('admin/questoes/form', { titulo: 'Editar questão', questao, erro: null });
};

exports.atualizar = async (req, res) => {
  const questao = await Questao.findByPk(req.params.id);
  if (!questao) return res.redirect('/admin/questoes');
  const texto = String(req.body.texto || '').trim();
  if (texto.length < 10 || texto.length > 300) {
    return res.status(422).render('admin/questoes/form', {
      titulo: 'Editar questão',
      questao: { id: questao.id, texto, ativa: req.body.ativa === '1' },
      erro: 'O texto deve ter entre 10 e 300 caracteres.',
    });
  }
  await questao.update({ texto, ativa: req.body.ativa === '1' });
  res.flash('sucesso', 'Questão atualizada.');
  res.redirect('/admin/questoes');
};

// Questões que já têm votos são apenas desativadas, para preservar o histórico.
exports.excluir = async (req, res) => {
  const questao = await Questao.findByPk(req.params.id);
  if (!questao) return res.redirect('/admin/questoes');
  try {
    await questao.destroy();
    res.flash('sucesso', 'Questão excluída.');
  } catch (e) {
    await questao.update({ ativa: false });
    res.flash('aviso', 'A questão já possui votos e foi apenas desativada para preservar o histórico.');
  }
  res.redirect('/admin/questoes');
};
