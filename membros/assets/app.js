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
    busca: '',

    /* pastas do bucket, vindas da RPC */
    categoriasRemotas: [],
    mapaCategorias: {},
    carregandoCategorias: false,
    categoriasCarregadas: false,
    erroCategorias: null,
    atualizarGradeInicio: null
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

 function mostrar(no) {
  if (!no) return;

  no.classList.add('ativo');
  no.style.display = '';
}

function esconder(no) {
  if (!no) return;

  no.classList.remove('ativo');
  no.style.display = 'none';
}
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
       pasta:
  cat.id === '3d'
    ? 'Figurinhas PREMIUM/3d Cristas'
    : cat.id === 'academia'
      ? 'Academia'
      : cat.id === 'sao-miguel-arcanjo'
        ? 'Figurinhas PREMIUM/40 Dias com Sao Miguel Arcanjo'
        : cat.id === 'achadinhos'
          ? 'Figurinhas PREMIUM/Achadinhos'
          : cat.id === 'advocacia'
            ? 'Figurinhas PREMIUM/Advocacia'
            : cat.id === 'fig-geral'
              ? 'Figurinhas'
              : cat.id === 'min-geral'
                ? 'Figurinha minimalista'
                : cat.id === 'icones-geral'
                  ? 'ICONES'
                  : s.pasta,
          linkLocal: cat.link || '',
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

  /* Prioridade: link vindo do Supabase > link declarado no content.js.
     Quando a categoria for cadastrada na tabela "colecoes", o link do
     servidor assume sozinho, sem precisar mexer nesta lógica. */
  function linkDaCategoria(item) {
    return Dados.linkDe(item.id, item.pasta) || item.linkLocal || '';
  }

  function topo(eyebrow, titulo, intro) {
    return '<header class="pagina-topo">' +
      '<span class="eyebrow">' + esc(eyebrow) + '</span>' +
      '<h1 class="pagina-titulo">' + esc(titulo) + '</h1>' +
      (intro ? '<p class="pagina-intro">' + esc(intro) + '</p>' : '') +
    '</header>';
  }

  function cardCategoria(item) {
    var capa = Dados.capa(item.id);

    var visual = capa
      ? '<span class="cartao-capa"><img src="' + esc(capa) + '" alt="" loading="lazy" decoding="async"></span>'
      : '<span class="cartao-glifo" aria-hidden="true">' + esc(item.emoji) + '</span>';

    var miolo =
      visual +
      '<span class="cartao-nome">' + esc(item.nome) + '</span>' +
      '<span class="cartao-nota">' + esc(item.nota) + '</span>' +
      '<span class="selo selo-ok">Abrir coleção</span>' +
      '<span class="cartao-acao">Ver figurinhas <span aria-hidden="true">→</span></span>';

    /* Card do bucket: sem id, abre pelo caminho.
       Os 8 cards manuais continuam usando abrirColecao(). */
    if (item.remoto) {
      return '<button class="cartao" type="button"' +
        ' data-caminho="' + esc(item.pasta) + '"' +
        ' data-nome="' + esc(item.nome) + '">' + miolo + '</button>';
    }

    return '<button class="cartao" type="button" onclick="abrirColecao(\'' +
      esc(item.id) +
      '\')">' + miolo + '</button>';
  }

  /* ==========================================================
     GALERIA INTERNA — SUPABASE STORAGE
     ========================================================== */

  function abrirColecao(idCategoria) {
    var itens = catalogo();

    var item = itens.find(function (i) {
      return i.id === idCategoria;
    });

    if (!item) {
      console.error('[Galeria] Categoria não encontrada:', idCategoria);
      return;
    }

    var pasta = item.pasta;

    if (!pasta) {
      console.error('[Galeria] Pasta não definida:', item.nome);
      return;
    }

    var conteudo = el['conteudo'];

    conteudo.innerHTML =
      '<div class="pagina entra">' +
        '<header class="pagina-topo">' +
          '<button type="button" class="voltar" id="btn-voltar-galeria">← Voltar</button>' +
          '<span class="eyebrow">' + esc(item.emoji || '✨') + '</span>' +
          '<h1 class="pagina-titulo">' + esc(item.nome) + '</h1>' +
          '<p class="pagina-intro">Escolha uma figurinha para usar no seu Story.</p>' +
        '</header>' +
        '<div id="galeria-status" class="aviso aviso-info">Carregando figurinhas…</div>' +
        '<div id="galeria-conteudo"></div>' +
      '</div>';

    var voltar = document.getElementById('btn-voltar-galeria');

    if (voltar) {
      voltar.addEventListener('click', function () {
        render();
      });
    }

        var colecoesGrandes = [
      'fig-geral',
      'min-geral',
      'icones-geral'
    ];

    if (colecoesGrandes.indexOf(item.id) !== -1) {
      console.log(
        '[Galeria] Coleção grande detectada:',
        item.id,
        item.nome,
        pasta
      );

      abrirNavegadorDePastas(item, pasta);
      return;
    }

    carregarImagensStorage(pasta)
      .then(function (imagens) {
        var status = document.getElementById('galeria-status');
        var galeria = document.getElementById('galeria-conteudo');

        if (status) status.remove();

        if (!imagens.length) {
          if (galeria) {
            galeria.innerHTML =
              '<div class="aviso aviso-info">' +
                'Nenhuma figurinha encontrada nesta coleção.' +
              '</div>';
          }
          return;
        }

        if (galeria) {
          galeria.innerHTML =
            '<div class="galeria-grade">' +
              imagens.map(function (imagem) {
                return (
                  '<figure class="fig">' +
                    '<img src="' + esc(imagem) + '"' +
                      ' alt="Figurinha"' +
                      ' loading="lazy"' +
                      ' decoding="async">' +
                  '</figure>'
                );
              }).join('') +
            '</div>';
        }
      })
      .catch(function (erro) {
        console.error('[Galeria] Erro ao carregar:', erro);

        var status = document.getElementById('galeria-status');

        if (status) {
          status.className = 'aviso aviso-erro';
          status.textContent =
            'Não foi possível carregar as figurinhas. Tente novamente.';
        }
      });
  }
     function abrirNavegadorDePastas(item, pasta) {
    var conteudo = el['conteudo'];

    conteudo.innerHTML =
      '<div class="pagina entra">' +
        '<header class="pagina-topo">' +
          '<button type="button" class="voltar" id="btn-voltar-pastas">← Voltar</button>' +
          '<span class="eyebrow">' + esc(item.emoji || '📁') + '</span>' +
          '<h1 class="pagina-titulo">' + esc(item.nome) + '</h1>' +
          '<p class="pagina-intro">Escolha uma categoria.</p>' +
        '</header>' +
              '<div class="busca-pastas">' +
          '<span class="busca-pastas-icone">🔎</span>' +
          '<input ' +
            'type="search" ' +
            'id="busca-pastas-input" ' +
            'placeholder="Buscar uma categoria..." ' +
            'autocomplete="off">' +
        '</div>' +

        '<div id="pastas-status" class="aviso aviso-info">' +
          'Carregando categorias…' +
        '</div>' +

        '<div id="pastas-conteudo"></div>' +

        '<div id="figuras-diretas"></div>' +

      '</div>';

    var voltar = document.getElementById('btn-voltar-pastas');

    if (voltar) {
      voltar.addEventListener('click', function () {
        render();
      });
    }

    /* Pasta mista: as imagens soltas aparecem abaixo das subpastas.
       Roda em paralelo, sem bloquear a grade de pastas. */
    montarFigurasDiretas(pasta);

    carregarPastasStorage(pasta)
      .then(function (pastas) {

        var status =
          document.getElementById('pastas-status');

        var area =
          document.getElementById('pastas-conteudo');

        if (status) {
          status.remove();
        }

        if (!pastas.length) {

          if (area) {
            area.innerHTML =
              '<div class="aviso aviso-info">' +
                'Nenhuma categoria encontrada.' +
              '</div>';
          }

          return;
        }

        if (area) {

          area.innerHTML =
            '<div class="grade-pastas">' +

              pastas.map(function (pastaItem) {

  return (
    '<button type="button" class="pasta-card" ' +
      'data-caminho="' + esc(pastaItem.caminho) + '">' +

      '<span class="pasta-icone">📁</span>' +

      '<span class="pasta-nome">' +
        esc(pastaItem.nome) +
      '</span>' +

    '</button>'
  );

}).join('') +

'</div>';
          var botoesPastas =
            area.querySelectorAll('.pasta-card');
                   var buscaPastas =
          document.getElementById('busca-pastas-input');

        if (buscaPastas) {

          buscaPastas.addEventListener('input', function () {

            var termo =
              normalizar(buscaPastas.value.trim());

            botoesPastas.forEach(function (botao) {

              var nome =
                botao.querySelector('.pasta-nome');

              var texto =
                nome ? normalizar(nome.textContent) : '';

              botao.style.display =
                !termo || texto.indexOf(termo) !== -1
                  ? ''
                  : 'none';

            });

          });

        }

          botoesPastas.forEach(function (botao) {

            botao.addEventListener('click', function () {

              var caminho =
                botao.getAttribute('data-caminho');

              var nome =
                botao.querySelector('.pasta-nome');

              nome =
                nome ? nome.textContent : 'Coleção';

              abrirCategoriaPorCaminho(caminho, nome);

            });

          });
        }

      })
      .catch(function (erro) {

        console.error(
          '[Pastas] Erro ao carregar:',
          erro
        );

        var status =
          document.getElementById('pastas-status');

        if (status) {

          status.className =
            'aviso aviso-erro';

          status.textContent =
            'Não foi possível carregar as categorias. Tente novamente.';

        }

      });
  }
   function abrirPastaDireta(caminho, nome) {
  var conteudo = el['conteudo'];

  conteudo.innerHTML =
    '<div class="pagina entra">' +
      '<header class="pagina-topo">' +
        '<button type="button" class="voltar" id="btn-voltar-pasta-direta">← Voltar</button>' +
        '<span class="eyebrow">📁</span>' +
        '<h1 class="pagina-titulo">' + esc(nome) + '</h1>' +
        '<p class="pagina-intro">Escolha uma figurinha para usar no seu Story.</p>' +
      '</header>' +
      '<div id="galeria-status" class="aviso aviso-info">Carregando figurinhas…</div>' +
      '<div id="galeria-conteudo"></div>' +
    '</div>';

  var voltar =
    document.getElementById('btn-voltar-pasta-direta');

  if (voltar) {
    voltar.addEventListener('click', function () {
      render();
    });
  }

  carregarImagensStorage(caminho)
    .then(function (imagens) {

      var status =
        document.getElementById('galeria-status');

      var galeria =
        document.getElementById('galeria-conteudo');

      if (status) {
        status.remove();
      }

      if (!imagens.length) {

        if (galeria) {
          galeria.innerHTML =
            '<div class="aviso aviso-info">' +
              'Nenhuma figurinha encontrada nesta pasta.' +
            '</div>';
        }

        return;
      }

      if (galeria) {

        galeria.innerHTML =
          '<div class="galeria-grade">' +

            imagens.map(function (imagem) {

              return (
                '<figure class="fig">' +
                  '<img src="' + esc(imagem) + '"' +
                    ' alt="Figurinha"' +
                    ' loading="lazy"' +
                    ' decoding="async">' +
                '</figure>'
              );

            }).join('') +

          '</div>';
      }

    })
    .catch(function (erro) {

      console.error(
        '[Pasta] Erro ao carregar figurinhas:',
        erro
      );

      var status =
        document.getElementById('galeria-status');

      if (status) {

        status.className =
          'aviso aviso-erro';

        status.textContent =
          'Não foi possível carregar as figurinhas. Tente novamente.';

      }

    });
}
     function carregarPastasStorage(pasta) {
    var CFG = window.STICKER_CONFIG || {};

    if (!CFG.supabaseUrl || !CFG.supabaseAnonKey) {
      return Promise.reject(
        new Error('Supabase não configurado.')
      );
    }

    return Promise.resolve(Auth.token())
      .then(function (token) {

        if (!token) {
          throw new Error('Sessão não encontrada.');
        }

        return listarPastasStorage(pasta, token);
      });
  }
    function listarPastasStorage(pasta, token) {
  var CFG = window.STICKER_CONFIG || {};

  var supabaseUrl =
    CFG.supabaseUrl.replace(/\/+$/, '');

  return fetch(
    supabaseUrl +
    '/rest/v1/rpc/listar_pastas_figurinhas',
    {
      method: 'POST',

      headers: {
        apikey: CFG.supabaseAnonKey,
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },

      body: JSON.stringify({
        prefixo: pasta
      })
    }
  )
  .then(function (resp) {

    if (!resp.ok) {
      return resp.text()
        .then(function (texto) {
          throw new Error(
            'RPC respondeu ' +
            resp.status +
            ': ' +
            texto
          );
        });
    }

    return resp.json();
  })
  .then(function (dados) {

    if (!Array.isArray(dados)) {
      return [];
    }

    return dados.map(function (item) {
      return {
        nome: item.nome,
        caminho: item.caminho
      };
    });
  });
}

  /* ==========================================================
     CATEGORIAS DO BUCKET — RPC agregada
     Uma chamada por sessão devolve os metadados das 433 pastas.
     Nenhuma imagem trafega para o navegador.
     ========================================================== */

  var CACHE_CATEGORIAS = 'stickerpro_categorias_v2';
  var CACHE_MINUTOS = 15;

  function lerCacheCategorias() {
    try {
      var bruto = sessionStorage.getItem(CACHE_CATEGORIAS);
      if (!bruto) return null;

      var dados = JSON.parse(bruto);
      if (!dados || !Array.isArray(dados.itens)) return null;

      if (Date.now() - (dados.quando || 0) > CACHE_MINUTOS * 60000) {
        return null;
      }

      return dados.itens;
    } catch (e) {
      return null;
    }
  }

  function gravarCacheCategorias(itens) {
    try {
      sessionStorage.setItem(CACHE_CATEGORIAS, JSON.stringify({
        quando: Date.now(),
        itens: itens
      }));
    } catch (e) {}
  }

  function listarCategoriasRPC(token) {
    var CFG = window.STICKER_CONFIG || {};

    var url =
      CFG.supabaseUrl.replace(/\/+$/, '') +
      '/rest/v1/rpc/listar_todas_categorias_figurinhas';

    return fetch(url, {
      method: 'POST',

      headers: {
        apikey: CFG.supabaseAnonKey,
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },

      body: JSON.stringify({
        profundidade: CFG.profundidadeCategorias || 4
      })
    })
    .then(function (resp) {
      if (!resp.ok) {
        return resp.text().then(function (texto) {
          throw new Error('RPC respondeu ' + resp.status + ': ' + texto);
        });
      }

      return resp.json();
    })
    .then(function (dados) {
      if (!Array.isArray(dados)) return [];

      return dados
        .filter(function (item) {
          return item && item.nome && item.caminho;
        })
        .map(function (item) {
          return {
            nome: item.nome,
            caminho: item.caminho,
            pai: item.pai || '',
            nivel: item.nivel || 1,
            diretos: item.arquivos_diretos || 0,
            subpastas: item.subpastas || 0,
            total: item.total_arquivos || 0
          };
        });
    });
  }

  /* Índice por caminho: é ele que torna o clique instantâneo. */
  function montarMapaCategorias(itens) {
    var mapa = {};

    itens.forEach(function (cat) {
      mapa[normalizar(cat.caminho)] = cat;
    });

    estado.mapaCategorias = mapa;
  }

  function infoDaPasta(caminho) {
    if (!caminho) return null;
    return estado.mapaCategorias[normalizar(caminho)] || null;
  }

  function carregarCategoriasRemotas() {
    if (estado.categoriasCarregadas) {
      return Promise.resolve(estado.categoriasRemotas);
    }

    var CFG = window.STICKER_CONFIG || {};

    if (!CFG.supabaseUrl || !CFG.supabaseAnonKey) {
      estado.categoriasCarregadas = true;
      return Promise.resolve([]);
    }

    var cache = lerCacheCategorias();

    if (cache) {
      estado.categoriasRemotas = cache;
      montarMapaCategorias(cache);
      estado.categoriasCarregadas = true;
      return Promise.resolve(cache);
    }

    estado.carregandoCategorias = true;
    estado.erroCategorias = null;

    return Promise.resolve(Auth.token())
      .then(function (token) {
        if (!token) throw new Error('Sessão não encontrada.');
        return listarCategoriasRPC(token);
      })
      .then(function (itens) {
        estado.categoriasRemotas = itens;
        montarMapaCategorias(itens);
        estado.categoriasCarregadas = true;
        estado.carregandoCategorias = false;

        gravarCacheCategorias(itens);

        console.log('[Categorias] carregadas:', itens.length);

        return itens;
      })
      .catch(function (erro) {
        console.error('[Categorias] falha:', erro);

        estado.carregandoCategorias = false;
        estado.erroCategorias = erro.message || 'erro';
        estado.categoriasRemotas = [];
        estado.mapaCategorias = {};

        return [];
      });
  }

  /* Catálogo manual (content.js) PRIMEIRO — mantém capa, emoji,
     link e nota. Depois as pastas do bucket, sem duplicar. */
  function catalogoCompleto() {
    var manuais = catalogo();
    var vistos = {};

    manuais.forEach(function (item) {
      if (item.pasta) vistos[normalizar(item.pasta)] = true;
    });

    var remotos = [];

    estado.categoriasRemotas.forEach(function (cat) {
      var chave = normalizar(cat.caminho);

      if (vistos[chave]) return;
      vistos[chave] = true;

      remotos.push({
        id: '',
        nome: cat.nome,
        /* o caminho do pai vira a nota: dá contexto no card
           e ainda entra na busca, já que filtrar() lê a nota */
        nota: cat.pai ? cat.pai.split('/').join(' / ') : '',
        emoji: '📁',
        pasta: cat.caminho,
        linkLocal: '',
        secao: 'storage',
        secaoTitulo: 'Categorias',
        remoto: true
      });
    });

    remotos.sort(function (a, b) {
      return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
    });

    return manuais.concat(remotos);
  }

  /* ==========================================================
     CLIQUE INTELIGENTE
     A decisão vem do payload já em memória: zero requisições.
     ========================================================== */

  function abrirCategoriaPorCaminho(caminho, nome) {
    if (!caminho) return;

    nome = nome || 'Coleção';

    var info = infoDaPasta(caminho);

    if (info) {
      /* Container OU mista -> navegador de pastas.
         O navegador mostra as imagens diretas, se houver. */
      if (info.subpastas > 0) {
        abrirNavegadorDePastas({ nome: nome, emoji: '📁' }, caminho);
        return;
      }

      /* Folha simples -> galeria direta. */
      abrirPastaDireta(caminho, nome);
      return;
    }

    /* Fallback: caminho fora do mapa (cache vencido, RPC fora do ar).
       Consulta leve, sem varredura de arquivos. */
    el['conteudo'].innerHTML =
      '<div class="pagina entra">' +
        '<header class="pagina-topo">' +
          '<button type="button" class="voltar" id="btn-voltar-abrindo">← Voltar</button>' +
          '<span class="eyebrow">📁</span>' +
          '<h1 class="pagina-titulo">' + esc(nome) + '</h1>' +
        '</header>' +
        '<div class="aviso aviso-info">Abrindo…</div>' +
      '</div>';

    var voltar = document.getElementById('btn-voltar-abrindo');

    if (voltar) {
      voltar.addEventListener('click', function () { render(); });
    }

    carregarPastasStorage(caminho)
      .then(function (subpastas) {
        if (subpastas && subpastas.length) {
          abrirNavegadorDePastas({ nome: nome, emoji: '📁' }, caminho);
          return;
        }

        abrirPastaDireta(caminho, nome);
      })
      .catch(function (erro) {
        console.error('[Categoria] falha ao inspecionar:', erro);
        abrirPastaDireta(caminho, nome);
      });
  }

  window.abrirCategoria = abrirCategoriaPorCaminho;

  function ligarCliquesCategorias(area) {
    if (!area) return;

    var botoes = area.querySelectorAll('.cartao[data-caminho]');

    botoes.forEach(function (botao) {
      botao.addEventListener('click', function () {
        abrirCategoriaPorCaminho(
          botao.getAttribute('data-caminho'),
          botao.getAttribute('data-nome')
        );
      });
    });
  }

  /* ==========================================================
     IMAGENS DIRETAS — para pastas mistas
     NÃO é recursiva: lista só o nível da própria pasta e
     ignora as subpastas de propósito.
     ========================================================== */

  function listarImagensDiretas(pasta, token, offset, acumulado) {
    var CFG = window.STICKER_CONFIG || {};
    var limite = 1000;
    var inicio = offset || 0;
    var lista = acumulado || [];

    var url =
      CFG.supabaseUrl.replace(/\/+$/, '') +
      '/storage/v1/object/list/Figurinhas';

    return fetch(url, {
      method: 'POST',

      headers: {
        apikey: CFG.supabaseAnonKey,
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },

      body: JSON.stringify({
        prefix: pasta.replace(/\/+$/, ''),
        limit: limite,
        offset: inicio,
        sortBy: { column: 'name', order: 'asc' }
      })
    })
    .then(function (resp) {
      if (!resp.ok) {
        return resp.text().then(function (texto) {
          throw new Error('Storage respondeu ' + resp.status + ': ' + texto);
        });
      }

      return resp.json();
    })
    .then(function (itens) {
      itens = Array.isArray(itens) ? itens : [];

      itens.forEach(function (arquivo) {
        if (!arquivo || !arquivo.name) return;

        /* id === null é subpasta. Aqui ela é ignorada:
           quem cuida das subpastas é a grade de cima. */
        if (arquivo.id === null) return;

        if (!/\.(png|jpe?g|webp|gif)$/i.test(arquivo.name)) return;

        lista.push(pasta.replace(/\/+$/, '') + '/' + arquivo.name);
      });

      if (itens.length === limite) {
        return listarImagensDiretas(pasta, token, inicio + limite, lista);
      }

      return lista;
    });
  }

  /* ==========================================================
     ASSINATURA EM LOTE
     Usada SOMENTE pelas imagens diretas de pastas mistas.
     A galeria comum (listarPastaStorage) continua assinando
     uma a uma — essa é a EDIÇÃO 8, ainda não aplicada.
     Se o lote falhar, cai sozinho em gerarUrlAssinada.
     ========================================================== */

  function assinarEmLote(caminhos, token) {
    var CFG = window.STICKER_CONFIG || {};
    var TAMANHO = 100;

    var base = CFG.supabaseUrl.replace(/\/+$/, '') + '/storage/v1';
    var url = base + '/object/sign/Figurinhas';

    function completar(u) {
      if (u.indexOf('http') === 0) return u;
      return base + (u.charAt(0) === '/' ? '' : '/') + u;
    }

    function lote(inicio, acumulado) {
      if (inicio >= caminhos.length) {
        return Promise.resolve(acumulado);
      }

      var fatia = caminhos.slice(inicio, inicio + TAMANHO);

      return fetch(url, {
        method: 'POST',

        headers: {
          apikey: CFG.supabaseAnonKey,
          Authorization: 'Bearer ' + token,
          'Content-Type': 'application/json'
        },

        body: JSON.stringify({
          expiresIn: 3600,
          paths: fatia
        })
      })
      .then(function (resp) {
        if (!resp.ok) throw new Error('lote respondeu ' + resp.status);
        return resp.json();
      })
      .then(function (dados) {
        if (!Array.isArray(dados)) throw new Error('resposta inesperada');

        dados.forEach(function (d) {
          var assinada = d && (d.signedURL || d.signedUrl);
          if (assinada) acumulado.push(completar(assinada));
        });

        return lote(inicio + TAMANHO, acumulado);
      })
      .catch(function (erro) {
        console.warn('[Assinatura] lote falhou, modo individual:', erro);

        return Promise.all(
          fatia.map(function (c) { return gerarUrlAssinada(c, token); })
        )
        .then(function (urls) {
          urls.forEach(function (u) { acumulado.push(u); });
          return lote(inicio + TAMANHO, acumulado);
        });
      });
    }

    return lote(0, []);
  }

  function carregarImagensDiretas(pasta) {
    var CFG = window.STICKER_CONFIG || {};

    if (!CFG.supabaseUrl || !CFG.supabaseAnonKey) {
      return Promise.reject(new Error('Supabase não configurado.'));
    }

    return Promise.resolve(Auth.token()).then(function (token) {
      if (!token) throw new Error('Sessão não encontrada.');

      return listarImagensDiretas(pasta, token).then(function (caminhos) {
        if (!caminhos.length) return [];

        caminhos.sort(function (a, b) {
          return a.localeCompare(b, 'pt-BR', {
            numeric: true, sensitivity: 'base'
          });
        });

        return assinarEmLote(caminhos, token);
      });
    });
  }

  function gradeDeFiguras(imagens) {
    return '<div class="galeria-grade">' +
      imagens.map(function (imagem) {
        return '<figure class="fig">' +
          '<img src="' + esc(imagem) + '" alt="Figurinha"' +
          ' loading="lazy" decoding="async">' +
        '</figure>';
      }).join('') +
    '</div>';
  }

  /* Pastas mistas: renderiza as imagens soltas abaixo das subpastas. */
  function montarFigurasDiretas(pasta) {
    var area = document.getElementById('figuras-diretas');
    if (!area) return;

    var info = infoDaPasta(pasta);

    /* Se o mapa garante que não há imagens diretas, nem consulta. */
    if (info && info.diretos === 0) return;

    area.innerHTML =
      '<div class="aviso aviso-info">Carregando figurinhas desta pasta…</div>';

    carregarImagensDiretas(pasta)
      .then(function (imagens) {
        if (!imagens.length) {
          area.innerHTML = '';
          return;
        }

        area.innerHTML =
          '<h2 class="secao-titulo" style="margin-top:30px;">' +
            'Figurinhas desta pasta' +
          '</h2>' +
          gradeDeFiguras(imagens);
      })
      .catch(function (erro) {
        console.error('[Figuras diretas] falha:', erro);
        area.innerHTML = '';
      });
  }

  function carregarImagensStorage(pasta) {
    var CFG = window.STICKER_CONFIG || {};

    if (!CFG.supabaseUrl || !CFG.supabaseAnonKey) {
      return Promise.reject(new Error('Supabase não configurado.'));
    }

    return Promise.resolve(Auth.token()).then(function (token) {
      if (!token) {
        throw new Error('Sessão não encontrada.');
      }

      return listarPastaStorage(pasta, token);
    });
  }

  /*
     O Storage retorna arquivos e pastas.
     Pastas vêm com id === null; arquivos possuem id.
     Isso permite percorrer automaticamente todas as subpastas.
  */
function listarPastaStorage(pasta, token, offset) {
  var CFG = window.STICKER_CONFIG || {};
  var limite = 1000;
  var inicio = offset || 0;

  var url =
    CFG.supabaseUrl.replace(/\/+$/, '') +
    '/storage/v1/object/list/Figurinhas';

  return fetch(url, {
    method: 'POST',

    headers: {
      apikey: CFG.supabaseAnonKey,
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },

    body: JSON.stringify({
      prefix: pasta.replace(/\/+$/, ''),
      limit: limite,
      offset: inicio,
      sortBy: {
        column: 'name',
        order: 'asc'
      }
    })
  })
  .then(function (resp) {
    if (!resp.ok) {
      return resp.text().then(function (texto) {
        throw new Error(
          'Storage respondeu ' +
          resp.status +
          ': ' +
          texto
        );
      });
    }

    return resp.json();
  })
  .then(function (arquivos) {

    arquivos = Array.isArray(arquivos)
      ? arquivos
      : [];

    var imagens = [];
    var subpastas = [];

    arquivos.forEach(function (arquivo) {

      if (!arquivo || !arquivo.name) {
        return;
      }

      var caminho =
        pasta.replace(/\/+$/, '') +
        '/' +
        arquivo.name;

      /*
       * Arquivos de imagem entram diretamente na lista.
       */
      if (
        /\.(png|jpe?g|webp|gif)$/i.test(
          arquivo.name
        )
      ) {
        imagens.push(caminho);
        return;
      }

      /*
       * Pastas/subpastas serão percorridas
       * separadamente.
       */
      if (arquivo.id === null) {
        subpastas.push(caminho);
      }
    });

    /*
     * Se houver mais de 1000 itens, busca a próxima página.
     */
    var proximaPagina =
      arquivos.length === limite
        ? listarPastaStorage(
            pasta,
            token,
            inicio + limite
          )
        : Promise.resolve([]);

    /*
     * Busca também todas as subpastas.
     */
    var promessasSubpastas =
      subpastas.map(function (subpasta) {
        return listarPastaStorage(
          subpasta,
          token
        );
      });

    return Promise.all([
      Promise.resolve(imagens),
      Promise.all(promessasSubpastas),
      proximaPagina
    ]);
  })
  .then(function (partes) {

    var imagens = partes[0] || [];
    var resultadosSubpastas = partes[1] || [];
    var imagensProximaPagina = partes[2] || [];

    /*
     * Junta as imagens da pasta atual.
     */
    imagens = imagens.concat(
      imagensProximaPagina
    );

    /*
     * Junta as imagens das subpastas.
     */
    resultadosSubpastas.forEach(function (resultado) {
      imagens = imagens.concat(resultado);
    });

    imagens.sort(function (a, b) {
      return a.localeCompare(
        b,
        'pt-BR',
        {
          numeric: true,
          sensitivity: 'base'
        }
      );
    });

    /*
     * Transforma cada caminho em URL assinada.
     */
    return Promise.all(
      imagens.map(function (caminho) {
        return gerarUrlAssinada(
          caminho,
          token
        );
      })
    );
  });
}

  function gerarUrlAssinada(caminho, token) {
    var CFG = window.STICKER_CONFIG || {};

    var url =
      CFG.supabaseUrl.replace(/\/+$/, '') +
      '/storage/v1/object/sign/Figurinhas/' +
      caminho
        .split('/')
        .map(function (parte) {
          return encodeURIComponent(parte);
        })
        .join('/');

    return fetch(url, {
      method: 'POST',
      headers: {
        apikey: CFG.supabaseAnonKey,
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        expiresIn: 3600
      })
    })
    .then(function (resp) {
      if (!resp.ok) {
        return resp.text().then(function (texto) {
          throw new Error(
            'Erro ao gerar URL assinada: ' +
            resp.status +
            ' ' +
            texto
          );
        });
      }

      return resp.json();
    })
    .then(function (dados) {
      if (!dados || !dados.signedURL) {
        throw new Error(
          'Supabase não retornou signedURL.'
        );
      }

      if (dados.signedURL.indexOf('http') === 0) {
        return dados.signedURL;
      }

      return (
        CFG.supabaseUrl.replace(/\/+$/, '') +
        '/storage/v1' +
        dados.signedURL
      );
    });
  }

  window.abrirColecao = abrirColecao;

  /* Destaque principal, no espírito de uma página de entrega. */
  function destaquePrincipal() {
    var sec = C.secoes.premium;
    var link = Dados.link(sec.pasta);
    if (!link) return '';

    return '<section class="entrega">' +
      '<span class="entrega-glifo" aria-hidden="true">' + esc(sec.emoji || '✨') + '</span>' +
      '<div class="entrega-corpo">' +
        '<span class="entrega-kicker">Seu acesso Premium</span>' +
        '<h2>' + esc(sec.titulo || 'Figurinhas Premium') + '</h2>' +
        '<p>' + esc(sec.descricao || 'Acesse sua coleção de figurinhas.') + '</p>' +
        '<a class="btn btn-principal" href="' + esc(link) + '" target="_blank" rel="noopener noreferrer">Abrir coleção <span aria-hidden="true">→</span></a>' +
      '</div>' +
    '</section>';
  }

  function blocoBusca() {
    return '<div class="busca-wrap">' +
      '<label class="busca" for="campo-busca">' +
        '<span aria-hidden="true">⌕</span>' +
        '<input id="campo-busca" type="search" autocomplete="off" placeholder="Buscar figurinhas..." value="' + esc(estado.busca) + '">' +
        '<button type="button" id="limpar-busca" aria-label="Limpar busca">×</button>' +
      '</label>' +
    '</div>';
  }

  function gradeCategorias(itens) {
    if (!itens.length) {
      return '<div class="vazio-busca">' +
        '<span class="vazio-emoji" aria-hidden="true">🔎</span>' +
        '<strong class="vazio-titulo">Nenhuma categoria encontrada.</strong>' +
        '<span class="vazio-dica">Tente outro termo de busca.</span>' +
      '</div>';
    }

    return '<div class="grade-categorias">' +
      itens.map(cardCategoria).join('') +
    '</div>';
  }

  function avisoCategorias() {
    if (estado.carregandoCategorias) {
      return '<div class="aviso aviso-info">Carregando todas as categorias…</div>';
    }

    if (estado.erroCategorias) {
      return '<div class="aviso aviso-erro">' +
        'Não foi possível carregar a lista completa de categorias. ' +
        'Suas coleções principais continuam disponíveis.' +
      '</div>';
    }

    return '';
  }

  function textoResultado(todos, filtrados) {
    return '<span>' +
      (estado.busca
        ? filtrados.length + ' resultado(s)'
        : todos.length + ' categorias') +
    '</span>';
  }

  function paginaInicio() {
    var todos = catalogoCompleto();
    var filtrados = filtrar(todos, estado.busca);

    return '<div class="pagina pagina-inicio">' +
      '<header class="pagina-topo">' +
        '<span class="eyebrow">✨ Biblioteca</span>' +
        '<h1 class="pagina-titulo">Suas figurinhas</h1>' +
        '<p class="pagina-intro">Escolha uma coleção ou pesquise pelo que você precisa.</p>' +
      '</header>' +
      blocoBusca() +
      '<div id="aviso-categorias">' + avisoCategorias() + '</div>' +
      '<div class="resultado-busca" id="resultado-busca">' +
        textoResultado(todos, filtrados) +
      '</div>' +
      '<div id="grade-categorias-area">' +
        gradeCategorias(filtrados) +
      '</div>' +
    '</div>';
  }

  function paginaComoUsar() {
    return '<div class="pagina">' +
      topo('✨ Como usar', 'Como usar', 'É simples, rápido e feito para facilitar seus Stories.') +
      '<div class="passos">' +
        '<article class="passo">' +
          '<span class="passo-numero">01</span>' +
          '<h2>Escolha uma coleção</h2>' +
          '<p>Abra uma das categorias disponíveis na sua biblioteca.</p>' +
        '</article>' +
        '<article class="passo">' +
          '<span class="passo-numero">02</span>' +
          '<h2>Escolha sua figurinha</h2>' +
          '<p>Encontre a figurinha que combina com o seu Story.</p>' +
        '</article>' +
        '<article class="passo">' +
          '<span class="passo-numero">03</span>' +
          '<h2>Use no seu Story</h2>' +
          '<p>Salve ou use a imagem no seu conteúdo.</p>' +
        '</article>' +
      '</div>' +
    '</div>';
  }

  function paginaAcesso() {
    return '<div class="pagina">' +
      topo('🔑 Minha conta', 'Meu acesso', 'Confira os dados da sua assinatura.') +
      '<section class="acesso-card">' +
        '<div class="acesso-icone" aria-hidden="true">✓</div>' +
        '<div class="acesso-dados">' +
          '<div class="linha-acesso">' +
            '<span class="linha-rotulo">Produto</span>' +
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
        '</div>' +
      '</section>' +
    '</div>';
  }

  function render() {
    var rota = rotaAtual() || ROTAS[0];

    if (rota.id === 'comecar') {
      el['conteudo'].innerHTML = paginaComoUsar();
    } else if (rota.id === 'acesso') {
      el['conteudo'].innerHTML = paginaAcesso();
    } else {
      el['conteudo'].innerHTML = paginaInicio();
      prepararBusca();
      ligarCliquesCategorias(
        document.getElementById('grade-categorias-area')
      );

      /* Uma chamada por sessão; depois vem do cache. */
      if (!estado.categoriasCarregadas && !estado.carregandoCategorias) {
        carregarCategoriasRemotas().then(function () {
          if (estado.atualizarGradeInicio) {
            estado.atualizarGradeInicio();
          }
        });
      }
    }

    atualizarNav(rota.id);
  }

  function atualizarNav(ativo) {
    if (!el['nav']) return;

    var links = el['nav'].querySelectorAll('[data-rota]');

    links.forEach(function (link) {
      link.classList.toggle(
        'ativo',
        link.getAttribute('data-rota') === ativo
      );
    });
  }

  function prepararBusca() {
    var campo = document.getElementById('campo-busca');
    var limpar = document.getElementById('limpar-busca');

    if (!campo) return;

    /* Redesenha SÓ a grade. O campo de busca nunca é recriado:
       foco, cursor e teclado do celular ficam intactos.
       O filtro roda em memória sobre as 433 pastas. */
    function atualizarGrade() {
      var area = document.getElementById('grade-categorias-area');
      if (!area) return;

      var todos = catalogoCompleto();
      var filtrados = filtrar(todos, estado.busca);

      area.innerHTML = gradeCategorias(filtrados);
      ligarCliquesCategorias(area);

      var contador = document.getElementById('resultado-busca');
      if (contador) contador.innerHTML = textoResultado(todos, filtrados);

      var aviso = document.getElementById('aviso-categorias');
      if (aviso) aviso.innerHTML = avisoCategorias();
    }

    estado.atualizarGradeInicio = atualizarGrade;

    var timer = null;

    campo.addEventListener('input', function () {
      estado.busca = campo.value;

      if (timer) clearTimeout(timer);
      timer = setTimeout(atualizarGrade, 90);
    });

    if (limpar) {
      limpar.addEventListener('click', function () {
        estado.busca = '';
        campo.value = '';
        atualizarGrade();
        campo.focus();
      });
    }
  }

  function montarNav() {
    if (!el['nav']) return;

    el['nav'].innerHTML =
      '<a href="#/inicio" data-rota="inicio">' +
        '<span aria-hidden="true">⌂</span> Início' +
      '</a>' +
      '<a href="#/comecar" data-rota="comecar">' +
        '<span aria-hidden="true">✦</span> Como usar' +
      '</a>' +
      '<a href="#/acesso" data-rota="acesso">' +
        '<span aria-hidden="true">♙</span> Meu acesso' +
      '</a>' +
      '<button type="button" id="btn-sair-nav">' +
        '<span aria-hidden="true">↪</span> Sair' +
      '</button>';

    var sair = document.getElementById('btn-sair-nav');

    if (sair) {
      sair.addEventListener('click', sairDaConta);
    }
  }

  function mostrarApp() {
    esconder(el['splash']);
    esconder(el['tela-login']);
    esconder(el['tela-redefinir']);
    esconder(el['tela-negado']);
    esconder(el['tela-bloqueio']);

    mostrar(el['app']);

    montarNav();
    render();
  }

  function abrirLogin() {
    esconder(el['splash']);
    esconder(el['app']);
    esconder(el['tela-redefinir']);
    esconder(el['tela-negado']);
    esconder(el['tela-bloqueio']);

    mostrar(el['tela-login']);

    if (el['email']) {
      el['email'].focus();
    }
  }

  function abrirNegado(email) {
    esconder(el['splash']);
    esconder(el['app']);
    esconder(el['tela-login']);
    esconder(el['tela-redefinir']);
    esconder(el['tela-bloqueio']);

    mostrar(el['tela-negado']);

    if (el['negado-email']) {
      el['negado-email'].textContent =
        email || '';
    }
  }

  function abrirBloqueio() {
    esconder(el['splash']);
    esconder(el['app']);
    esconder(el['tela-login']);
    esconder(el['tela-redefinir']);
    esconder(el['tela-negado']);

    mostrar(el['tela-bloqueio']);
  }

  function carregarDados() {
    if (estado.carregandoDados) {
      return Promise.resolve();
    }

    estado.carregandoDados = true;

    return Dados.carregar()
      .then(function (resultado) {

        estado.carregandoDados = false;

        if (!resultado || !resultado.ok) {
          estado.erroDados =
            resultado && resultado.erro
              ? resultado.erro
              : 'erro';

          console.error(
            '[Dados] não foi possível carregar:',
            estado.erroDados
          );

          return false;
        }

        estado.erroDados = null;

        return true;
      })
      .catch(function (erro) {

        estado.carregandoDados = false;
        estado.erroDados = 'erro';

        console.error(
          '[Dados] falha:',
          erro
        );

        return false;
      });
  }

  function entrarComSessao(email) {
    estado.email = email || null;

    return Dados.verificarAcesso()
      .then(function (acesso) {

        if (!acesso) {
          abrirNegado(email);
          return;
        }

        if (acesso.estado === 'ok') {
          estado.autorizado = true;

          return carregarDados()
            .then(function () {

              mostrarApp();

              talvezBoasVindas();

            });

        }

        if (acesso.estado === 'demo') {
          estado.autorizado = true;

          return carregarDados()
            .then(function () {
              mostrarApp();
              talvezBoasVindas();
            });
        }

        if (
          acesso.estado === 'sem-acesso' ||
          acesso.estado === 'sem-sessao'
        ) {
          estado.autorizado = false;
          abrirNegado(email);
          return;
        }

        abrirBloqueio();
      })
      .catch(function (erro) {

        console.error(
          '[Auth] falha ao verificar acesso:',
          erro
        );

        abrirBloqueio();
      });
  }

  function talvezBoasVindas() {
    var chave = 'stickerpro_boasvindas_v1';

    if (memoria(chave)) {
      return;
    }

    memoria(chave, '1');

    var modal = document.getElementById('modal-boas-vindas');

    if (!modal) {
      return;
    }

    modal.style.display = '';

    var fechar = modal.querySelector(
      '[data-fechar-boas-vindas]'
    );

    if (fechar) {
      fechar.addEventListener('click', function () {
        modal.style.display = 'none';
      });
    }
  }

  function sairDaConta() {
    Promise.resolve(
      Auth.sair ? Auth.sair() : null
    )
    .catch(function (erro) {
      console.error(
        '[Auth] erro ao sair:',
        erro
      );
    })
    .then(function () {

      estado.email = null;
      estado.autorizado = false;
      estado.busca = '';

      if (Dados.limpar) {
        Dados.limpar();
      }

      abrirLogin();
    });
  }

  function iniciarLogin() {
    if (!el['form-login']) {
      return;
    }

    el['form-login'].addEventListener(
      'submit',
      function (evento) {

        evento.preventDefault();

        var email =
          el['email']
            ? el['email'].value.trim()
            : '';

        var senha =
          el['senha']
            ? el['senha'].value
            : '';

        if (!email || !senha) {
          if (el['retorno-login']) {
            el['retorno-login'].textContent =
              'Preencha e-mail e senha.';
          }

          return;
        }

        if (el['btn-entrar']) {
          el['btn-entrar'].disabled = true;
        }

        if (el['retorno-login']) {
          el['retorno-login'].textContent =
            'Entrando...';
        }

        Promise.resolve(
          Auth.entrar(email, senha)
        )
        .then(function (resultado) {

          if (
            !resultado ||
            resultado.ok === false
          ) {

            throw new Error(
              resultado &&
              resultado.erro
                ? resultado.erro
                : 'Não foi possível entrar.'
            );
          }

          return Auth.sessao();
        })
        .then(function (usuario) {

          var emailUsuario =
            usuario &&
            usuario.email
              ? usuario.email
              : email;

          return entrarComSessao(
            emailUsuario
          );

        })
        .catch(function (erro) {

          console.error(
            '[Login] erro:',
            erro
          );

          if (el['retorno-login']) {
            el['retorno-login'].textContent =
              erro.message ||
              'E-mail ou senha incorretos.';
          }

        })
        .finally(function () {

          if (el['btn-entrar']) {
            el['btn-entrar'].disabled = false;
          }

        });
      }
    );
  }

  function iniciarRecuperacao() {
    if (!el['link-recuperar']) {
      return;
    }

    el['link-recuperar'].addEventListener(
      'click',
      function (evento) {

        evento.preventDefault();

        esconder(el['tela-login']);
        mostrar(el['tela-redefinir']);

        if (el['retorno-redefinir']) {
          el['retorno-redefinir'].textContent = '';
        }

        if (el['nova-senha']) {
          el['nova-senha'].value = '';
        }

      }
    );
  }

  function iniciarRedefinicao() {
    if (!el['form-redefinir']) {
      return;
    }

    el['form-redefinir'].addEventListener(
      'submit',
      function (evento) {

        evento.preventDefault();

        var novaSenha =
          el['nova-senha']
            ? el['nova-senha'].value
            : '';

        if (!novaSenha || novaSenha.length < 6) {

          if (el['retorno-redefinir']) {
            el['retorno-redefinir'].textContent =
              'A senha precisa ter pelo menos 6 caracteres.';
          }

          return;
        }

        if (el['btn-redefinir']) {
          el['btn-redefinir'].disabled = true;
        }

        if (el['retorno-redefinir']) {
          el['retorno-redefinir'].textContent =
            'Salvando nova senha...';
        }

        Promise.resolve(
          Auth.definirSenha(novaSenha)
        )
        .then(function () {

          if (el['retorno-redefinir']) {
            el['retorno-redefinir'].textContent =
              'Senha alterada com sucesso. Entrando...';
          }

          return Auth.sessao();

        })
        .then(function (usuario) {

          var email =
            usuario &&
            usuario.email
              ? usuario.email
              : '';

          return entrarComSessao(email);

        })
        .catch(function (erro) {

          console.error(
            '[Redefinição] erro:',
            erro
          );

          if (el['retorno-redefinir']) {
            el['retorno-redefinir'].textContent =
              erro.message ||
              'Não foi possível alterar a senha.';
          }

        })
        .finally(function () {

          if (el['btn-redefinir']) {
            el['btn-redefinir'].disabled = false;
          }

        });
      }
    );
  }

  function iniciarBotoesNegado() {

    if (el['btn-negado-sair']) {
      el['btn-negado-sair'].addEventListener(
        'click',
        sairDaConta
      );
    }

    if (el['btn-negado-tentar']) {
      el['btn-negado-tentar'].addEventListener(
        'click',
        function () {

          esconder(el['tela-negado']);
          abrirLogin();

        }
      );
    }

  }

  function iniciarRotas() {

    window.addEventListener(
      'hashchange',
      function () {

        if (!estado.autorizado) {
          return;
        }

        var h =
          window.location.hash;

        if (
          ROTAS_ANTIGAS.indexOf(h) > -1
        ) {

          window.location.hash =
            '#/inicio';

          return;
        }

        render();

      }
    );

  }

  function iniciarSairSidebar() {

    if (!el['btn-sair-sidebar']) {
      return;
    }

    el['btn-sair-sidebar']
      .addEventListener(
        'click',
        sairDaConta
      );

  }

  function iniciarSessao() {

    return Promise.resolve(
      Auth.sessao()
    )
    .then(function (usuario) {

      if (!usuario) {
        abrirLogin();
        return;
      }

      estado.email =
        usuario.email || null;

      return entrarComSessao(
        estado.email
      );

    })
    .catch(function (erro) {

      console.error(
        '[Auth] erro ao recuperar sessão:',
        erro
      );

      abrirLogin();

    });

  }

  function iniciar() {

    iniciarLogin();
    iniciarRecuperacao();
    iniciarRedefinicao();
    iniciarBotoesNegado();
    iniciarRotas();
    iniciarSairSidebar();

    Promise.resolve(
      carregarDados()
    )
    .then(function () {
      return iniciarSessao();
    })
    .catch(function (erro) {

      console.error(
        '[Sticker Pro] erro ao iniciar:',
        erro
      );

      abrirLogin();

    });

  }

  document.addEventListener(
    'DOMContentLoaded',
    iniciar
  );

})();
