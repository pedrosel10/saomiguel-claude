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

  /* Tema do fundo. A faixa de observação é uma linha no meio da tela: a
     seção que a cruza define a cor da camada fixa, e a transição do CSS
     faz a passagem parecer contínua. */
  function acompanharTema() {
    var secoes = Array.prototype.slice.call(document.querySelectorAll('[data-tema]'));
    if (!secoes.length) return;

    function aplicar(tema) {
      if (document.documentElement.dataset.tema !== tema) {
        document.documentElement.dataset.tema = tema;
      }
    }

    aplicar(secoes[0].dataset.tema);

    if (!('IntersectionObserver' in window)) return;

    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) aplicar(entrada.target.dataset.tema);
      });
    }, { rootMargin: '-50% 0px -50% 0px' });

    secoes.forEach(function (secao) {
      observador.observe(secao);
    });
  }

  /* Um único laço de rolagem para todos os efeitos contínuos: cada um se
     inscreve aqui em vez de pendurar o próprio listener, e o quadro é
     agendado uma vez só. Os efeitos leem a posição real da página — quem
     suaviza é a rolagem em si (ligarRolagemSuave), então imagem e conteúdo
     andam sempre juntos. */
  var efeitosDeRolagem = [];
  var quadroAgendado = false;

  function aoRolar(efeito) {
    efeitosDeRolagem.push(efeito);
  }

  function rodarEfeitos() {
    quadroAgendado = false;
    for (var i = 0; i < efeitosDeRolagem.length; i++) efeitosDeRolagem[i]();
  }

  function ligarLacoDeRolagem() {
    if (!efeitosDeRolagem.length) return;

    function agendar() {
      if (quadroAgendado) return;
      quadroAgendado = true;
      requestAnimationFrame(rodarEfeitos);
    }

    window.addEventListener('scroll', agendar, { passive: true });
    window.addEventListener('resize', rodarEfeitos);

    /* Aba oculta não roda requestAnimationFrame: a rolagem que acontece
       enquanto ela está escondida deixa os efeitos parados num estado antigo,
       e o quadro pedido lá atrás nunca chega para destravar o agendamento. */
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') rodarEfeitos();
    });

    /* Volta pelo histórico: a página é restaurada com a rolagem de antes,
       sem disparar scroll. */
    window.addEventListener('pageshow', rodarEfeitos);

    rodarEfeitos();
  }

  function limitar(n, minimo, maximo) {
    return Math.min(Math.max(n, minimo), maximo);
  }

  /* Paralaxe da arte de fundo: ela desliza para baixo conforme a página
     rola, numa fração do percurso, para o fundo não parecer colado à tela.
     O curso é proporcional à altura da janela e cabe na sobra que a camada
     tem em cima e embaixo. */
  function acompanharParalaxe() {
    var raiz = document.documentElement;

    aoRolar(function () {
      var percurso = raiz.scrollHeight - window.innerHeight;
      if (percurso <= 0) return;

      var avanco = limitar(window.scrollY / percurso, 0, 1);
      var curso = window.innerHeight * 0.22;

      raiz.style.setProperty('--deslize-fundo', (avanco * curso).toFixed(1) + 'px');
    });
  }

  /* Marco: a moldura abre conforme a seção atravessa a tela, e a foto deriva
     dentro dela. `avanco` vai de 0 (a seção encosta na base da tela) a 1 (ela
     acabou de sair por cima), e as duas animações são fatias desse mesmo
     percurso — uma conta só, um valor só lido do layout por quadro. */
  function acompanharMarco() {
    var marco = document.querySelector('.marco');
    if (!marco) return;

    aoRolar(function () {
      var caixa = marco.getBoundingClientRect();
      var altura = window.innerHeight;
      var percurso = altura + caixa.height;
      if (percurso <= 0) return;

      var avanco = limitar((altura - caixa.top) / percurso, 0, 1);

      /* A abertura se completa no primeiro terço da entrada e fica aberta:
         fechar de novo na saída daria a impressão de erro, não de efeito. */
      marco.style.setProperty('--abertura', limitar(avanco / 0.34, 0, 1).toFixed(3));
      marco.style.setProperty('--passo', (avanco * 2 - 1).toFixed(3));
    });
  }

  /* Rolagem suave da página. O navegador anda de degrau em degrau a cada
     entalhe da rodinha; aqui o entalhe vira um alvo e a página caminha até
     ele. Como quem se move é a rolagem de verdade — e não um invólucro
     transformado —, âncoras, busca na página, foco por teclado e os
     observadores continuam funcionando como sempre.

     Só com mouse: no toque o próprio sistema já tem inércia, e interceptar
     isso deixa a página pior do que estava. */
  function ligarRolagemSuave() {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    /* Fração do caminho a cada quadro de 60 Hz. Mais alto gruda na rodinha,
       mais baixo dá a impressão de que a página arrasta. */
    var APROXIMACAO = 0.12;

    var alvo = window.scrollY;
    var animando = false;
    var anterior = 0;

    function teto() {
      return Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
    }

    /* Elemento com rolagem própria fica com o gesto: interceptar aqui roubaria
       a rolagem dele e ele nunca andaria. */
    function rolaSozinho(no) {
      while (no && no.nodeType === 1 && no !== document.body && no !== document.documentElement) {
        if (no.scrollHeight > no.clientHeight) {
          var transbordo = getComputedStyle(no).overflowY;
          if (transbordo === 'auto' || transbordo === 'scroll') return true;
        }
        no = no.parentElement;
      }
      return false;
    }

    function passo(agora) {
      var dt = anterior ? Math.min(agora - anterior, 64) : 16.7;
      anterior = agora;

      var atual = window.scrollY;
      var resto = alvo - atual;

      if (Math.abs(resto) < 0.5) {
        animando = false;
        anterior = 0;
        return;
      }

      /* Elevado a dt: a mesma constante de tempo em 60, 120 ou 144 Hz.
         'instant' porque o CSS pede scroll-behavior: smooth para as âncoras,
         e sem isto o navegador animaria cada passo desta animação. */
      var proximo = atual + resto * (1 - Math.pow(1 - APROXIMACAO, dt / 16.7));
      window.scrollTo({ top: proximo, behavior: 'instant' });

      requestAnimationFrame(passo);
    }

    window.addEventListener('wheel', function (evento) {
      if (evento.ctrlKey || evento.metaKey) return;   /* zoom do navegador */
      if (rolaSozinho(evento.target)) return;

      evento.preventDefault();

      var d = evento.deltaY;
      if (evento.deltaMode === 1) d *= 16;                   /* linhas */
      else if (evento.deltaMode === 2) d *= window.innerHeight; /* páginas */

      alvo = Math.min(Math.max(alvo + d, 0), teto());

      if (!animando) {
        animando = true;
        anterior = 0;
        requestAnimationFrame(passo);
      }
    }, { passive: false });

    /* Teclado, barra de rolagem, âncora, busca na página: quem move a página
       por fora manda, e o alvo passa a ser onde ela parou. */
    function realinhar() {
      if (!animando) alvo = window.scrollY;
    }

    window.addEventListener('scroll', realinhar, { passive: true });
    window.addEventListener('resize', realinhar);
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
    /* Fora do bloco de movimento: a cor do fundo precisa acompanhar a
       seção mesmo para quem pediu menos animação. */
    acompanharTema();

    var citacao = document.querySelector('[data-revelar-palavras]');
    if (citacao) prepararCitacao(citacao);

    if (semMovimento) return;

    document.querySelectorAll('.faq__item').forEach(prepararGaveta);

    ligarRolagemSuave();

    acompanharParalaxe();
    acompanharMarco();
    ligarLacoDeRolagem();

    /* Só agora os elementos podem começar invisíveis: se o script falhar
       antes daqui, a página continua legível. */
    document.documentElement.classList.add('pronto-para-revelar');

    observar(
      Array.prototype.slice.call(document.querySelectorAll('[data-revelar]')),
      function (elemento) {
        elemento.classList.add('esta-visivel');
      }
    );

    /* Cortina do rodapé: alterna com a rolagem, para descer de volta quando
       o visitante sobe a página. */
    var rodape = document.querySelector('.rodape');
    if (rodape && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entradas) {
        entradas.forEach(function (entrada) {
          rodape.classList.toggle('esta-no-fim', entrada.isIntersecting);
        });
      }, { threshold: 0.45 }).observe(rodape);
    }

    /* A citação é a única que não é de uma vez só: a faixa de observação
       fica no miolo da tela, para as palavras acenderem já perto do centro,
       e o estado é retirado na saída para o efeito rodar de novo na volta. */
    if (citacao && 'IntersectionObserver' in window) {
      var secaoCitacao = citacao.closest('.citacao');

      new IntersectionObserver(function (entradas) {
        entradas.forEach(function (entrada) {
          secaoCitacao.classList.toggle('esta-visivel', entrada.isIntersecting);
        });
      }, { rootMargin: '-15% 0px -45% 0px' }).observe(citacao);
    }
  });
})();
