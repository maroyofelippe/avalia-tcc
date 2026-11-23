// Comportamentos globais: confirmação de exclusão e controle de inatividade da sessão.
(function () {
  document.addEventListener('submit', function (e) {
    var msg = e.target.getAttribute('data-confirm');
    if (msg && !window.confirm(msg)) e.preventDefault();
  });

  var body = document.body;
  if (body.dataset.logado !== '1') return;

  var limite = Number(body.dataset.sessaoMin) * 60 * 1000; // 30 min por padrão
  var AVISO_MS = 2 * 60 * 1000;
  var ultimaInteracao = Date.now();
  var ultimoPing = Date.now();
  var aviso = document.getElementById('aviso-sessao');
  var contagem = document.getElementById('aviso-contagem');

  function ping() {
    ultimoPing = Date.now();
    fetch('/sessao/ping', { method: 'POST', credentials: 'same-origin' }).catch(function () {});
  }

  function interagiu() {
    ultimaInteracao = Date.now();
    aviso.classList.add('d-none');
    if (Date.now() - ultimoPing > 60 * 1000) ping(); // renova a sessão no servidor (no máx. 1x/min)
  }

  ['click', 'keydown', 'touchstart', 'scroll', 'mousemove'].forEach(function (ev) {
    window.addEventListener(ev, interagiu, { passive: true });
  });
  document.getElementById('aviso-continuar').addEventListener('click', function () {
    ping();
    interagiu();
  });

  setInterval(function () {
    var restante = limite - (Date.now() - ultimaInteracao);
    if (restante <= 0) {
      window.location.href = '/admin'; // o servidor confirma a expiração e redireciona ao login
    } else if (restante <= AVISO_MS) {
      var s = Math.ceil(restante / 1000);
      contagem.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
      aviso.classList.remove('d-none');
    }
  }, 1000);
})();
