const env = require('../config/env');
const { Usuario, Questao } = require('../models');
const authService = require('./authService');

// As 5 questões iniciais da exposição (todas na escala NPS de 0 a 10)
const QUESTOES_PADRAO = [
  'De 0 a 10, qual a probabilidade de você recomendar este trabalho a um amigo ou colega?',
  'De 0 a 10, qual a probabilidade de você recomendar este projeto como solução para um problema real?',
  'De 0 a 10, qual a probabilidade de você recomendar a apresentação desta equipe pela clareza e domínio do tema?',
  'De 0 a 10, qual a probabilidade de você recomendar este trabalho pela inovação e criatividade?',
  'De 0 a 10, qual a probabilidade de você recomendar a nossa unidade pela qualidade dos trabalhos expostos?',
];

async function executar() {
  // Usuário admin nativo (a senha só é gravada na criação)
  const [admin, criado] = await Usuario.findOrCreate({
    where: { email: env.admin.email },
    defaults: {
      nome: env.admin.nome,
      senhaHash: await authService.hashSenha(env.admin.senha),
      perfil: 'admin',
      ativo: true,
      nativo: true,
    },
  });
  if (criado) console.log(`Admin nativo criado: ${admin.email}`);

  if ((await Questao.count({ where: { padrao: true } })) === 0) {
    await Questao.bulkCreate(QUESTOES_PADRAO.map((texto) => ({ texto, padrao: true, ativa: true })));
    console.log('Questões padrão criadas.');
  }
}

module.exports = { executar };
