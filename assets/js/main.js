/* São Miguel — scripts do site */
(function () {
  'use strict';

  var semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Quebra a citação em palavras, para elas acenderem em sequência. */
  function prepararCitacao(bloco) {
    var texto = bloco.textContent.trim().replace(/\s+/g, ' ');

    bloco.textContent = '';
    texto.split(' ').forEach(function (palavra, i) {
      var span = document.createElement('span');
      span.className = 'citacao__palavra';
      span.textContent = palavra;
      span.style.transitionDelay = (i * 0.045).toFixed(3) + 's';
      bloco.appendChild(span);
      bloco.appendChild(document.createTextNode(' '));
    });
  }

  function observar(alvos, aoEntrar, margem) {
    if (!('IntersectionObserver' in window)) {
      alvos.forEach(aoEntrar);
      return;
    }

    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        aoEntrar(entrada.target);
        observador.unobserve(entrada.target);
      });
    }, { rootMargin: margem || '0px 0px -12% 0px' });

    alvos.forEach(function (alvo) {
      observador.observe(alvo);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var citacao = document.querySelector('[data-revelar-palavras]');
    if (citacao) prepararCitacao(citacao);

    if (semMovimento) return;

    /* Só agora os elementos podem começar invisíveis: se o script falhar
       antes daqui, a página continua legível. */
    document.documentElement.classList.add('pronto-para-revelar');

    observar(
      Array.prototype.slice.call(document.querySelectorAll('[data-revelar]')),
      function (elemento) {
        elemento.classList.add('esta-visivel');
      }
    );

    if (citacao) {
      observar([citacao.closest('.citacao')], function (secao) {
        secao.classList.add('esta-visivel');
      }, '0px 0px -25% 0px');
    }
  });
})();
