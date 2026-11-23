const fs = require('fs');
const path = require('path');
const { Unidade } = require('../models');
const { DESTINO } = require('../middlewares/upload');

function removerArquivo(logo) {
  if (!logo) return;
  fs.unlink(path.join(DESTINO, path.basename(logo)), () => {});
}

exports.index = async (req, res) => {
  const unidades = await Unidade.findAll({ order: [['nome', 'ASC']] });
  res.render('admin/unidades/index', { titulo: 'Unidades', unidades });
};

exports.novo = (req, res) => {
  res.render('admin/unidades/form', { titulo: 'Nova unidade', unidade: {}, erro: null });
};

exports.criar = async (req, res) => {
  const nome = String(req.body.nome || '').trim();
  if (!nome) {
    if (req.file) removerArquivo(req.file.filename);
    return res.status(422).render('admin/unidades/form', { titulo: 'Nova unidade', unidade: req.body, erro: 'Informe o nome da unidade.' });
  }
  await Unidade.create({
    nome,
    codigo: String(req.body.codigo || '').trim() || null,
    cidade: String(req.body.cidade || '').trim() || null,
    logo: req.file ? `/uploads/logos/${req.file.filename}` : null,
  });
  res.flash('sucesso', 'Unidade cadastrada.');
  res.redirect('/admin/unidades');
};

exports.editar = async (req, res) => {
  const unidade = await Unidade.findByPk(req.params.id);
  if (!unidade) return res.status(404).render('erro', { titulo: 'Não encontrada', mensagem: 'Unidade não encontrada.', status: 404 });
  res.render('admin/unidades/form', { titulo: 'Editar unidade', unidade, erro: null });
};

exports.atualizar = async (req, res) => {
  const unidade = await Unidade.findByPk(req.params.id);
  if (!unidade) return res.status(404).render('erro', { titulo: 'Não encontrada', mensagem: 'Unidade não encontrada.', status: 404 });
  const nome = String(req.body.nome || '').trim();
  if (!nome) {
    if (req.file) removerArquivo(req.file.filename);
    return res.status(422).render('admin/unidades/form', { titulo: 'Editar unidade', unidade: { ...unidade.toJSON(), ...req.body, id: unidade.id }, erro: 'Informe o nome da unidade.' });
  }
  const logoAntigo = unidade.logo;
  unidade.nome = nome;
  unidade.codigo = String(req.body.codigo || '').trim() || null;
  unidade.cidade = String(req.body.cidade || '').trim() || null;
  if (req.file) unidade.logo = `/uploads/logos/${req.file.filename}`;
  else if (req.body.remover_logo === '1') unidade.logo = null;
  await unidade.save();
  if (unidade.logo !== logoAntigo) removerArquivo(logoAntigo);
  res.flash('sucesso', 'Unidade atualizada.');
  res.redirect('/admin/unidades');
};

exports.excluir = async (req, res) => {
  const unidade = await Unidade.findByPk(req.params.id);
  if (!unidade) return res.redirect('/admin/unidades');
  try {
    await unidade.destroy();
    removerArquivo(unidade.logo);
    res.flash('sucesso', 'Unidade excluída.');
  } catch (e) {
    res.flash('erro', 'Não é possível excluir: existem eventos vinculados a esta unidade.');
  }
  res.redirect('/admin/unidades');
};
