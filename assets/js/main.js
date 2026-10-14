/* Multi Medica Varese – JS condiviso (nessuna dipendenza, nessun tracking). */
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  function norm(s) {
    return (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function initNav() {
    var btn = document.querySelector('.nav-toggle');
    var nav = document.getElementById('menu');
    if (!btn || !nav) return;
    function set(open) {
      nav.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    btn.addEventListener('click', function () {
      set(btn.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') {
        set(false);
        btn.focus();
      }
    });
  }

  function initFilters() {
    var inputs = document.querySelectorAll('input[data-filter]');
    Array.prototype.forEach.call(inputs, function (input) {
      var list = document.querySelector(input.getAttribute('data-filter'));
      var status = document.getElementById(input.getAttribute('aria-describedby'));
      if (!list) return;
      var items = list.querySelectorAll('[data-filter-item]');
      var noun = input.getAttribute('data-noun') || 'risultati';
      var nounOne = input.getAttribute('data-noun-one') || 'risultato';
      var run = function () {
        var terms = norm(input.value).split(/\s+/).filter(Boolean);
        var shown = 0;
        Array.prototype.forEach.call(items, function (it) {
          var hay = it.getAttribute('data-search') || norm(it.textContent);
          var ok = terms.every(function (t) { return hay.indexOf(t) !== -1; });
          it.hidden = !ok;
          if (ok) shown++;
        });
        if (status) {
          if (!terms.length) status.textContent = items.length + ' ' + noun;
          else if (shown === 0) status.textContent = 'Nessun risultato. Provi con un altro termine o chiami la segreteria.';
          else status.textContent = shown + (shown === 1 ? ' risultato' : ' risultati') + ' su ' + items.length;
        }
      };
      input.addEventListener('input', run);
      run();
    });
  }

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }
  ready(function () { initNav(); initFilters(); });
})();
