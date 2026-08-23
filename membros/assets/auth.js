/* ============================================================
   STICKER PRO — AUTENTICAÇÃO
   ------------------------------------------------------------
   O app nunca fala com um serviço de login diretamente.
   Fala com este adaptador, que expõe sempre a mesma interface:

     Auth.modo()                  -> 'demo' | 'supabase'
     Auth.entrar(email, senha)    -> Promise<{ok, erro?}>
     Auth.recuperarSenha(email)   -> Promise<{ok, erro?, aviso?}>
     Auth.definirSenha(nova)      -> Promise<{ok, erro?}>
     Auth.sair()                  -> Promise
     Auth.sessao()                -> Promise<{email} | null>
     Auth.token()                 -> Promise<string | null>
     Auth.aoMudar(callback)       -> avisa login/logout em outra aba

   Trocar de serviço = trocar só este arquivo.
   Nenhum segredo aqui: só a chave "anon", que é pública por design.
   ============================================================ */

(function () {
  'use strict';

  var CFG = window.STICKER_CONFIG || {};
  var USANDO_SUPABASE = !!(CFG.supabaseUrl && CFG.supabaseAnonKey);

  /* ---------- armazenamento tolerante a falhas ---------- */
  var CHAVE = 'stickerpro:sessao';

  function guardar(v) { try { localStorage.setItem(CHAVE, JSON.stringify(v)); } catch (e) {} }
  function ler()      { try { var b = localStorage.getItem(CHAVE); return b ? JSON.parse(b) : null; } catch (e) { return null; } }
  function limpar()   { try { localStorage.removeItem(CHAVE); } catch (e) {} }

  /* =========================================================
     MODO DEMONSTRAÇÃO
     Valida apenas o formato dos campos e libera a entrada.
     NÃO PROTEGE NADA: a checagem roda no navegador da própria
     pessoa. Existe para você aprovar o layout antes de ligar
     o Supabase. A área não deve ser divulgada neste modo.
     ========================================================= */
  var Demo = {
    modo: function () { return 'demo'; },

    entrar: function (email, senha) {
      return new Promise(function (resolve) {
        setTimeout(function () {
          if (!email || email.indexOf('@') < 0 || email.indexOf('.') < 0) {
            return resolve({ ok: false, erro: 'Digite um e-mail válido.' });
          }
          if (!senha || senha.length < 6) {
            return resolve({ ok: false, erro: 'A senha precisa ter pelo menos 6 caracteres.' });
          }
          guardar({ email: email, criadaEm: Date.now() });
          resolve({ ok: true });
        }, 500);
      });
    },

    recuperarSenha: function (email) {
      return new Promise(function (resolve) {
        setTimeout(function () {
          if (!email || email.indexOf('@') < 0) {
            return resolve({ ok: false, erro: 'Digite o e-mail da sua compra.' });
          }
          resolve({ ok: true, aviso: 'Modo demonstração: nenhum e-mail é enviado de verdade.' });
        }, 500);
      });
    },

    definirSenha: function () {
      return Promise.resolve({ ok: false, erro: 'Disponível apenas com o login real ativado.' });
    },

    sair:   function () { limpar(); return Promise.resolve(); },
    sessao: function () { return Promise.resolve(ler()); },
    token:  function () { return Promise.resolve(null); },
    aoMudar: function () {}
  };

  /* =========================================================
     MODO SUPABASE (login real)
     Ativa sozinho quando config.js tiver url + anon key e o
     SDK estiver carregado no index.html.
     ========================================================= */
  var Supa = {
    _c: null,

    cliente: function () {
      if (!this._c) {
        if (!window.supabase || !window.supabase.createClient) {
          throw new Error('SDK do Supabase não foi carregado no index.html.');
        }
        this._c = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            /*
             * Este é um SPA/client-only. Para recuperação de senha, o link
             * pode ser aberto em outro navegador/dispositivo (ex.: o e-mail
             * abre no navegador do celular). PKCE exigiria o code_verifier
             * armazenado no navegador que iniciou o pedido.
             *
             * No implicit flow, o Supabase devolve a sessão no fragmento
             * (#access_token=...&type=recovery), que o cliente detecta e
             * grava automaticamente no localStorage.
             */
            flowType: 'implicit'
          }
        });
      }
      return this._c;
    },

    modo: function () { return 'supabase'; },

    entrar: function (email, senha) {
      return this.cliente().auth
        .signInWithPassword({ email: email, password: senha })
        .then(function (r) {
          if (!r.error) return { ok: true };
          var m = (r.error.message || '').toLowerCase();
          if (m.indexOf('email not confirmed') > -1) {
            return { ok: false, erro: 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.' };
          }
          if (m.indexOf('invalid') > -1) {
            return { ok: false, erro: 'E-mail ou senha incorretos.' };
          }
          if (m.indexOf('rate') > -1 || m.indexOf('many') > -1) {
            return { ok: false, erro: 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.' };
          }
          console.error('[Auth] erro no login:', r.error);
          return { ok: false, erro: 'Não foi possível entrar agora. Tente novamente.' };
        });
    },

    recuperarSenha: function (email) {
      // Sem fragmento: o Supabase acrescenta os próprios parâmetros na URL.
      // Quem leva a cliente até a tela certa é o evento PASSWORD_RECOVERY
      // (ou a detecção de ?code= na inicialização do app).
      var destino = window.location.origin + window.location.pathname;
      return this.cliente().auth
        .resetPasswordForEmail(email, { redirectTo: destino })
        .then(function (r) {
          if (r.error) {
            console.error('[Auth] erro ao recuperar senha:', r.error);
            return { ok: false, erro: 'Não foi possível enviar o e-mail agora. Tente novamente.' };
          }
          return { ok: true };
        });
    },

    definirSenha: function (nova) {
      return this.cliente().auth.updateUser({ password: nova }).then(function (r) {
        if (r.error) {
          console.error('[Auth] erro ao definir senha:', r.error);
          return { ok: false, erro: 'Não foi possível salvar a nova senha. Peça um novo link.' };
        }
        return { ok: true };
      });
    },

    sair: function () { return this.cliente().auth.signOut(); },

    sessao: function () {
      return this.cliente().auth.getSession().then(function (r) {
        var s = r && r.data && r.data.session;
        return s ? { email: s.user.email, id: s.user.id } : null;
      });
    },

    token: function () {
      return this.cliente().auth.getSession().then(function (r) {
        var s = r && r.data && r.data.session;
        return s ? s.access_token : null;
      });
    },

    aoMudar: function (cb) {
      this.cliente().auth.onAuthStateChange(function (evento, sessao) {
        cb(evento, sessao ? { email: sessao.user.email, id: sessao.user.id } : null);
      });
    }
  };

  window.Auth = USANDO_SUPABASE ? Supa : Demo;
})();
