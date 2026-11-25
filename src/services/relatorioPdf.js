const PDFDocument = require('pdfkit');
const { analisar, zonaNps, DICAS_FUTURAS, MIN_AVALIACOES, fmt, pct } = require('./relatorioInsights');

const COR = { marca: '#b20000', texto: '#212529', suave: '#6c757d', linha: '#dee2e6', fundo: '#f8f9fa', prom: '#198754', neu: '#f0ad4e', det: '#dc3545', azul: '#0d6efd', roxo: '#6f42c1' };
const M = 50; // margem

function dataBR(d) {
  if (!d) return '—';
  const [a, m, dia] = String(d).slice(0, 10).split('-');
  return `${dia}/${m}/${a}`;
}

function garantirEspaco(doc, altura) {
  if (doc.y + altura > doc.page.height - 70) doc.addPage();
}

function titulo(doc, texto) {
  garantirEspaco(doc, 60);
  doc.moveDown(0.8);
  doc.font('Helvetica-Bold').fontSize(14).fillColor(COR.marca).text(texto, M, doc.y);
  const y = doc.y + 2;
  doc.moveTo(M, y).lineTo(doc.page.width - M, y).lineWidth(1).strokeColor(COR.marca).stroke();
  doc.y = y + 8;
  doc.fillColor(COR.texto);
}

function paragrafo(doc, texto, opts = {}) {
  doc.font('Helvetica').fontSize(opts.tamanho || 10).fillColor(opts.cor || COR.texto).text(texto, M, doc.y, { width: doc.page.width - 2 * M, align: 'left', ...opts.extra });
  doc.moveDown(0.4);
}

function item(doc, rotulo, texto) {
  const largura = doc.page.width - 2 * M - 12;
  doc.font('Helvetica').fontSize(10);
  const prefixo = rotulo ? `${rotulo}. ` : '';
  const h = doc.heightOfString(`${prefixo}${texto}`, { width: largura }) + 6;
  garantirEspaco(doc, h);
  const y = doc.y;
  doc.circle(M + 3, y + 5, 2).fill(COR.marca);
  doc.fillColor(COR.texto).font('Helvetica-Bold');
  if (prefixo) doc.text(prefixo, M + 12, y, { width: largura, continued: true });
  doc.font('Helvetica').text(texto, prefixo ? undefined : M + 12, prefixo ? undefined : y, { width: largura });
  doc.moveDown(0.35);
}

function kpis(doc, itens) {
  const largura = (doc.page.width - 2 * M - 10 * (itens.length - 1)) / itens.length;
  const y = doc.y;
  itens.forEach((k, i) => {
    const x = M + i * (largura + 10);
    doc.roundedRect(x, y, largura, 52, 4).fillAndStroke(COR.fundo, COR.linha);
    doc.fillColor(k.cor || COR.texto).font('Helvetica-Bold').fontSize(20).text(String(k.valor), x, y + 8, { width: largura, align: 'center' });
    doc.fillColor(COR.suave).font('Helvetica').fontSize(8).text(k.rotulo, x + 4, y + 35, { width: largura - 8, align: 'center' });
  });
  doc.y = y + 62;
}

// Barras horizontais simples: itens = [{ rotulo, valor, texto, cor }]
function barras(doc, itens, { max, min = 0, larguraRotulo = 150 } = {}) {
  const largura = doc.page.width - 2 * M - larguraRotulo - 60;
  const topo = Math.max(max ?? 0, ...itens.map((i) => i.valor));
  const intervalo = (topo - min) || 1;
  itens.forEach((it) => {
    garantirEspaco(doc, 18);
    const y = doc.y;
    doc.font('Helvetica').fontSize(8.5).fillColor(COR.texto).text(it.rotulo, M, y + 2, { width: larguraRotulo - 6, height: 11, ellipsis: true, lineBreak: false });
    const x0 = M + larguraRotulo;
    doc.rect(x0, y, largura, 12).fill(COR.fundo);
    const zero = x0 + ((0 - min) / intervalo) * largura;
    const fim = x0 + ((it.valor - min) / intervalo) * largura;
    doc.rect(Math.min(zero, fim), y, Math.max(Math.abs(fim - zero), 1), 12).fill(it.cor || COR.azul);
    doc.fillColor(COR.texto).fontSize(8.5).text(it.texto ?? String(it.valor), x0 + largura + 6, y + 2, { width: 54, lineBreak: false });
    doc.y = y + 17;
  });
  doc.moveDown(0.3);
}

function distribuicao(doc, p) {
  const total = p.promotores + p.neutros + p.detratores;
  if (!total) return;
  const largura = 160;
  const y = doc.y;
  let x = doc.x;
  [[p.promotores, COR.prom], [p.neutros, COR.neu], [p.detratores, COR.det]].forEach(([v, c]) => {
    const w = (v / total) * largura;
    if (w > 0) doc.rect(x, y, w, 8).fill(c);
    x += w;
  });
}

function tabela(doc, colunas, linhas) {
  const larguraTotal = doc.page.width - 2 * M;
  const somaPesos = colunas.reduce((s, c) => s + c.peso, 0);
  const larguras = colunas.map((c) => (c.peso / somaPesos) * larguraTotal);
  const desenharLinha = (valores, { cabecalho = false, zebra = false, cores = [] } = {}) => {
    garantirEspaco(doc, 20);
    const y = doc.y;
    if (cabecalho) doc.rect(M, y - 2, larguraTotal, 16).fill(COR.marca);
    else if (zebra) doc.rect(M, y - 2, larguraTotal, 16).fill(COR.fundo);
    let x = M;
    valores.forEach((v, i) => {
      doc.font(cabecalho ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(cabecalho ? '#ffffff' : cores[i] || COR.texto)
        .text(String(v), x + 3, y + 1, { width: larguras[i] - 6, height: 11, ellipsis: true, lineBreak: false, align: colunas[i].alinhar || 'left' });
      x += larguras[i];
    });
    doc.y = y + 16;
  };
  desenharLinha(colunas.map((c) => c.titulo), { cabecalho: true });
  linhas.forEach((l, i) => desenharLinha(l.valores, { zebra: i % 2 === 1, cores: l.cores }));
  doc.moveDown(0.5);
}

const fmtNps = (n) => (n === null || n === undefined ? '—' : String(n));
const corNps = (n) => (n === null || n === undefined ? COR.suave : zonaNps(n).cor);

/**
 * Monta o PDF do relatório e o escreve em `saida` (stream, ex.: res).
 * dados: { evento, unidade, metricas, detalhe }
 */
function gerarRelatorioPdf({ evento, unidade, metricas: m, detalhe }, saida) {
  const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 60, left: M, right: M }, bufferPages: true, info: { Title: `Relatório — ${evento.nome}`, Author: 'AvaliaTCC' } });
  doc.pipe(saida);
  const a = analisar(m, detalhe);

  // Cabeçalho
  doc.rect(0, 0, doc.page.width, 90).fill(COR.marca);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20).text('Relatório da Exposição de TCC', M, 26);
  doc.font('Helvetica').fontSize(11).text(`${evento.nome} · ${evento.ano}`, M, 54);
  doc.y = 105;
  doc.fillColor(COR.texto).font('Helvetica').fontSize(10);
  paragrafo(doc, `Unidade: ${unidade ? unidade.nome : '—'}    |    Data do evento: ${dataBR(evento.dataEvento)}    |    Gerado em: ${new Date().toLocaleString('pt-BR')}`, { cor: COR.suave, tamanho: 9 });

  kpis(doc, [
    { valor: m.totalVotos, rotulo: 'Avaliações (votante × trabalho)' },
    { valor: m.totalAvaliadores, rotulo: 'Pessoas votantes' },
    { valor: m.projetos.length, rotulo: 'Trabalhos expostos' },
    { valor: fmtNps(m.npsFeira.nps), rotulo: a.zona ? `NPS geral · ${a.zona.nome}` : 'NPS geral', cor: corNps(m.npsFeira.nps) },
  ]);

  titulo(doc, '1. Resumo executivo');
  a.resumo.forEach((t) => item(doc, '', t));

  if (m.totalAvaliadores) {
    titulo(doc, '2. Perfil do público');
    const totalRel = m.relacao.reduce((s, r) => s + r.total, 0);
    doc.font('Helvetica-Bold').fontSize(10).text('Relação com a unidade', M, doc.y);
    doc.moveDown(0.3);
    barras(doc, m.relacao.map((r) => ({ rotulo: r.rotulo, valor: r.total, texto: `${r.total} (${pct(r.total, totalRel)}%)`, cor: COR.azul })));
    doc.font('Helvetica-Bold').fontSize(10).text('Faixa etária', M, doc.y);
    doc.moveDown(0.3);
    const totalIdade = m.faixaEtaria.valores.reduce((s, v) => s + v, 0);
    barras(doc, m.faixaEtaria.rotulos.map((r, i) => ({ rotulo: r, valor: m.faixaEtaria.valores[i], texto: `${m.faixaEtaria.valores[i]} (${pct(m.faixaEtaria.valores[i], totalIdade)}%)`, cor: COR.roxo })));

    titulo(doc, '3. Avaliação por critério');
    tabela(doc, [
      { titulo: 'Critério', peso: 6 }, { titulo: 'Notas', peso: 1, alinhar: 'right' }, { titulo: 'Prom.', peso: 1, alinhar: 'right' },
      { titulo: 'Neutr.', peso: 1, alinhar: 'right' }, { titulo: 'Detr.', peso: 1, alinhar: 'right' }, { titulo: 'NPS', peso: 1, alinhar: 'right' },
    ], m.questoes.map((q) => ({ valores: [q.texto, q.respostas, q.promotores, q.neutros, q.detratores, fmtNps(q.nps)], cores: [null, null, null, null, null, corNps(q.nps)] })));

    titulo(doc, '4. Ranking dos trabalhos');
    paragrafo(doc, `Ordenado por NPS (mínimo de ${MIN_AVALIACOES} avaliadores para entrar no ranking). Trabalhos com menos avaliações aparecem ao final, sem posição.`, { cor: COR.suave, tamanho: 8.5 });
    const fora = a.projetos.filter((p) => !a.ranking.includes(p)).sort((x, y) => y.votos - x.votos);
    const linhas = [...a.ranking, ...fora].map((p) => {
      const pos = a.ranking.indexOf(p);
      return {
        valores: [pos >= 0 ? `${pos + 1}º` : '—', `${p.titulo} (${p.turma})`, p.votos, p.votos ? fmt(p.mediaNota) : '—', fmtNps(p.nps), `${p.promotores}/${p.neutros}/${p.detratores}`],
        cores: [null, null, null, null, corNps(p.votos >= MIN_AVALIACOES ? p.nps : null), null],
      };
    });
    tabela(doc, [
      { titulo: '#', peso: 0.7 }, { titulo: 'Trabalho (turma)', peso: 7 }, { titulo: 'Avaliadores', peso: 1.6, alinhar: 'right' },
      { titulo: 'Média', peso: 1.1, alinhar: 'right' }, { titulo: 'NPS', peso: 1, alinhar: 'right' }, { titulo: 'P/N/D', peso: 1.8, alinhar: 'right' },
    ], linhas);
    if (a.ranking.length) {
      doc.font('Helvetica-Bold').fontSize(10).fillColor(COR.texto).text('NPS por trabalho', M, doc.y);
      doc.moveDown(0.3);
      barras(doc, a.ranking.map((p) => ({ rotulo: p.titulo, valor: p.nps, texto: String(p.nps), cor: corNps(p.nps) })), { min: -100, max: 100 });
    }

    titulo(doc, '5. Detalhe por trabalho');
    [...a.ranking, ...fora].forEach((p) => {
      garantirEspaco(doc, 70);
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COR.texto).text(p.titulo, M, doc.y, { width: doc.page.width - 2 * M });
      doc.font('Helvetica').fontSize(8.5).fillColor(COR.suave).text(
        `${[p.curso, p.turma, p.ano].filter(Boolean).join(' · ')}  |  ${p.votos} avaliador(es)  |  média ${p.votos ? fmt(p.mediaNota) : '—'}  |  NPS ${fmtNps(p.nps)}`, M, doc.y);
      doc.moveDown(0.2);
      if (p.criterios.length) {
        tabela(doc, [{ titulo: 'Critério', peso: 7 }, { titulo: 'Média', peso: 1, alinhar: 'right' }, { titulo: 'NPS', peso: 1, alinhar: 'right' }],
          p.criterios.map((c) => ({ valores: [c.texto, fmt(c.media), fmtNps(c.nps)], cores: [null, null, corNps(c.respostas >= MIN_AVALIACOES ? c.nps : null)] })));
      } else {
        paragrafo(doc, 'Sem avaliações registradas.', { cor: COR.suave, tamanho: 9 });
      }
    });

    titulo(doc, '6. Insights');
    if (a.insights.length) a.insights.forEach((i) => item(doc, i.titulo, i.texto));
    else paragrafo(doc, 'Dados insuficientes para gerar insights adicionais.');

    titulo(doc, '7. Recomendações para a gestão escolar');
    if (a.recomendacoes.length) a.recomendacoes.forEach((r) => item(doc, r.titulo, r.texto));
    else paragrafo(doc, 'Os resultados não indicaram ações específicas além das sugestões gerais da próxima seção.');
  }

  titulo(doc, m.totalAvaliadores ? '8. Dicas para futuras implementações' : '2. Dicas para futuras implementações');
  DICAS_FUTURAS.forEach(([t, x]) => item(doc, t, x));

  titulo(doc, 'Nota metodológica');
  paragrafo(doc, 'NPS (Net Promoter Score) = % de promotores (notas 9–10) − % de detratores (notas 0–6); notas 7–8 são neutras. Resultado de −100 a +100. Zonas de referência: abaixo de 0 crítica; 0–49 aperfeiçoamento; 50–74 qualidade; 75 ou mais excelência. "Avaliadores" são pessoas distintas que avaliaram o trabalho. Por segurança estatística, rankings e comparações ignoram trabalhos e critérios com menos de ' + MIN_AVALIACOES + ' avaliadores.', { tamanho: 9 });
  paragrafo(doc, 'Privacidade (LGPD): o sistema não armazena nome nem data de nascimento dos votantes; guarda apenas um código irreversível (hash), a idade e a relação com a unidade. Os insights são gerados automaticamente por regras sobre os dados e devem ser interpretados com o contexto local.', { tamanho: 9 });

  // Rodapé com paginação
  const paginas = doc.bufferedPageRange();
  for (let i = 0; i < paginas.count; i += 1) {
    doc.switchToPage(paginas.start + i);
    doc.page.margins.bottom = 0;
    doc.font('Helvetica').fontSize(8).fillColor(COR.suave).text(`AvaliaTCC · ${evento.nome} · Página ${i + 1} de ${paginas.count}`, M, doc.page.height - 35, { width: doc.page.width - 2 * M, align: 'center', lineBreak: false });
  }
  doc.end();
}

module.exports = { gerarRelatorioPdf };
