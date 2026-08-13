/* ============================================================
   STICKER PRO — AUTORIZAÇÃO E LINKS DAS PASTAS
   ------------------------------------------------------------
   Quem decide se alguém é Premium é o SUPABASE, via RLS.
   Este arquivo apenas pergunta e traduz a resposta.

   Se alguém alterar este JavaScript no próprio navegador,
   não ganha nada: o banco continua recusando a consulta.

   Interface (mantida para não quebrar o app.js):
     Dados.carregar()            -> Promise<{ok, mapa, erro?}>
     Dados.link(chave)
     Dados.linkDe(idCategoria, chavePasta)
     Dados.capa(id)
     Dados.limpar()
   Acréscimos:
     Dados.verificarAcesso()     -> Promise<{estado, acesso?}>
     Dados.modo()
   ============================================================ */

(function () {
  'use strict';

  var CFG = window.STICKER_CONFIG || {};
  var mapa = {};
  var carregado = false;

  function usandoServidor() {
    return !!(CFG.modoSeguro && CFG.supabaseUrl && CFG.supabaseAnonKey);
  }

  function base() {
    return CFG.supabaseUrl.replace(/\/+$/, '');
  }

  /* Consulta REST autenticada. A RLS do banco é quem filtra. */
  function consultar(caminho) {
    return Promise.resolve(window.Auth.token()).then(function (token) {
      if (!token) return { estado: 'sem-sessao' };

      return fetch(base() + '/rest/v1/' + caminho, {
        headers: {
          apikey: CFG.supabaseAnonKey,
          Authorization: 'Bearer ' + token,
          Accept: 'application/json'
        }
      }).then(function (resp) {
        if (resp.status === 401) return { estado: 'sem-sessao' };
        if (resp.status === 403) return { estado: 'sem-acesso' };
        if (!resp.ok) {
          console.error('[Dados] servidor respondeu', resp.status);
          return { estado: 'erro' };
        }
        return resp.json().then(function (linhas) {
          return { estado: 'ok', linhas: linhas || [] };
        });
      });
    }).catch(function (e) {
      console.error('[Dados] falha de rede:', e);
      return { estado: 'erro' };
    });
  }

  /* ---------------------------------------------------------
     VERIFICAR ACESSO PREMIUM
     Pergunta ao banco se existe acesso premium ativo para a
     sessão atual. A RLS de public.acessos só devolve a linha
     do próprio usuário — ninguém consegue ler a de outra pessoa.

     estados: 'ok' | 'sem-sessao' | 'sem-acesso' | 'erro' | 'demo'
     --------------------------------------------------------- */
  function verificarAcesso() {
    if (!usandoServidor()) {
      // Sem backend configurado não existe autorização real.
      return Promise.resolve({ estado: 'demo' });
    }

    return consultar('acessos?select=produto,status,criado_em&produto=eq.premium&status=eq.ativo&limit=1')
      .then(function (r) {
        if (r.estado !== 'ok') return r;
        if (!r.linhas.length) return { estado: 'sem-acesso' };
        return { estado: 'ok', acesso: r.linhas[0] };
      });
  }

  /* ---------------------------------------------------------
     CARREGAR LINKS
     --------------------------------------------------------- */
  function carregarLocal() {
    mapa = {};
    var p = CFG.pastas || {};
    Object.keys(p).forEach(function (k) { if (p[k]) mapa[k] = p[k]; });
    var s = CFG.subpastas || {};
    Object.keys(s).forEach(function (k) { if (s[k]) mapa[k] = s[k]; });
    carregado = true;
    return Promise.resolve({ ok: true, mapa: mapa });
  }

  function carregarServidor() {
    return consultar('colecoes?select=chave,link').then(function (r) {
      if (r.estado !== 'ok') return { ok: false, erro: r.estado };
      mapa = {};
      r.linhas.forEach(function (l) { if (l.chave && l.link) mapa[l.chave] = l.link; });
      carregado = true;
      // Consulta autorizada, mas ninguém cadastrou os links ainda.
      if (!r.linhas.length) return { ok: true, mapa: mapa, vazio: true };
      return { ok: true, mapa: mapa };
    });
  }

  window.Dados = {
    modo: function () { return usandoServidor() ? 'servidor' : 'local'; },
    carregado: function () { return carregado; },
    verificarAcesso: verificarAcesso,
    carregar: function () { return usandoServidor() ? carregarServidor() : carregarLocal(); },
    link: function (chave) { return mapa[chave] || ''; },
    linkDe: function (idCategoria, chavePasta) {
      return mapa[idCategoria] || mapa[chavePasta] || '';
    },
    capa: function (id) { return (CFG.capas || {})[id] || ''; },
    limpar: function () { mapa = {}; carregado = false; }
  };
})();
