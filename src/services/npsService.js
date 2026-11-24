const { QueryTypes } = require('sequelize');
const { sequelize } = require('../models');

// Regra do NPS: 0–6 detratores, 7–8 neutros, 9–10 promotores
const SQL_FAIXAS = `
  COUNT(v.id) AS respostas,
  COALESCE(SUM(CASE WHEN v.nota >= 9 THEN 1 ELSE 0 END), 0) AS promotores,
  COALESCE(SUM(CASE WHEN v.nota BETWEEN 7 AND 8 THEN 1 ELSE 0 END), 0) AS neutros,
  COALESCE(SUM(CASE WHEN v.nota <= 6 THEN 1 ELSE 0 END), 0) AS detratores`;

const FAIXAS_ETARIAS = [
  { rotulo: 'Até 14', max: 14 },
  { rotulo: '15–17', max: 17 },
  { rotulo: '18–24', max: 24 },
  { rotulo: '25–34', max: 34 },
  { rotulo: '35–44', max: 44 },
  { rotulo: '45–59', max: 59 },
  { rotulo: '60+', max: Infinity },
];

const ROTULOS_RELACAO = {
  aluno: 'Aluno',
  ex_aluno: 'Ex-aluno',
  responsavel: 'Responsável',
  professor: 'Professor',
};

const num = (v) => Number(v) || 0;

function calcularNps({ promotores, neutros, detratores }) {
  const total = promotores + neutros + detratores;
  if (!total) return null; // sem votos ainda
  return Math.round(((promotores - detratores) / total) * 100);
}

function montarLinha(r) {
  const base = {
    respostas: num(r.respostas),
    promotores: num(r.promotores),
    neutros: num(r.neutros),
    detratores: num(r.detratores),
  };
  return { ...base, nps: calcularNps(base) };
}

async function metricasEvento(eventoId) {
  const replacements = { eventoId };
  const q = (sql) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });

  const [projetos, questoes, geral, totais, etarios, relacoes] = await Promise.all([
    q(`SELECT p.id, p.titulo, p.turma, p.ano, p.curso,
              COUNT(DISTINCT v.votante_id) AS votos, ${SQL_FAIXAS}
         FROM projetos p
         LEFT JOIN votos v ON v.projeto_id = p.id
        WHERE p.evento_id = :eventoId
        GROUP BY p.id
        ORDER BY p.titulo`),
    q(`SELECT q.id, q.texto, ${SQL_FAIXAS}
         FROM questoes q
         JOIN votos v ON v.questao_id = q.id
        WHERE v.evento_id = :eventoId
        GROUP BY q.id
        ORDER BY q.id`),
    q(`SELECT ${SQL_FAIXAS} FROM votos v WHERE v.evento_id = :eventoId`),
    q(`SELECT COUNT(DISTINCT (v.votante_id, v.projeto_id)) AS votos,
              COUNT(DISTINCT v.votante_id) AS avaliadores
         FROM votos v WHERE v.evento_id = :eventoId`),
    q(`SELECT vt.idade
         FROM votantes vt
        WHERE vt.evento_id = :eventoId
          AND vt.idade IS NOT NULL
          AND EXISTS (SELECT 1 FROM votos v WHERE v.votante_id = vt.id)`),
    q(`SELECT vt.relacao, COUNT(*) AS total
         FROM votantes vt
        WHERE vt.evento_id = :eventoId
          AND EXISTS (SELECT 1 FROM votos v WHERE v.votante_id = vt.id)
        GROUP BY vt.relacao`),
  ]);

  const contagemEtaria = FAIXAS_ETARIAS.map(() => 0);
  etarios.forEach(({ idade }) => {
    const i = FAIXAS_ETARIAS.findIndex((f) => idade <= f.max);
    if (i >= 0) contagemEtaria[i] += 1;
  });

  const porRelacao = Object.keys(ROTULOS_RELACAO).map((chave) => ({
    rotulo: ROTULOS_RELACAO[chave],
    total: num((relacoes.find((r) => r.relacao === chave) || {}).total),
  }));

  return {
    atualizadoEm: new Date().toISOString(),
    totalVotos: num(totais[0].votos), // avaliações (votante × projeto)
    totalAvaliadores: num(totais[0].avaliadores), // pessoas distintas
    totalRespostas: num(geral[0].respostas), // notas individuais
    npsFeira: montarLinha(geral[0]),
    projetos: projetos.map((p) => ({
      id: p.id,
      titulo: p.titulo,
      turma: p.turma,
      ano: p.ano,
      curso: p.curso,
      votos: num(p.votos),
      ...montarLinha(p),
    })),
    questoes: questoes.map((x) => ({ id: x.id, texto: x.texto, ...montarLinha(x) })),
    faixaEtaria: { rotulos: FAIXAS_ETARIAS.map((f) => f.rotulo), valores: contagemEtaria },
    relacao: porRelacao,
  };
}

module.exports = { metricasEvento, calcularNps, FAIXAS_ETARIAS, ROTULOS_RELACAO };
