/* São Miguel — scripts do site */
(function () {
  'use strict';

  var semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var temMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function limitar(n, minimo, maximo) {
    return Math.min(Math.max(n, minimo), maximo);
  }

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
     suaviza é a rolagem em si (ligarRolagemSuave), então tudo anda junto. */
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

  /* Rolagem suave da página. O navegador anda de degrau em degrau a cada
     entalhe da rodinha; aqui o entalhe vira um alvo e a página caminha até
     ele. Como quem se move é a rolagem de verdade — e não um invólucro
     transformado —, âncoras, busca na página, foco por teclado e os
     observadores continuam funcionando como sempre.

     Só com mouse: no toque o próprio sistema já tem inércia, e interceptar
     isso deixa a página pior do que estava. */
  function ligarRolagemSuave() {
    if (!temMouse) return;

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

  function todos(seletor, raiz) {
    return Array.prototype.slice.call((raiz || document).querySelectorAll(seletor));
  }

  /* Barra fixa: entra quando a primeira dobra sai, e marca a seção que está
     cruzando o meio da tela. */
  function ligarBarra() {
    var barra = document.querySelector('.barra');
    var hero = document.querySelector('.hero');
    if (!barra || !hero) return;

    aoRolar(function () {
      barra.classList.toggle('esta-visivel', window.scrollY > hero.offsetHeight - 80);
    });

    if (!('IntersectionObserver' in window)) return;

    var links = todos('.barra__secoes a');

    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        var alvo = '#' + entrada.target.id;
        links.forEach(function (link) {
          if (link.getAttribute('href') === alvo) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-50% 0px -50% 0px' });

    links.forEach(function (link) {
      var secao = document.querySelector(link.getAttribute('href'));
      if (secao) observador.observe(secao);
    });
  }

  /* Cronograma: a etapa que a régua de avanço cruza acende; as que ficaram
     para trás ficam meio preenchidas, e as fases se sobrepõem, então mais de
     uma pode estar em curso. No desktop o avanço corre enquanto o topo do
     bloco vai de 85% a 10% da tela, para a obra terminar ainda à vista. No
     celular o desenho fica preso no topo e a lista passa por baixo: lá o
     avanço acompanha o bloco inteiro, do topo a 75% ao fim a 35%. */
  function ligarCronograma() {
    var quadro = document.querySelector('.cronograma');
    if (!quadro) return;

    var leitura = quadro.querySelector('.cronograma__leitura b');
    var etapas = todos('.etapa', quadro).map(function (el) {
      return { el: el, inicio: parseFloat(el.dataset.inicio), fim: parseFloat(el.dataset.fim) };
    });
    /* Fases do desenho da obra: cada uma vale entre data-de e data-ate. */
    var desenho = quadro.querySelector('.cronograma__desenho');
    var fases = todos('.fase', desenho || quadro).map(function (el) {
      return { el: el, de: parseFloat(el.dataset.de), ate: parseFloat(el.dataset.ate) };
    });
    if (desenho) desenho.classList.add('tem-fases');
    var celular = window.matchMedia('(max-width: 720px)');
    var ultimo = -1;

    aoRolar(function () {
      var r = quadro.getBoundingClientRect();
      var vh = window.innerHeight;
      if (r.bottom < -vh || r.top > vh * 2) return;

      var avanco;
      if (celular.matches) {
        avanco = limitar((vh * 0.75 - r.top) / (vh * 0.4 + r.height), 0, 1);
      } else {
        avanco = limitar((vh * 0.85 - r.top) / (vh * 0.75), 0, 1);
      }

      quadro.style.setProperty('--avanco', avanco.toFixed(4));

      var pct = Math.round(avanco * 100);
      if (pct === ultimo) return;
      ultimo = pct;
      if (leitura) leitura.textContent = pct + '%';

      etapas.forEach(function (etapa) {
        var emCurso = avanco > 0 && avanco >= etapa.inicio && avanco <= etapa.fim;
        etapa.el.classList.toggle('esta-ativa', emCurso);
        etapa.el.classList.toggle('esta-feita', avanco > etapa.fim);
      });

      fases.forEach(function (fase) {
        fase.el.classList.toggle('esta-ativa', avanco >= fase.de && avanco < fase.ate);
      });
    });
  }

  /* Do papel ao canteiro: enquanto o palco está preso, a fração percorrida
     da seção move a linha de corte. As pontas têm folga, para a varredura
     começar e terminar com a imagem parada. */
  function ligarVitrine() {
    var secao = document.querySelector('.vitrine');
    if (!secao) return;

    var leitura = secao.querySelector('.vitrine__avanco b');
    var ultimo = -1;

    aoRolar(function () {
      var r = secao.getBoundingClientRect();
      var curso = r.height - window.innerHeight;
      if (curso <= 0 || r.bottom < 0 || r.top > window.innerHeight) return;

      var bruto = limitar(-r.top / curso, 0, 1);
      var p = limitar((bruto - 0.08) / 0.84, 0, 1);
      secao.style.setProperty('--p', p.toFixed(4));

      var pct = Math.round(p * 100);
      if (pct === ultimo) return;
      ultimo = pct;
      if (leitura) leitura.textContent = pct + '%';
    });
  }

  /* Letreiro: cada linha anda num sentido, numa fração da largura de uma
     cópia do texto. Como cada linha tem duas cópias, a faixa nunca fica
     vazia. */
  function ligarLetreiro() {
    var faixa = document.querySelector('.letreiro');
    if (!faixa) return;

    var linhas = todos('.letreiro__linha', faixa);
    var copias = [];

    /* A largura de cada cópia só muda com a tela: medida fora do laço. */
    function medir() {
      copias = linhas.map(function (linha) { return linha.firstElementChild.offsetWidth; });
    }

    medir();
    window.addEventListener('resize', medir);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(medir);

    aoRolar(function () {
      var r = faixa.getBoundingClientRect();
      var vh = window.innerHeight;
      if (r.bottom < 0 || r.top > vh) return;

      var p = limitar((vh - r.top) / (vh + r.height), 0, 1);
      linhas.forEach(function (linha, i) {
        var t = i % 2 === 0 ? p : 1 - p;
        linha.style.setProperty('--x', (-t * copias[i] * 0.6).toFixed(1) + 'px');
      });
    });
  }

  /* Separa um texto em letras, cada uma com o próprio atraso (--n). */
  function separarLetras(el) {
    var texto = el.textContent;
    el.textContent = '';
    Array.prototype.forEach.call(texto, function (ch, n) {
      if (ch === ' ') {
        el.appendChild(document.createTextNode(' '));
        return;
      }
      var span = document.createElement('span');
      span.className = 'letra';
      span.style.setProperty('--n', n);
      span.textContent = ch;
      el.appendChild(span);
    });
  }

  /* Contadores: sobem do zero quando o número entra na tela. */
  function formatar(n, digitos) {
    return digitos ? String(n).padStart(digitos, '0') : n.toLocaleString('pt-BR');
  }

  function contar(el) {
    var alvo = parseInt(el.dataset.contar, 10);
    var digitos = parseInt(el.dataset.digitos || '0', 10);
    var duracao = 1600;
    var inicio = null;

    function passo(agora) {
      if (inicio === null) inicio = agora;
      var t = limitar((agora - inicio) / duracao, 0, 1);
      var suave = 1 - Math.pow(1 - t, 3);
      el.textContent = formatar(Math.round(alvo * suave), digitos);
      if (t < 1) requestAnimationFrame(passo);
    }

    requestAnimationFrame(passo);
  }

  /* Redesenha o desenho de uma célula de serviço quando o mouse entra nela.
     A classe sai sem transição — senão as linhas se apagariam devagar — e
     volta no quadro seguinte. */
  function redesenhar(desenho) {
    desenho.classList.add('sem-transicao');
    desenho.classList.remove('esta-visivel');
    void desenho.getBoundingClientRect();
    desenho.classList.remove('sem-transicao');
    requestAnimationFrame(function () {
      desenho.classList.add('esta-visivel');
    });
  }

  function ligarRedesenho() {
    todos('.servico').forEach(function (celula) {
      var desenho = celula.querySelector('[data-desenho]');
      var ultimaVez = 0;
      if (!desenho) return;

      celula.addEventListener('mouseenter', function () {
        var agora = Date.now();
        if (!desenho.classList.contains('esta-visivel') || agora - ultimaVez < 1400) return;
        ultimaVez = agora;
        redesenhar(desenho);
      });
    });
  }

  /* Mira de CAD na citação: duas linhas que seguem o mouse e a leitura das
     coordenadas medidas a partir do centro da engrenagem, na unidade da
     própria logo (78 de lado). */
  function ligarMira() {
    var secao = document.querySelector('.citacao');
    if (!secao || !temMouse) return;

    var mira = secao.querySelector('.mira-cad');
    var leitura = secao.querySelector('.mira-cad__leitura');
    var desenho = secao.querySelector('.citacao__desenho svg');
    var ultimoEvento = null;
    var agendado = false;

    function numero(n) {
      var sinal = n < 0 ? '−' : '+';
      return sinal + Math.abs(n).toFixed(1).padStart(5, '0').replace('.', ',');
    }

    function atualizar() {
      agendado = false;
      var e = ultimoEvento;
      var r = secao.getBoundingClientRect();
      mira.style.setProperty('--mx', (e.clientX - r.left).toFixed(1) + 'px');
      mira.style.setProperty('--my', (e.clientY - r.top).toFixed(1) + 'px');

      if (!desenho) return;
      var d = desenho.getBoundingClientRect();
      var unidade = (d.width / 600) * 6.2;
      var dx = (e.clientX - (d.left + d.width / 2)) / unidade;
      var dy = ((d.top + d.height / 2) - e.clientY) / unidade;
      leitura.textContent = 'X ' + numero(dx) + ' · Y ' + numero(dy);
    }

    secao.addEventListener('pointermove', function (evento) {
      ultimoEvento = evento;
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(atualizar);
    });

    secao.addEventListener('pointerenter', function () {
      secao.classList.add('tem-mira');
    });

    secao.addEventListener('pointerleave', function () {
      secao.classList.remove('tem-mira');
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    /* Fora do bloco de movimento: a cor do fundo, a barra e o estado do
       cronograma precisam acompanhar a rolagem mesmo para quem pediu menos
       animação. */
    acompanharTema();

    var citacao = document.querySelector('[data-revelar-palavras]');
    if (citacao) prepararCitacao(citacao);

    ligarBarra();
    ligarCronograma();
    ligarVitrine();
    ligarMira();

    if (!semMovimento) {
      todos('.faq__item').forEach(prepararGaveta);
      todos('[data-letras]').forEach(separarLetras);
      ligarRolagemSuave();
      ligarLetreiro();
    }

    ligarLacoDeRolagem();

    if (semMovimento) return;

    /* Só agora os elementos podem começar invisíveis: se o script falhar
       antes daqui, a página continua legível. */
    document.documentElement.classList.add('pronto-para-revelar');

    var contadores = todos('[data-contar]');
    contadores.forEach(function (el) {
      el.textContent = formatar(0, parseInt(el.dataset.digitos || '0', 10));
    });

    observar(todos('[data-revelar]'), function (elemento) {
      elemento.classList.add('esta-visivel');
      todos('[data-contar]', elemento).forEach(contar);
    });

    observar(todos('[data-desenho]'), function (desenho) {
      desenho.classList.add('esta-visivel');
    }, '0px 0px -8% 0px');

    /* Os números do hero entram com a dobra, por animação de CSS, e não pelo
       observador: a contagem espera o mesmo atraso da entrada deles. */
    todos('.hero [data-contar]').forEach(function (el, i) {
      setTimeout(function () { contar(el); }, 2750 + i * 70);
    });

    if (temMouse) ligarRedesenho();

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
