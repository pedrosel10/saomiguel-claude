/* São Miguel — scripts do site */
(function () {
  'use strict';

  /* Abas de serviços. Segue o padrão ARIA: só a aba ativa fica na ordem de
     tabulação, e as setas navegam entre elas. */
  function iniciarAbas(raiz) {
    var abas = Array.prototype.slice.call(raiz.querySelectorAll('[role="tab"]'));
    if (!abas.length) return;

    function ativar(indice, moverFoco) {
      abas.forEach(function (aba, i) {
        var selecionada = i === indice;
        var painel = document.getElementById(aba.getAttribute('aria-controls'));

        aba.setAttribute('aria-selected', String(selecionada));
        if (selecionada) {
          aba.removeAttribute('tabindex');
        } else {
          aba.setAttribute('tabindex', '-1');
        }
        if (painel) painel.hidden = !selecionada;
      });

      if (moverFoco) abas[indice].focus();
    }

    abas.forEach(function (aba, i) {
      aba.addEventListener('click', function () {
        ativar(i, false);
      });

      aba.addEventListener('keydown', function (evento) {
        var destino = null;

        if (evento.key === 'ArrowRight') destino = (i + 1) % abas.length;
        else if (evento.key === 'ArrowLeft') destino = (i - 1 + abas.length) % abas.length;
        else if (evento.key === 'Home') destino = 0;
        else if (evento.key === 'End') destino = abas.length - 1;

        if (destino !== null) {
          evento.preventDefault();
          ativar(destino, true);
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-abas]').forEach(iniciarAbas);
  });
})();
