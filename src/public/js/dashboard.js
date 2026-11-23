// Dashboard em "tempo quase real": busca /api/eventos/:id/metricas a cada N segundos
// (180 s para o público; 120 s quando um admin está logado — definido pelo servidor).
(function () {
  var raiz = document.getElementById('dash');
  var eventoId = raiz.dataset.evento;
  var intervaloMs = Number(raiz.dataset.intervalo) * 1000;
  var COR = { prom: '#198754', neu: '#e0a800', det: '#dc3545', neutro: '#6c757d' };
  var PALETA = ['#0d6efd', '#6f42c1', '#d63384', '#fd7e14', '#20c997', '#6c757d', '#0dcaf0'];
  var charts = {};
  var proxima = Date.now() + intervaloMs;

  function $(id) { return document.getElementById(id); }
  function corNps(v) { return v == null ? '#adb5bd' : v < 0 ? COR.det : v < 50 ? COR.neu : COR.prom; }
  function classeNps(v) { return v == null ? '' : v < 0 ? 'nps-neg' : v < 50 ? 'nps-med' : 'nps-pos'; }
  function curto(t) { return t.length > 38 ? t.slice(0, 37) + '…' : t; }
  function fmtNps(v) { return v == null ? '—' : (v > 0 ? '+' : '') + v; }

  function grafico(id, type, labels, datasets, options) {
    var c = charts[id];
    if (c) { c.data.labels = labels; c.data.datasets = datasets; c.update(); return; }
    charts[id] = new Chart($(id), {
      type: type,
      data: { labels: labels, datasets: datasets },
      options: Object.assign({ responsive: true, maintainAspectRatio: false }, options || {})
    });
  }

  function alturaBarras(wrapId, n) { $(wrapId).style.height = Math.max(260, n * 34 + 60) + 'px'; }

  function celula(tr, texto, classe) {
    var td = document.createElement('td');
    td.textContent = texto;
    if (classe) td.className = classe;
    tr.appendChild(td);
  }

  function renderizar(m) {
    $('kpi-votos').textContent = m.totalVotos;
    $('kpi-avaliadores').textContent = m.totalAvaliadores;
    var nps = $('kpi-nps');
    nps.textContent = fmtNps(m.npsFeira.nps);
    nps.className = 'valor ' + classeNps(m.npsFeira.nps);
    $('kpi-prom').textContent = m.npsFeira.promotores;
    $('kpi-neu').textContent = m.npsFeira.neutros;
    $('kpi-det').textContent = m.npsFeira.detratores;

    var projs = m.projetos;
    var porNps = projs.slice().sort(function (a, b) { return (b.nps == null ? -999 : b.nps) - (a.nps == null ? -999 : a.nps); });

    alturaBarras('wrap-nps-projetos', projs.length);
    grafico('g-nps-projetos', 'bar', porNps.map(function (p) { return curto(p.titulo); }),
      [{ data: porNps.map(function (p) { return p.nps; }), backgroundColor: porNps.map(function (p) { return corNps(p.nps); }) }],
      { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { min: -100, max: 100 } } });

    alturaBarras('wrap-votos-projetos', projs.length);
    grafico('g-votos-projetos', 'bar', projs.map(function (p) { return curto(p.titulo); }),
      [{ data: projs.map(function (p) { return p.votos; }), backgroundColor: '#0d6efd' }],
      { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } });

    grafico('g-distribuicao', 'doughnut', ['Promotores (9–10)', 'Neutros (7–8)', 'Detratores (0–6)'],
      [{ data: [m.npsFeira.promotores, m.npsFeira.neutros, m.npsFeira.detratores], backgroundColor: [COR.prom, COR.neu, COR.det] }],
      { plugins: { legend: { position: 'bottom' } } });

    grafico('g-faixa', 'bar', m.faixaEtaria.rotulos,
      [{ data: m.faixaEtaria.valores, backgroundColor: '#6f42c1' }],
      { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } });

    grafico('g-relacao', 'doughnut', m.relacao.map(function (r) { return r.rotulo; }),
      [{ data: m.relacao.map(function (r) { return r.total; }), backgroundColor: PALETA }],
      { plugins: { legend: { position: 'bottom' } } });

    var tq = $('tbl-questoes');
    tq.replaceChildren();
    m.questoes.forEach(function (q) {
      var tr = document.createElement('tr');
      celula(tr, q.texto);
      celula(tr, q.respostas, 'text-end');
      celula(tr, fmtNps(q.nps), 'text-end fw-bold ' + classeNps(q.nps));
      tq.appendChild(tr);
    });
    if (!m.questoes.length) {
      var vazio = document.createElement('tr');
      celula(vazio, 'Ainda não há votos.');
      tq.appendChild(vazio);
    }

    var tp = $('tbl-projetos');
    tp.replaceChildren();
    porNps.forEach(function (p, i) {
      var tr = document.createElement('tr');
      celula(tr, i + 1);
      celula(tr, p.titulo);
      celula(tr, p.turma);
      celula(tr, p.votos, 'text-end');
      celula(tr, p.promotores, 'text-end');
      celula(tr, p.neutros, 'text-end');
      celula(tr, p.detratores, 'text-end');
      celula(tr, fmtNps(p.nps), 'text-end fw-bold ' + classeNps(p.nps));
      tp.appendChild(tr);
    });

    $('atualizado-em').textContent = new Date(m.atualizadoEm).toLocaleTimeString('pt-BR');
  }

  function carregar() {
    proxima = Date.now() + intervaloMs;
    // X-Background: a atualização automática não renova a sessão (logout por inatividade continua valendo)
    return fetch('/api/eventos/' + encodeURIComponent(eventoId) + '/metricas', {
      headers: { 'X-Background': '1' }, credentials: 'same-origin', cache: 'no-store'
    })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (m) { $('erro-atualizacao').classList.add('d-none'); renderizar(m); })
      .catch(function () { $('erro-atualizacao').classList.remove('d-none'); });
  }

  $('btn-atualizar').addEventListener('click', carregar);

  setInterval(function () {
    var s = Math.max(0, Math.ceil((proxima - Date.now()) / 1000));
    $('contagem').textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    if (Date.now() >= proxima) carregar();
  }, 1000);

  carregar();
})();
