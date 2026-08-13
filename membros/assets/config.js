/* ============================================================
   STICKER PRO — CONFIGURAÇÃO CENTRAL
   ------------------------------------------------------------
   Este é o único arquivo com valores que você edita.
   Nada de link ou chave deve ser escrito em outro lugar.

   ⚠️ NUNCA coloque aqui a service_role key do Supabase,
   o segredo do webhook da Cakto ou qualquer senha.
   Tudo neste arquivo é público — qualquer pessoa pode ler.
   ============================================================ */

window.STICKER_CONFIG = {

  /* ---------------------------------------------------------
     1. SUPABASE (login real)
     Project Settings → API
     A chave "anon public" é pública por design: pode ficar aqui.
     Enquanto estiver vazio, a área roda em MODO DEMONSTRAÇÃO
     e não protege nada.
     --------------------------------------------------------- */
  supabaseUrl: 'https://uwqfpdwlqviynxablxjd.supabase.co',
  supabaseAnonKey: 'sb_publishable_QcVSkUAiL-apKKAv4xEZTg_FslT_1Qi',

  /* ---------------------------------------------------------
     2. PASTAS DO GOOGLE DRIVE
     ---------------------------------------------------------
     Onde usar cada campo:

       modoSeguro = false  → os links abaixo são usados direto.
                             Ficam visíveis no navegador.
                             Serve para testar antes de subir tudo.

       modoSeguro = true   → os links abaixo são IGNORADOS.
                             A área busca os links no Supabase,
                             e só entrega para quem tem sessão.
                             (SQL da tabela no WEBHOOK-CAKTO.md)

     Cole aqui os links das suas 4 pastas:
       Figurinhas PREMIUM   → premium
       Figurinhas           → figurinhas
       Figurinha minimalista→ minimalistas
       ICONES               → icones

     No Drive: botão direito na pasta → Compartilhar →
     "Qualquer pessoa com o link" → Leitor → Copiar link.
     --------------------------------------------------------- */
  modoSeguro: true,

  pastas: {
    premium:      '',
    figurinhas:   '',
    minimalistas: '',
    icones:       ''
  },

  /* ---------------------------------------------------------
     3. SUBPASTAS (opcional)
     Se um dia você criar subpastas dentro de "Figurinhas PREMIUM"
     (uma para Café, outra para Moda...), cole os links aqui pelo
     id da categoria. O que não estiver aqui cai automaticamente
     na pasta principal do item 2.
     --------------------------------------------------------- */
  subpastas: {
    // cafe: 'https://drive.google.com/drive/folders/...',
    // moda: 'https://drive.google.com/drive/folders/...'
  },

  /* ---------------------------------------------------------
     4. CAPAS DOS CARDS (opcional)
     URL de imagem por id de categoria. Sem capa, o card mostra
     um fundo suave com um ícone.
     Dica para usar imagem do próprio Drive:
     https://drive.google.com/thumbnail?id=ID_DO_ARQUIVO&sz=w600
     --------------------------------------------------------- */
  capas: {
    // cafe: 'https://drive.google.com/thumbnail?id=...&sz=w600'
  },

  /* ---------------------------------------------------------
     5. TRAVA DE PUBLICAÇÃO
     ---------------------------------------------------------
     O modo demonstração NÃO É SEGURO: ele libera a entrada sem
     verificar nada de verdade. Serve só para desenvolvimento.

     Com esta trava ligada (padrão), a área se recusa a abrir em
     domínio publicado enquanto o Supabase não estiver configurado.
     Em localhost ela continua funcionando normalmente.

     Só desligue se souber exatamente o que está fazendo.
     --------------------------------------------------------- */
  travarDemoEmProducao: true,

  /* ---------------------------------------------------------
     6. SUPORTE
     Aparece na página "Meu acesso". Deixe vazio para ocultar.
     --------------------------------------------------------- */
  emailSuporte: ''
};
