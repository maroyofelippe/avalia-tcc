// Análise automática dos resultados do evento: insights e recomendações para a gestão escolar.
// Regras determinísticas sobre os dados (sem IA externa), para que o relatório seja reproduzível.

const MIN_AVALIACOES = 3; // abaixo disso a nota de um trabalho/critério é pouco confiável
const fmt = (n, d = 1) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: d });
const pct = (parte, total) => (total ? Math.round((parte / total) * 100) : 0);

function zonaNps(nps) {
  if (nps === null || nps === undefined) return null;
  if (nps < 0) return { nome: 'Crítica', cor: '#dc3545' };
  if (nps < 50) return { nome: 'Aperfeiçoamento', cor: '#f0ad4e' };
  if (nps < 75) return { nome: 'Qualidade', cor: '#198754' };
  return { nome: 'Excelência', cor: '#0a6b3d' };
}

const mediaDe = (linhas) => {
  const total = linhas.reduce((s, l) => s + l.respostas, 0);
  return total ? linhas.reduce((s, l) => s + l.media * l.respostas, 0) / total : 0;
};

// Média das notas (0–10) por projeto, calculada a partir do detalhe projeto × questão
function mediasPorProjeto(detalhe) {
  const mapa = {};
  detalhe.forEach((d) => {
    (mapa[d.projetoId] = mapa[d.projetoId] || []).push(d);
  });
  return mapa;
}

function analisar(m, detalhe) {
  const insights = [];
  const recomendacoes = [];
  const add = (lista, titulo, texto) => lista.push({ titulo, texto });

  const porProjeto = mediasPorProjeto(detalhe);
  const projetos = m.projetos.map((p) => ({ ...p, mediaNota: mediaDe(porProjeto[p.id] || []), criterios: porProjeto[p.id] || [] }));
  const comVotos = projetos.filter((p) => p.votos >= MIN_AVALIACOES && p.nps !== null);
  const ranking = [...comVotos].sort((a, b) => b.nps - a.nps || b.mediaNota - a.mediaNota);

  const resumo = [];
  if (!m.totalAvaliadores) {
    return { projetos, ranking, resumo: ['Ainda não há avaliações registradas neste evento.'], insights, recomendacoes, zona: null, criterios: [] };
  }

  const zona = zonaNps(m.npsFeira.nps);
  const mediaGeral = mediaDe(detalhe);
  resumo.push(`${m.totalAvaliadores} pessoas registraram ${m.totalVotos} avaliações de ${projetos.length} trabalho(s), totalizando ${m.totalRespostas} notas.`);
  resumo.push(`NPS geral da exposição: ${m.npsFeira.nps} (zona de ${zona.nome.toLowerCase()}); nota média ${fmt(mediaGeral)} de 10. ${pct(m.npsFeira.promotores, m.npsFeira.respostas)}% das notas foram de promotores, ${pct(m.npsFeira.neutros, m.npsFeira.respostas)}% neutras e ${pct(m.npsFeira.detratores, m.npsFeira.respostas)}% de detratores.`);
  if (ranking.length) {
    const top = ranking[0];
    const fim = ranking[ranking.length - 1];
    resumo.push(`Maior NPS: "${top.titulo}" (${top.nps}). Menor NPS: "${fim.titulo}" (${fim.nps}).`);
  }

  // 1. Amostra
  if (m.totalAvaliadores < 30) {
    add(insights, 'Amostra pequena', `Apenas ${m.totalAvaliadores} pessoas avaliaram. Com amostras pequenas, uma única nota altera bastante o NPS; interprete as comparações como indícios, não como conclusões.`);
  }

  // 2. Resultado geral
  const textoZona = {
    Crítica: 'há mais detratores que promotores; é preciso investigar as causas antes da próxima edição.',
    Aperfeiçoamento: 'o público aprova, mas há espaço claro para evoluir, principalmente nos critérios mais fracos.',
    Qualidade: 'a exposição é bem avaliada; o foco passa a ser manter o padrão e reduzir as diferenças entre trabalhos.',
    Excelência: 'resultado de excelência; vale documentar as práticas que levaram a ele para replicá-las.',
  };
  add(insights, `Desempenho geral na zona de ${zona.nome.toLowerCase()}`, `NPS ${m.npsFeira.nps}: ${textoZona[zona.nome]}`);

  // 3. Critérios
  const criterios = m.questoes.filter((q) => q.respostas >= MIN_AVALIACOES && q.nps !== null).sort((a, b) => b.nps - a.nps);
  if (criterios.length >= 2) {
    const melhor = criterios[0];
    const pior = criterios[criterios.length - 1];
    if (melhor.nps - pior.nps >= 10) {
      add(insights, 'Critério mais forte e mais fraco', `Melhor critério: "${melhor.texto}" (NPS ${melhor.nps}). Mais fraco: "${pior.texto}" (NPS ${pior.nps}), diferença de ${melhor.nps - pior.nps} pontos.`);
      add(recomendacoes, 'Priorizar o critério mais fraco', `Transforme "${pior.texto}" em meta pedagógica da próxima edição: oriente as equipes sobre esse ponto desde o início do semestre e inclua-o no roteiro de ensaio das apresentações.`);
    }
  }

  // 4. Heterogeneidade entre trabalhos
  if (ranking.length >= 3) {
    const amplitude = ranking[0].nps - ranking[ranking.length - 1].nps;
    if (amplitude >= 40) {
      add(insights, 'Qualidade desigual entre os trabalhos', `A diferença entre o melhor e o pior NPS é de ${amplitude} pontos, sinal de que a experiência do público depende muito da equipe.`);
      add(recomendacoes, 'Padronizar o acompanhamento dos trabalhos', 'Defina uma rubrica comum, marcos de entrega intermediários e um ensaio geral de apresentação para todas as turmas, reduzindo a variação entre equipes.');
    }
    const abaixo = ranking.filter((p) => p.nps < 0);
    if (abaixo.length) {
      add(insights, 'Trabalhos com NPS negativo', `${abaixo.length} trabalho(s) tiveram mais detratores que promotores: ${abaixo.map((p) => `"${p.titulo}"`).join(', ')}.`);
      add(recomendacoes, 'Devolutiva às equipes com NPS negativo', 'Compartilhe o detalhamento por critério com orientadores e equipes e combine um plano de melhoria curto, tratando a avaliação como aprendizado e não como punição.');
    }
  }

  // 5. Pontos fracos recorrentes por critério em cada trabalho
  const fraquezas = {};
  comVotos.forEach((p) => {
    const validos = p.criterios.filter((c) => c.respostas >= MIN_AVALIACOES && c.nps !== null);
    if (validos.length < 2) return;
    const pior = [...validos].sort((a, b) => a.nps - b.nps)[0];
    fraquezas[pior.texto] = (fraquezas[pior.texto] || 0) + 1;
  });
  const recorrente = Object.entries(fraquezas).sort((a, b) => b[1] - a[1])[0];
  if (recorrente && recorrente[1] >= 2 && recorrente[1] / comVotos.length >= 0.4) {
    add(insights, 'Ponto fraco recorrente', `"${recorrente[0]}" foi o critério mais fraco em ${recorrente[1]} de ${comVotos.length} trabalhos, o que indica uma lacuna de formação e não de equipes isoladas.`);
    add(recomendacoes, 'Atacar a lacuna na formação', 'Inclua oficinas ou aulas de apoio sobre esse tema ao longo do curso (por exemplo, comunicação, documentação ou demonstração prática do produto).');
  }

  // 6. Cursos / turmas
  const porCurso = {};
  projetos.forEach((p) => {
    const chave = (p.curso || '').trim() || 'Não informado';
    const c = (porCurso[chave] = porCurso[chave] || { curso: chave, promotores: 0, neutros: 0, detratores: 0, trabalhos: 0 });
    c.promotores += p.promotores;
    c.neutros += p.neutros;
    c.detratores += p.detratores;
    c.trabalhos += 1;
  });
  const cursos = Object.values(porCurso)
    .map((c) => {
      const total = c.promotores + c.neutros + c.detratores;
      return { ...c, total, nps: total ? Math.round(((c.promotores - c.detratores) / total) * 100) : null };
    })
    .filter((c) => c.total >= MIN_AVALIACOES && c.nps !== null)
    .sort((a, b) => b.nps - a.nps);
  if (cursos.length >= 2 && cursos[0].nps - cursos[cursos.length - 1].nps >= 15) {
    const a = cursos[0];
    const b = cursos[cursos.length - 1];
    add(insights, 'Diferença entre cursos', `${a.curso} obteve NPS ${a.nps} contra ${b.nps} de ${b.curso}.`);
    add(recomendacoes, 'Troca de experiências entre cursos', `Promova uma conversa entre coordenações de ${a.curso} e ${b.curso} para identificar práticas de orientação e preparação que expliquem a diferença.`);
  }

  // 7. Participação e cobertura
  const semAvaliacao = projetos.filter((p) => p.votos === 0);
  const poucas = projetos.filter((p) => p.votos > 0 && p.votos < MIN_AVALIACOES);
  if (semAvaliacao.length || poucas.length) {
    const lista = [...semAvaliacao, ...poucas].slice(0, 6).map((p) => `"${p.titulo}"`).join(', ');
    add(insights, 'Trabalhos pouco avaliados', `${semAvaliacao.length} trabalho(s) sem nenhuma avaliação e ${poucas.length} com menos de ${MIN_AVALIACOES}: ${lista}. Seus resultados não são conclusivos.`);
    add(recomendacoes, 'Distribuir melhor o público entre os estandes', `Coloque o QR Code de votação em cada estande, organize um roteiro de visitação e reserve um horário em que todos os trabalhos sejam apresentados.`);
  }
  const mediaPorPessoa = m.totalVotos / m.totalAvaliadores;
  if (projetos.length >= 4 && mediaPorPessoa < 2) {
    add(insights, 'Baixa avaliação por visitante', `Cada pessoa avaliou, em média, ${fmt(mediaPorPessoa)} trabalho(s) de ${projetos.length} disponíveis.`);
    add(recomendacoes, 'Incentivar mais avaliações por visitante', 'Reduza o tempo para votar (poucas perguntas), mostre no telão o progresso de avaliações e considere um pequeno incentivo de participação (certificado, sorteio de brindes institucionais).');
  }

  // 8. Público
  const totalRel = m.relacao.reduce((s, r) => s + r.total, 0);
  if (totalRel) {
    const maior = [...m.relacao].sort((a, b) => b.total - a.total)[0];
    if (pct(maior.total, totalRel) >= 60) {
      add(insights, 'Público concentrado em um perfil', `${pct(maior.total, totalRel)}% dos votantes são "${maior.rotulo}". Avaliações de um só perfil tendem a refletir uma só perspectiva.`);
    }
    const externos = m.relacao.filter((r) => ['Ex-aluno', 'Professor'].includes(r.rotulo)).reduce((s, r) => s + r.total, 0);
    if (pct(externos, totalRel) < 15) {
      add(recomendacoes, 'Ampliar a presença de professores e ex-alunos', 'Convide egressos e docentes de outras áreas: eles trazem uma visão de mercado e de rigor técnico que complementa a avaliação do público interno.');
    }
  }
  const idades = m.faixaEtaria.valores.reduce((s, v) => s + v, 0);
  if (idades) {
    const i = m.faixaEtaria.valores.indexOf(Math.max(...m.faixaEtaria.valores));
    add(insights, 'Faixa etária predominante', `A maior parte do público está na faixa ${m.faixaEtaria.rotulos[i]} (${pct(m.faixaEtaria.valores[i], idades)}% dos votantes com idade registrada).`);
  }

  // 9. Boas práticas
  if (ranking.length >= 3) {
    const destaques = ranking.slice(0, 3).map((p) => `"${p.titulo}"`).join(', ');
    add(recomendacoes, 'Valorizar e documentar os melhores trabalhos', `Reconheça publicamente ${destaques} e peça às equipes que compartilhem o que fizeram (roteiro, demonstração, materiais) como referência para as próximas turmas.`);
  }

  return { projetos, ranking, resumo, insights, recomendacoes, zona, criterios, cursos };
}

// Sugestões fixas de evolução do processo de avaliação e da plataforma
const DICAS_FUTURAS = [
  ['Comentário aberto opcional', 'Acrescente um campo de texto curto ("o que mais gostou / o que melhoraria"). Os comentários explicam o "porquê" das notas e alimentam a devolutiva às equipes.'],
  ['Comparar edições ao longo dos anos', 'Mantenha as mesmas perguntas entre edições para acompanhar a evolução do NPS por critério, curso e unidade, e estabeleça metas anuais.'],
  ['Separar a visão do público da visão da banca', 'Registre a nota técnica da banca de forma independente e cruze com o NPS do público: divergências grandes indicam trabalhos tecnicamente sólidos mas pouco comunicados (ou o contrário).'],
  ['QR Code individual por estande', 'Com um link por trabalho o visitante avalia na hora, aumentando a cobertura e eliminando a escolha manual na lista.'],
  ['Devolutiva automática às equipes', 'Envie a cada equipe e orientador um resumo com NPS, média e pontos fortes e fracos do seu trabalho logo após o evento.'],
  ['Acompanhamento de egressos', 'Aplique o mesmo NPS a ex-alunos meses depois para verificar se o curso os preparou para o mercado, e use o resultado no planejamento do currículo.'],
  ['Critérios ligados a empregabilidade e impacto', 'Avalie também aplicabilidade real, viabilidade e impacto social dos projetos, alinhando a exposição às competências cobradas pelo mercado.'],
  ['Revisão periódica das questões', 'Reavalie o banco de questões a cada edição; elimine perguntas com pouca variação de nota (não discriminam) e inclua temas novos de interesse da gestão.'],
];

module.exports = { analisar, zonaNps, DICAS_FUTURAS, MIN_AVALIACOES, fmt, pct };
