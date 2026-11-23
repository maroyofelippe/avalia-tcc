// Tela de usuários: tempo logado em contagem local + consulta de status a cada 30 s
// (em segundo plano, sem renovar a sessão do admin).
(function () {
  var tabela = document.getElementById('tbl-usuarios');
  var t0 = Date.now();

  function fmt(s) {
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(x).padStart(2, '0');
  }

  function pintarTempo() {
    var decorrido = Math.floor((Date.now() - t0) / 1000);
    tabela.querySelectorAll('td[data-col="tempo"]').forEach(function (td) {
      if (td.dataset.online === '1') td.textContent = fmt(Number(td.dataset.base) + decorrido);
    });
  }

  function atualizar() {
    fetch('/admin/usuarios/status.json', { headers: { 'X-Background': '1' }, credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (lista) {
        t0 = Date.now();
        lista.forEach(function (u) {
          var tr = tabela.querySelector('tr[data-id="' + u.id + '"]');
          if (!tr) return;
          var badge = tr.querySelector('td[data-col="online"] .badge');
          badge.textContent = u.online ? '● Online' : 'Offline';
          badge.className = 'badge text-bg-' + (u.online ? 'success' : 'secondary');
          var td = tr.querySelector('td[data-col="tempo"]');
          td.dataset.online = u.online ? '1' : '0';
          td.dataset.base = u.segundosLogado;
          if (!u.online) td.textContent = '—';
        });
        pintarTempo();
      })
      .catch(function () { /* tenta de novo no próximo ciclo */ });
  }

  pintarTempo();
  setInterval(pintarTempo, 1000);
  setInterval(atualizar, 30 * 1000);
})();
