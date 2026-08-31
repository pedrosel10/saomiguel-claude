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

  /* Gaveta do FAQ. O <details> abre e fecha secamente por natureza: o clique
     é interceptado para a altura poder correr, e no fechamento o atributo
     `open` só sai quando a animação termina — senão o conteúdo sumiria antes
     de encolher. */
  function prepararGaveta(item) {
    var resumo = item.querySelector('.faq__pergunta');
    var conteudo = item.querySelector('.faq__resposta');
    if (!resumo || !conteudo || !conteudo.animate) return;

    var recuoFinal = getComputedStyle(conteudo).paddingBottom;
    var animacao = null;

    function animar(abrindo) {
      if (animacao) animacao.cancel();
      conteudo.style.overflow = 'hidden';

      var altura = conteudo.getBoundingClientRect().height;
      var quadros = [
        { height: '0px', paddingBottom: '0px', opacity: 0, transform: 'translateY(-8px)' },
        { height: altura + 'px', paddingBottom: recuoFinal, opacity: 1, transform: 'translateY(0)' }
      ];
      if (!abrindo) quadros.reverse();

      animacao = conteudo.animate(quadros, {
        duration: 460,
        easing: 'cubic-bezier(0.85, 0, 0.15, 1)'
      });

      animacao.onfinish = function () {
        animacao = null;
        conteudo.style.overflow = '';
        if (!abrindo) item.open = false;
      };
    }

    resumo.addEventListener('click', function (evento) {
      evento.preventDefault();

      if (item.open) {
        animar(false);
      } else {
        item.open = true; /* precisa estar aberto para o conteúdo ter altura */
        animar(true);
      }
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

    document.querySelectorAll('.faq__item').forEach(prepararGaveta);

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
