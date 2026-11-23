const router = require('express').Router();
const wrap = require('../utils/asyncHandler');
const { exigirLogin, exigirAdmin } = require('../middlewares/auth');
const { uploadLogo } = require('../middlewares/upload');

const admin = require('../controllers/adminController');
const unidade = require('../controllers/unidadeController');
const evento = require('../controllers/eventoController');
const projeto = require('../controllers/projetoController');
const questao = require('../controllers/questaoController');
const usuario = require('../controllers/usuarioController');

// Todo o /admin exige login (qualquer perfil pode administrar eventos e questões)
router.use(exigirLogin);

router.get('/', wrap(admin.painel));

// Unidades (com upload do logo)
router.get('/unidades', wrap(unidade.index));
router.get('/unidades/novo', unidade.novo);
router.post('/unidades', uploadLogo, wrap(unidade.criar));
router.get('/unidades/:id/editar', wrap(unidade.editar));
router.post('/unidades/:id', uploadLogo, wrap(unidade.atualizar));
router.post('/unidades/:id/excluir', wrap(unidade.excluir));

// Eventos
router.get('/eventos', wrap(evento.index));
router.get('/eventos/novo', wrap(evento.novo));
router.post('/eventos', wrap(evento.criar));
router.get('/eventos/:id/editar', wrap(evento.editar));
router.post('/eventos/:id', wrap(evento.atualizar));
router.post('/eventos/:id/excluir', wrap(evento.excluir));
router.post('/eventos/:id/votacao', wrap(evento.alternarVotacao));
router.get('/eventos/:id/qr.svg', wrap(evento.qr));
router.get('/eventos/:id/questoes', wrap(evento.questoesForm));
router.post('/eventos/:id/questoes', wrap(evento.questoesSalvar));

// Projetos (TCCs) de um evento
router.get('/eventos/:eventoId/projetos', wrap(projeto.index));
router.get('/eventos/:eventoId/projetos/novo', wrap(projeto.novo));
router.post('/eventos/:eventoId/projetos', wrap(projeto.criar));
router.get('/eventos/:eventoId/projetos/:id/editar', wrap(projeto.editar));
router.post('/eventos/:eventoId/projetos/:id', wrap(projeto.atualizar));
router.post('/eventos/:eventoId/projetos/:id/excluir', wrap(projeto.excluir));

// Banco de questões
router.get('/questoes', wrap(questao.index));
router.get('/questoes/novo', questao.novo);
router.post('/questoes', wrap(questao.criar));
router.get('/questoes/:id/editar', wrap(questao.editar));
router.post('/questoes/:id', wrap(questao.atualizar));
router.post('/questoes/:id/excluir', wrap(questao.excluir));

// Usuários e sessões (somente admin)
router.get('/usuarios', exigirAdmin, wrap(usuario.index));
router.get('/usuarios/status.json', exigirAdmin, wrap(usuario.statusJson));
router.post('/usuarios/:id/ativo', exigirAdmin, wrap(usuario.alternarAtivo));
router.post('/usuarios/:id/perfil', exigirAdmin, wrap(usuario.alterarPerfil));
router.post('/usuarios/:id/derrubar', exigirAdmin, wrap(usuario.derrubarSessao));

module.exports = router;
