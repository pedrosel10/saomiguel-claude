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
     agendado uma vez só.

     Os efeitos não leem a rolagem do navegador: leem `rolagemSuave`, que
     persegue a rolagem real quadro a quadro. Sem isso, quem rola com a
     rodinha do mouse (e no Safari é sempre assim, que não interpola o giro
     como o trackpad) vê a imagem saltar de 100 em 100 pixels, um degrau por
     entalhe. Perseguindo, cada salto vira um deslize curto — e, de quebra,
     a rolagem contínua ganha uma inércia leve. */
  var efeitosDeRolagem = [];
  var rolagemSuave = 0;
  var rodando = false;
  var instanteAnterior = 0;

  /* Fração do caminho percorrida a cada quadro de 60 Hz: dá uma constante de
     tempo de ~130 ms, curta o bastante para não parecer que a página arrasta. */
  var PERSEGUICAO = 0.12;

  function aoRolar(efeito) {
    efeitosDeRolagem.push(efeito);
  }

  function rodarEfeitos() {
    /* A diferença entre a rolagem real e a suave é o quanto o efeito está
       atrasado; quem mede posições na tela corrige por ela. */
    var atraso = window.scrollY - rolagemSuave;
    for (var i = 0; i < efeitosDeRolagem.length; i++) efeitosDeRolagem[i](rolagemSuave, atraso);
  }

  function quadro(agora) {
    var dt = instanteAnterior ? Math.min(agora - instanteAnterior, 64) : 16.7;
    instanteAnterior = agora;

    var alvo = window.scrollY;
    var resto = alvo - rolagemSuave;

    /* Salto grande não é rolagem: é âncora, recarga ou volta no histórico.
       Perseguir isso faria a página inteira deslizar sozinha. */
    if (Math.abs(resto) > window.innerHeight * 1.5 || Math.abs(resto) < 0.3) {
      rolagemSuave = alvo;
    } else {
      /* Elevado a dt: a mesma constante de tempo em 60, 120 ou 144 Hz. */
      rolagemSuave += resto * (1 - Math.pow(1 - PERSEGUICAO, dt / 16.7));
    }

    rodarEfeitos();

    if (rolagemSuave !== window.scrollY) {
      requestAnimationFrame(quadro);
    } else {
      rodando = false;
    }
  }

  function agendarQuadro() {
    if (rodando) return;
    rodando = true;
    instanteAnterior = 0;
    requestAnimationFrame(quadro);
  }

  /* Põe os efeitos na posição atual sem animar. */
  function sincronizar() {
    rolagemSuave = window.scrollY;
    rodarEfeitos();
  }

  function ligarLacoDeRolagem() {
    if (!efeitosDeRolagem.length) return;

    window.addEventListener('scroll', agendarQuadro, { passive: true });
    window.addEventListener('resize', sincronizar);

    /* Aba oculta não roda requestAnimationFrame: a rolagem que acontece
       enquanto ela está escondida deixa os efeitos parados num estado antigo,
       e o quadro pedido lá atrás nunca chega para destravar o laço. Ao voltar
       à tela, reposiciona de uma vez — animar o acúmulo seria um salto. */
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        rodando = false;
        sincronizar();
      }
    });

    /* Volta pelo histórico: a página é restaurada com a rolagem de antes,
       sem disparar scroll. */
    window.addEventListener('pageshow', sincronizar);

    sincronizar();
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

    aoRolar(function (rolagem) {
      var percurso = raiz.scrollHeight - window.innerHeight;
      if (percurso <= 0) return;

      var avanco = limitar(rolagem / percurso, 0, 1);
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

    aoRolar(function (rolagem, atraso) {
      var caixa = marco.getBoundingClientRect();
      var altura = window.innerHeight;
      var percurso = altura + caixa.height;
      if (percurso <= 0) return;

      /* O rect vem da rolagem real; somar o atraso devolve onde a seção
         estaria na rolagem suave, sem precisar cachear a posição no documento
         (que muda quando as imagens carregam). */
      var topo = caixa.top + atraso;
      var avanco = limitar((altura - topo) / percurso, 0, 1);

      /* A abertura se completa no primeiro terço da entrada e fica aberta:
         fechar de novo na saída daria a impressão de erro, não de efeito. */
      marco.style.setProperty('--abertura', limitar(avanco / 0.34, 0, 1).toFixed(3));
      marco.style.setProperty('--passo', (avanco * 2 - 1).toFixed(3));
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
    /* Fora do bloco de movimento: a cor do fundo precisa acompanhar a
       seção mesmo para quem pediu menos animação. */
    acompanharTema();

    var citacao = document.querySelector('[data-revelar-palavras]');
    if (citacao) prepararCitacao(citacao);

    if (semMovimento) return;

    document.querySelectorAll('.faq__item').forEach(prepararGaveta);

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
