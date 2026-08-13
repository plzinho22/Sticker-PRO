/* ============================================================
   STICKER PRO — ÁREA DE MEMBROS
   Home = biblioteca com busca. Navegação enxuta.
   Segurança (sessão, autorização Premium, RLS) inalterada.
   Depende de: config.js, content.js, auth.js, dados.js
   ============================================================ */

(function () {
  'use strict';

  var C = window.STICKER_CONTEUDO;
  var CFG = window.STICKER_CONFIG || {};
  var Auth = window.Auth;
  var Dados = window.Dados;

  var ROTAS = [
    { id: 'inicio',  rota: '#/inicio',  nome: 'Início',     emoji: '🏠' },
    { id: 'comecar', rota: '#/comecar', nome: 'Como usar',  emoji: '✨' },
    { id: 'acesso',  rota: '#/acesso',  nome: 'Meu acesso', emoji: '🔑' }
  ];

  /* Endereços antigos continuam funcionando: caem na biblioteca. */
  var ROTAS_ANTIGAS = ['#/premium', '#/figurinhas', '#/minimalistas', '#/icones'];

  var el = {};
  ['splash','tela-login','app','conteudo','nav','tabs','form-login','email','senha',
   'btn-entrar','link-recuperar','retorno-login','selo-demo','btn-sair-sidebar',
   'form-redefinir','nova-senha','btn-redefinir','retorno-redefinir','tela-redefinir',
   'tela-negado','negado-email','btn-negado-sair','btn-negado-tentar',
   'tela-bloqueio'
  ].forEach(function (id) { el[id] = document.getElementById(id); });

  var estado = {
    email: null, autorizado: false,
    carregandoDados: false, erroDados: null,
    busca: ''
  };

  /* ---------------- utilidades ---------------- */

  function esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* "Café" e "cafe" precisam casar. "avião" e "aviao" também. */
  function normalizar(t) {
    return String(t == null ? '' : t)
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function memoria(chave, valor) {
    try {
      if (valor === undefined) return localStorage.getItem(chave);
      localStorage.setItem(chave, valor);
    } catch (e) { return null; }
  }

  function rotaAtual() {
    var h = window.location.hash;
    for (var i = 0; i < ROTAS.length; i++) if (ROTAS[i].rota === h) return ROTAS[i];
    return null;
  }

  function mostrar(no)  { if (no) no.style.display = ''; }
  function esconder(no) { if (no) no.style.display = 'none'; }

  /* ---------------------------------------------------------
     CATÁLOGO
     Lido direto de STICKER_CONTEUDO. Nenhuma segunda lista.
     --------------------------------------------------------- */
  function catalogo() {
    var itens = [];
    Object.keys(C.secoes).forEach(function (chave) {
      var s = C.secoes[chave];
      s.categorias.forEach(function (cat) {
        itens.push({
          id: cat.id,
          nome: cat.nome,
          nota: cat.nota || '',
          emoji: cat.emoji || s.emoji || '🎀',
          pasta: s.pasta,
          secao: chave,
          secaoTitulo: s.titulo
        });
      });
    });
    return itens;
  }

  /* Busca por nome E por descrição, sem acento e sem caixa. */
  function filtrar(itens, termo) {
    var t = normalizar(termo);
    if (!t) return itens;
    var palavras = t.split(' ');
    return itens.filter(function (item) {
      var alvo = normalizar(item.nome + ' ' + item.nota + ' ' + item.secaoTitulo);
      return palavras.every(function (p) { return alvo.indexOf(p) > -1; });
    });
  }

  /* ---------------- componentes ---------------- */

  function topo(eyebrow, titulo, intro) {
    return '<header class="pagina-topo">' +
      '<span class="eyebrow">' + esc(eyebrow) + '</span>' +
      '<h1 class="pagina-titulo">' + esc(titulo) + '</h1>' +
      (intro ? '<p class="pagina-intro">' + esc(intro) + '</p>' : '') +
    '</header>';
  }

  function cardCategoria(item) {
    var link = Dados.linkDe(item.id, item.pasta);
    var capa = Dados.capa(item.id);

    var visual = capa
      ? '<span class="cartao-capa"><img src="' + esc(capa) + '" alt="" loading="lazy" decoding="async"></span>'
      : '<span class="cartao-glifo" aria-hidden="true">' + esc(item.emoji) + '</span>';

    var selo = link
      ? '<span class="selo selo-ok">Liberado</span>'
      : '<span class="selo selo-espera">Em breve</span>';

    var miolo =
      visual +
      '<span class="cartao-nome">' + esc(item.nome) + '</span>' +
      '<span class="cartao-nota">' + esc(item.nota) + '</span>' +
      selo +
      '<span class="cartao-acao">' + (link ? 'Abrir coleção <span aria-hidden="true">→</span>' : 'Aguardando liberação') + '</span>';

    return link
      ? '<a class="cartao" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">' + miolo + '</a>'
      : '<div class="cartao vazio">' + miolo + '</div>';
  }

  /* Destaque principal, no espírito de uma página de entrega. */
  function destaquePrincipal() {
    var sec = C.secoes.premium;
    var link = Dados.linkDe(sec.categorias[0].id, sec.pasta) || Dados.link(sec.pasta);
    if (!link) return '';

    return '<section class="entrega">' +
      '<span class="entrega-glifo" aria-hidden="true">' + esc(sec.emoji) + '</span>' +
      '<h2 class="entrega-titulo">' + esc(sec.titulo) + '</h2>' +
      '<p class="entrega-texto">' + esc(sec.intro) + '</p>' +
      '<a class="btn btn-primary entrega-btn" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">' +
        '<span aria-hidden="true">↓</span> Abrir biblioteca completa</a>' +
    '</section>';
  }

  /* Lista de materiais, com selo de status real. */
  function linhaMaterial(item) {
    var link = Dados.linkDe(item.id, item.pasta);
    var selo = link
      ? '<span class="selo selo-ok">Liberado</span>'
      : '<span class="selo selo-espera">Em breve</span>';

    var miolo =
      '<span class="linha-emoji" aria-hidden="true">' + esc(item.emoji) + '</span>' +
      '<span class="linha-txt">' +
        '<span class="linha-nome">' + esc(item.nome) + '</span>' +
        '<span class="linha-nota">' + esc(item.secaoTitulo) + '</span>' +
      '</span>' + selo;

    return link
      ? '<a class="linha-material" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">' + miolo + '</a>'
      : '<div class="linha-material vazio">' + miolo + '</div>';
  }

  function esqueleto(n) {
    var c = '';
    for (var i = 0; i < n; i++) {
      c += '<div class="cartao esqueleto">' +
             '<span class="cartao-glifo"></span>' +
             '<span class="barra"></span><span class="barra curta"></span>' +
           '</div>';
    }
    return '<div class="grade">' + c + '</div>';
  }

  function avisoConteudo() {
    if (estado.erroDados === 'sem-sessao') {
      return '<div class="aviso aviso-erro">Sua sessão expirou. Entre novamente para ver suas coleções.</div>';
    }
    if (estado.erroDados === 'sem-acesso') {
      return '<div class="aviso aviso-erro">Não encontramos um acesso Premium ativo para esta conta.</div>';
    }
    if (estado.erroDados === 'vazio') {
      return '<div class="aviso aviso-info">Suas coleções ainda estão sendo preparadas. Volte em instantes.</div>';
    }
    if (estado.erroDados) {
      return '<div class="aviso aviso-erro">Não foi possível carregar suas coleções agora. ' +
             '<button type="button" class="link-inline" id="btn-recarregar">Tentar de novo</button></div>';
    }
    return '';
  }

  /* ---------------- telas ---------------- */

  var telas = {

    inicio: function () {
      var itens = catalogo();
      var achados = filtrar(itens, estado.busca);
      var buscando = !!normalizar(estado.busca);

      var cabecalho =
        '<header class="biblioteca-topo">' +
          '<span class="marca-linha">Sticker Pro <span aria-hidden="true">✨</span></span>' +
          '<h1 class="biblioteca-titulo">Sua biblioteca Premium</h1>' +
          '<p class="biblioteca-frase">Encontre a figurinha perfeita para deixar seu Story ainda mais bonito.</p>' +
        '</header>';

      var busca =
        '<div class="busca">' +
          '<span class="busca-lupa" aria-hidden="true">🔎</span>' +
          '<input type="search" id="campo-busca" class="busca-campo" ' +
                 'placeholder="Pesquise uma categoria..." autocomplete="off" ' +
                 'autocapitalize="none" spellcheck="false" aria-label="Pesquisar categoria" ' +
                 'value="' + esc(estado.busca) + '">' +
          (buscando ? '<button type="button" class="busca-limpar" id="btn-limpar-busca" aria-label="Limpar busca">×</button>' : '') +
        '</div>';

      var corpo;

      if (estado.carregandoDados) {
        corpo = '<h2 class="bloco-titulo secao-titulo">Suas coleções</h2>' + esqueleto(6);
      } else if (!achados.length) {
        corpo =
          '<div class="vazio-busca">' +
            '<span class="vazio-emoji" aria-hidden="true">🔍</span>' +
            '<p class="vazio-titulo">Não encontramos essa categoria.</p>' +
            '<p class="vazio-dica">Experimente buscar por café, moda, viagem, beleza...</p>' +
          '</div>';
      } else if (buscando) {
        var titulo = achados.length === 1 ? '1 categoria encontrada' : achados.length + ' categorias encontradas';
        corpo = '<h2 class="bloco-titulo secao-titulo">' + esc(titulo) + '</h2>' +
                '<div class="grade">' + achados.map(cardCategoria).join('') + '</div>';
      } else {
        // Sem busca: categorias do Premium em grade, demais coleções em lista.
        var doPremium = achados.filter(function (i) { return i.secao === 'premium'; });
        var outras    = achados.filter(function (i) { return i.secao !== 'premium'; });

        corpo = '<h2 class="bloco-titulo secao-titulo">Suas coleções</h2>' +
                '<div class="grade">' + doPremium.map(cardCategoria).join('') + '</div>';

        if (outras.length) {
          corpo += '<div class="materiais">' +
                     '<h2 class="materiais-titulo"><span aria-hidden="true">🎁</span> Outras coleções</h2>' +
                     outras.map(linhaMaterial).join('') +
                   '</div>';
        }
      }

      var fecho = buscando ? '' :
        '<aside class="recado">' +
          '<p>Toda a sua biblioteca fica aqui, sempre no mesmo lugar. Use a busca para achar a categoria que combina com o Story de hoje.</p>' +
          '<p class="recado-forte">Bom proveito!</p>' +
        '</aside>';

      return cabecalho + busca + avisoConteudo() +
             (buscando || estado.carregandoDados ? '' : destaquePrincipal()) +
             '<section class="biblioteca">' + corpo + '</section>' + fecho;
    },

    comecar: function () {
      var resumo =
        '<ol class="resumo-passos">' +
          '<li><span class="resumo-num">1</span>Escolha uma categoria.</li>' +
          '<li><span class="resumo-num">2</span>Abra a coleção.</li>' +
          '<li><span class="resumo-num">3</span>Baixe a figurinha.</li>' +
          '<li><span class="resumo-num">4</span>Use no Story.</li>' +
        '</ol>';

      var etapas = C.etapas.map(function (e) {
        var passos = e.passos.map(function (p) { return '<li>' + p + '</li>'; }).join('');
        return '' +
        '<article class="etapa" data-etapa>' +
          '<button class="etapa-cabeca" type="button" data-abrir aria-expanded="false">' +
            '<span class="etapa-num">' + esc(e.numero) + '</span>' +
            '<span class="etapa-txt">' +
              '<span class="etapa-nome">' + esc(e.titulo) + '</span>' +
              '<span class="etapa-resumo">' + esc(e.resumo) + '</span>' +
            '</span>' +
            '<span class="etapa-seta" aria-hidden="true">▾</span>' +
          '</button>' +
          '<div class="etapa-corpo">' +
            '<ol class="passos">' + passos + '</ol>' +
            (e.dica ? '<p class="etapa-dica">💡 ' + esc(e.dica) + '</p>' : '') +
          '</div>' +
        '</article>';
      }).join('');

      return topo('Como usar', 'Comece aqui ✨', 'Em quatro passos você já está postando.') +
             resumo +
             '<h2 class="bloco-titulo secao-titulo">Passo a passo detalhado</h2>' +
             etapas;
    },

    acesso: function () {
      var suporte = CFG.emailSuporte
        ? '<div class="linha-acesso"><span class="linha-rotulo">Suporte</span>' +
          '<a class="linha-valor linha-link" href="mailto:' + esc(CFG.emailSuporte) + '">' + esc(CFG.emailSuporte) + '</a></div>'
        : '';

      return topo('Sua conta', 'Meu acesso 🔑', '') +
      '<div class="cartao-acesso">' +
        '<div class="linha-acesso">' +
          '<span class="linha-rotulo">Plano</span>' +
          '<span class="linha-valor">Sticker Pro Premium</span>' +
        '</div>' +
        '<div class="linha-acesso">' +
          '<span class="linha-rotulo">Status</span>' +
          '<span class="tag-ok"><span class="bolinha"></span>Acesso ativo</span>' +
        '</div>' +
        '<div class="linha-acesso">' +
          '<span class="linha-rotulo">E-mail</span>' +
          '<span class="linha-valor linha-email">' + esc(estado.email || '—') + '</span>' +
        '</div>' +
        suporte +
        '<button class="btn btn-ghost btn-block" id="btn-sair-conta" type="button">Sair</button>' +
      '</div>';
    }
  };

  /* ---------------- render ---------------- */

  function render() {
    var r = rotaAtual();
    if (!r) { window.location.hash = '#/inicio'; return; }

    el['conteudo'].innerHTML = '<div class="pagina entra">' + telas[r.id]() + '</div>';
    window.scrollTo(0, 0);
    marcarAtivo(r.id);
    document.title = r.nome + ' · Sticker Pro Premium';
    ligarEventos();
  }

  /* Redesenha só a lista, sem recriar o campo (não perde o foco). */
  function redesenharBusca() {
    var alvo = el['conteudo'].querySelector('.biblioteca');
    if (!alvo) return render();

    var achados = filtrar(catalogo(), estado.busca);
    var buscando = !!normalizar(estado.busca);

    if (!achados.length) {
      alvo.innerHTML =
        '<div class="vazio-busca">' +
          '<span class="vazio-emoji" aria-hidden="true">🔍</span>' +
          '<p class="vazio-titulo">Não encontramos essa categoria.</p>' +
          '<p class="vazio-dica">Experimente buscar por café, moda, viagem, beleza...</p>' +
        '</div>';
    } else if (!buscando) {
      // voltou ao estado sem busca: redesenha a página inteira
      return render();
    } else {
      var titulo = achados.length === 1 ? '1 categoria encontrada' : achados.length + ' categorias encontradas';
      alvo.innerHTML = '<h2 class="bloco-titulo secao-titulo">' + esc(titulo) + '</h2>' +
                       '<div class="grade">' + achados.map(cardCategoria).join('') + '</div>';
    }

    var limpar = document.getElementById('btn-limpar-busca');
    if (buscando && !limpar) return render();
    if (!buscando && limpar) limpar.parentNode.removeChild(limpar);
  }

  function focarBusca() {
    var c = document.getElementById('campo-busca');
    if (!c) return;
    c.focus();
    try { c.setSelectionRange(c.value.length, c.value.length); } catch (e) {}
  }

  function ligarEventos() {
    var campo = document.getElementById('campo-busca');
    if (campo) {
      campo.addEventListener('input', function () {
        var tinha = !!normalizar(estado.busca);
        estado.busca = campo.value;
        var tem = !!normalizar(estado.busca);
        // entrar ou sair do modo busca troca a estrutura da página
        if (tinha !== tem) { render(); focarBusca(); return; }
        redesenharBusca();
      });
      campo.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape') { campo.value = ''; estado.busca = ''; redesenharBusca(); }
      });
    }

    var limpar = document.getElementById('btn-limpar-busca');
    if (limpar) {
      limpar.addEventListener('click', function () {
        estado.busca = '';
        render();
        var c = document.getElementById('campo-busca');
        if (c) c.focus();
      });
    }

    Array.prototype.forEach.call(el['conteudo'].querySelectorAll('[data-abrir]'), function (b) {
      b.addEventListener('click', function () {
        var art = b.closest('[data-etapa]');
        var aberto = art.classList.toggle('aberta');
        b.setAttribute('aria-expanded', aberto ? 'true' : 'false');
      });
    });

    var sair = document.getElementById('btn-sair-conta');
    if (sair) sair.addEventListener('click', sairDaConta);

    var recarregar = document.getElementById('btn-recarregar');
    if (recarregar) recarregar.addEventListener('click', carregarDados);
  }

  /* ---------------- navegação ---------------- */

  function montarNav() {
    el['nav'].innerHTML = ROTAS.map(function (r) {
      return '<a class="nav-link" href="' + r.rota + '" data-id="' + r.id + '">' + esc(r.nome) + '</a>';
    }).join('') + '<button class="nav-link nav-sair" type="button" id="btn-sair-topo">Sair</button>';

    el['tabs'].innerHTML = ROTAS.map(function (r) {
      return '<a class="tab" href="' + r.rota + '" data-id="' + r.id + '">' +
        '<span class="emoji" aria-hidden="true">' + r.emoji + '</span>' + esc(r.nome) + '</a>';
    }).join('');

    var t = document.getElementById('btn-sair-topo');
    if (t) t.addEventListener('click', sairDaConta);
  }

  function marcarAtivo(id) {
    ['.nav-link', '.tab'].forEach(function (sel) {
      Array.prototype.forEach.call(document.querySelectorAll(sel), function (n) {
        n.classList.toggle('ativo', n.getAttribute('data-id') === id);
      });
    });
  }

  /* ---------------- dados ---------------- */

  function carregarDados() {
    estado.carregandoDados = true;
    estado.erroDados = null;
    if (el['app'].classList.contains('ativo')) render();

    return Promise.resolve(Dados.carregar()).then(function (r) {
      estado.carregandoDados = false;
      if (r && r.ok) estado.erroDados = r.vazio ? 'vazio' : null;
      else estado.erroDados = (r && r.erro) || 'falha';
      if (el['app'].classList.contains('ativo')) render();
    }).catch(function (e) {
      console.error('[Dados] falha inesperada:', e);
      estado.carregandoDados = false;
      estado.erroDados = 'falha';
      if (el['app'].classList.contains('ativo')) render();
    });
  }

  /* ---------------- sessão e guarda de rota ---------------- */

  /* Sessão válida NÃO é autorização. Só o Supabase decide. */
  function entrarComSessao(email) {
    estado.email = email;
    esconder(el['tela-login']);
    esconder(el['tela-redefinir']);
    esconder(el['tela-negado']);
    mostrar(el['splash']);
    el['splash'].style.display = 'flex';

    return Promise.resolve(Dados.verificarAcesso()).then(function (r) {
      if (r.estado === 'ok' || r.estado === 'demo') {
        estado.autorizado = true;
        return abrirApp(email);
      }
      if (r.estado === 'sem-sessao') return abrirLogin();
      // 'sem-acesso' e 'erro' caem na tela amigável
      estado.autorizado = false;
      return abrirNegado(email, r.estado);
    }).catch(function (e) {
      console.error('[Acesso] falha ao verificar autorização:', e);
      estado.autorizado = false;
      abrirNegado(email, 'erro');
    });
  }

  function abrirNegado(email, motivo) {
    el['app'].classList.remove('ativo');
    esconder(el['splash']);
    esconder(el['tela-login']);
    esconder(el['tela-redefinir']);
    if (el['negado-email']) el['negado-email'].textContent = email || '';
    var msg = document.getElementById('negado-msg');
    if (msg) {
      msg.textContent = motivo === 'erro'
        ? 'Não conseguimos confirmar seu acesso agora. Tente novamente em alguns instantes.'
        : 'Não encontramos um acesso Premium ativo para esta conta.';
    }
    mostrar(el['tela-negado']);
    el['tela-negado'].style.display = 'flex';
  }

  function abrirApp(email) {
    estado.email = email;
    esconder(el['splash']);
    esconder(el['tela-login']);
    esconder(el['tela-redefinir']);
    esconder(el['tela-negado']);
    el['app'].classList.add('ativo');
    if (!rotaAtual()) window.location.hash = '#/inicio';
    else render();
    carregarDados();
    talvezBoasVindas();
  }

  function abrirLogin() {
    estado.email = null;
    estado.autorizado = false;
    Dados.limpar();
    esconder(el['tela-negado']);
    el['app'].classList.remove('ativo');
    esconder(el['splash']);
    esconder(el['tela-redefinir']);
    mostrar(el['tela-login']);
    el['tela-login'].style.display = 'flex';
  }

  function abrirRedefinir() {
    el['app'].classList.remove('ativo');
    esconder(el['splash']);
    esconder(el['tela-login']);
    mostrar(el['tela-redefinir']);
    el['tela-redefinir'].style.display = 'flex';
  }

  function sairDaConta() {
    Promise.resolve(Auth.sair()).then(function () {
      window.location.hash = '';
      abrirLogin();
    }).catch(function (e) {
      console.error('[Auth] falha ao sair:', e);
      abrirLogin();
    });
  }


  function talvezBoasVindas() {
    if (memoria('stickerpro:boasvindas') === 'ok') return;
    var fundo = document.createElement('div');
    fundo.className = 'modal-fundo';
    fundo.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true">' +
        '<div class="modal-emoji" aria-hidden="true">✨</div>' +
        '<h2>Seu acesso está liberado!</h2>' +
        '<p>Bem-vinda ao Sticker Pro Premium.</p>' +
        '<p class="modal-p2">Sua biblioteca já está aqui. Use a busca para achar a categoria que quiser.</p>' +
        '<button class="btn btn-primary btn-block" type="button" id="btn-comecar-agora">Ver minhas coleções</button>' +
        '<a class="modal-depois" href="#/comecar" id="btn-depois">Ver como usar</a>' +
      '</div>';
    function fechar() {
      memoria('stickerpro:boasvindas', 'ok');
      if (fundo.parentNode) document.body.removeChild(fundo);
    }
    document.body.appendChild(fundo);
    var a = document.getElementById('btn-comecar-agora');
    var b = document.getElementById('btn-depois');
    if (a) a.addEventListener('click', fechar);
    if (b) b.addEventListener('click', fechar);
    fundo.addEventListener('click', function (ev) { if (ev.target === fundo) fechar(); });
  }

  /* ---------------- formulários ---------------- */

  function retorno(campo, tipo, texto) {
    el[campo].innerHTML = texto ? '<div class="aviso aviso-' + tipo + '">' + esc(texto) + '</div>' : '';
  }

  function ocupado(botao, sim, rotulo) {
    botao.disabled = sim;
    botao.classList.toggle('carregando', sim);
    botao.innerHTML = sim
      ? '<span class="spinner" aria-hidden="true"></span>' + rotulo[1]
      : rotulo[0];
  }

  el['form-login'].addEventListener('submit', function (ev) {
    ev.preventDefault();
    var email = el['email'].value.trim();
    var senha = el['senha'].value;
    retorno('retorno-login', '', '');

    if (!email) { el['email'].focus(); return retorno('retorno-login', 'erro', 'Digite seu e-mail.'); }
    if (!senha) { el['senha'].focus(); return retorno('retorno-login', 'erro', 'Digite sua senha.'); }

    ocupado(el['btn-entrar'], true, ['Entrar', 'Entrando…']);

    Promise.resolve(Auth.entrar(email, senha)).then(function (r) {
      ocupado(el['btn-entrar'], false, ['Entrar', 'Entrando…']);
      if (!r.ok) return retorno('retorno-login', 'erro', r.erro || 'Não foi possível entrar.');
      window.location.hash = '#/inicio';
      entrarComSessao(email);
    }).catch(function (e) {
      console.error('[Auth] falha ao entrar:', e);
      ocupado(el['btn-entrar'], false, ['Entrar', 'Entrando…']);
      retorno('retorno-login', 'erro', 'Não foi possível entrar agora. Verifique sua conexão e tente novamente.');
    });
  });

  el['link-recuperar'].addEventListener('click', function (ev) {
    ev.preventDefault();
    var email = el['email'].value.trim();
    if (!email) {
      el['email'].focus();
      return retorno('retorno-login', 'info', 'Digite o e-mail da sua compra e toque de novo em "Esqueci minha senha".');
    }
    retorno('retorno-login', 'info', 'Enviando…');
    Promise.resolve(Auth.recuperarSenha(email)).then(function (r) {
      if (!r.ok) return retorno('retorno-login', 'erro', r.erro || 'Não foi possível enviar agora.');
      retorno('retorno-login', 'ok', r.aviso || 'Se este e-mail tiver acesso, você vai receber as instruções em instantes.');
    }).catch(function (e) {
      console.error('[Auth] falha ao recuperar senha:', e);
      retorno('retorno-login', 'erro', 'Não foi possível enviar agora. Tente novamente.');
    });
  });

  if (el['form-redefinir']) {
    el['form-redefinir'].addEventListener('submit', function (ev) {
      ev.preventDefault();
      var nova = el['nova-senha'].value;
      retorno('retorno-redefinir', '', '');
      if (!nova || nova.length < 6) {
        return retorno('retorno-redefinir', 'erro', 'A nova senha precisa ter pelo menos 6 caracteres.');
      }
      ocupado(el['btn-redefinir'], true, ['Salvar nova senha', 'Salvando…']);
      Promise.resolve(Auth.definirSenha(nova)).then(function (r) {
        ocupado(el['btn-redefinir'], false, ['Salvar nova senha', 'Salvando…']);
        if (!r.ok) return retorno('retorno-redefinir', 'erro', r.erro);
        retorno('retorno-redefinir', 'ok', 'Senha alterada. Entrando…');
        Promise.resolve(Auth.sessao()).then(function (s) {
          window.location.hash = '#/inicio';
          if (s && s.email) entrarComSessao(s.email); else abrirLogin();
        });
      }).catch(function (e) {
        console.error('[Auth] falha ao definir senha:', e);
        ocupado(el['btn-redefinir'], false, ['Salvar nova senha', 'Salvando…']);
        retorno('retorno-redefinir', 'erro', 'Não foi possível salvar agora. Peça um novo link.');
      });
    });
  }

  /* ---------------- inicialização ---------------- */

  // Guarda de rota: sem sessão ou sem autorização, nada é renderizado.
  window.addEventListener('hashchange', function () {
    if (window.location.hash === '#/redefinir') return abrirRedefinir();
    if (ROTAS_ANTIGAS.indexOf(window.location.hash) > -1) {
      window.location.hash = '#/inicio';
      return;
    }
    if (!estado.email) return abrirLogin();
    if (!estado.autorizado) return;
    render();
  });

  /* ---------------------------------------------------------
     TRAVA DE PUBLICAÇÃO
     Modo demonstração não verifica nada de verdade. Se ele
     estiver ativo em domínio publicado, a área não abre.
     --------------------------------------------------------- */
  function ambienteLocal() {
    var h = window.location.hostname || '';
    return h === 'localhost' || h === '127.0.0.1' || h === '' ||
           h === '::1' || /\.local$/.test(h) || window.location.protocol === 'file:';
  }

  function demoInseguroEmProducao() {
    return Auth.modo() === 'demo' && CFG.travarDemoEmProducao !== false && !ambienteLocal();
  }

  if (demoInseguroEmProducao()) {
    esconder(el['splash']);
    esconder(el['tela-login']);
    if (el['tela-bloqueio']) {
      mostrar(el['tela-bloqueio']);
      el['tela-bloqueio'].style.display = 'flex';
    }
    console.error('[Sticker Pro] Área bloqueada: modo demonstração em domínio publicado. ' +
                  'Configure supabaseUrl e supabaseAnonKey em config.js.');
    return;
  }


  montarNav();

  if (el['btn-sair-sidebar']) el['btn-sair-sidebar'].addEventListener('click', sairDaConta);

  if (el['btn-negado-sair']) el['btn-negado-sair'].addEventListener('click', sairDaConta);
  if (el['btn-negado-tentar']) {
    el['btn-negado-tentar'].addEventListener('click', function () {
      if (estado.email) entrarComSessao(estado.email);
      else abrirLogin();
    });
  }

  if (Auth.modo() === 'demo') {
    el['selo-demo'].textContent = 'Modo demonstração — o login ainda não protege o conteúdo';
    el['selo-demo'].style.display = 'block';
  }

  // Login/logout em outra aba reflete aqui.
  if (Auth.aoMudar) {
    Auth.aoMudar(function (evento, sessao) {
      if (evento === 'PASSWORD_RECOVERY') return abrirRedefinir();
      if (evento === 'SIGNED_OUT') return abrirLogin();
      if (sessao && sessao.email && !estado.email) entrarComSessao(sessao.email);
    });
  }

  /* A cliente chegou pelo link de redefinir senha?
     Com PKCE o Supabase devolve ?code=... na query. */
  function chegouPorRecuperacao() {
    var q = window.location.search || '';
    return window.location.hash === '#/redefinir' ||
           q.indexOf('code=') > -1 ||
           q.indexOf('type=recovery') > -1;
  }

  Promise.resolve(Auth.sessao()).then(function (s) {
    if (chegouPorRecuperacao()) return abrirRedefinir();
    if (s && s.email) entrarComSessao(s.email);
    else abrirLogin();
  }).catch(function (e) {
    console.error('[Auth] falha ao ler sessão:', e);
    abrirLogin();
  });
})();
