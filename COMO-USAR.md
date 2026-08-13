# Sticker Pro — Área de membros

## Estrutura

```
/  (raiz do projeto)
├── index.html              ← landing (NÃO TOCADA)
└── membros/
    ├── index.html          telas de login, redefinir senha e app
    ├── COMO-USAR.md        este guia
    ├── WEBHOOK-CAKTO.md    análise do webhook + SQL de proteção
    └── assets/
        ├── config.js       ← ÚNICO arquivo que você edita
        ├── content.js      textos, categorias e etapas
        ├── auth.js         login (demo ou Supabase)
        ├── dados.js        resolve os links das pastas
        ├── app.js          roteador e telas
        └── styles.css      design
```

Publique a pasta `membros/` ao lado do `index.html`. A área fica em
`https://sticker-pro.vercel.app/membros/`. Nenhuma configuração do Vercel muda:
as rotas internas usam hash (`/membros/#/premium`), que funciona em hospedagem
estática sem `vercel.json`.

| Página | Endereço |
|---|---|
| Início | `/membros/#/inicio` |
| Comece Aqui | `/membros/#/comecar` |
| Figurinhas Premium | `/membros/#/premium` |
| Figurinhas | `/membros/#/figurinhas` |
| Minimalistas | `/membros/#/minimalistas` |
| Ícones | `/membros/#/icones` |
| Meu acesso | `/membros/#/acesso` |
| Redefinir senha | `/membros/#/redefinir` |

---

## 1. Colocar os links do Google Drive

Abra `assets/config.js` e preencha as 4 pastas:

```js
pastas: {
  premium:      'https://drive.google.com/drive/folders/...',  // Figurinhas PREMIUM
  figurinhas:   'https://drive.google.com/drive/folders/...',  // Figurinhas
  minimalistas: 'https://drive.google.com/drive/folders/...',  // Figurinha minimalista
  icones:       'https://drive.google.com/drive/folders/...'   // ICONES
},
```

No Drive: botão direito na pasta → **Compartilhar** → **Qualquer pessoa com o link**
→ **Leitor** → **Copiar link**. Sem isso a cliente vê tela de "pedir acesso".

Enquanto um link estiver vazio, os cards daquela seção aparecem esmaecidos com
**"Em breve"** e não abrem nada. Dá para publicar aos poucos.

### As 11 categorias do Premium

Todas apontam para a pasta `premium` por padrão. Se um dia você criar subpastas no
Drive (uma para Café, outra para Moda), cole os links em `subpastas`, usando o `id`
da categoria:

```js
subpastas: {
  cafe: 'https://drive.google.com/drive/folders/...',
  moda: 'https://drive.google.com/drive/folders/...'
}
```

O que estiver em `subpastas` tem prioridade. O que não estiver cai na pasta principal.

### Capas dos cards (opcional)

```js
capas: {
  cafe: 'https://drive.google.com/thumbnail?id=ID_DO_ARQUIVO&sz=w600'
}
```

Sem capa, o card mostra um fundo suave com um ícone.

### Renomear ou adicionar categorias

Em `assets/content.js`, na lista `categorias`. O `id` precisa ser único e sem espaços.
Os textos das 4 etapas de "Comece aqui" também ficam nesse arquivo, em `etapas`.

---

## 2. Ativar o login real (obrigatório antes de divulgar)

Sem isso a área roda em **modo demonstração**: ela valida o formato do e-mail e da
senha e libera a entrada. A checagem acontece no navegador da própria pessoa, então
**não protege nada**. Um selo escuro aparece na tela de login enquanto esse modo
estiver ativo, para você não publicar sem perceber.

**Passo a passo**

1. Crie conta em supabase.com e um projeto novo (plano gratuito serve).
2. **Project Settings → API**: copie **Project URL** e a chave **anon public**.
3. No `membros/index.html`, descomente a linha do SDK perto do fim do arquivo:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

4. No `assets/config.js`, preencha:

```js
supabaseUrl: 'https://xxxxx.supabase.co',
supabaseAnonKey: 'eyJhbGci...',
```

Pronto. O adaptador troca sozinho, o selo de demonstração some, "Esqueci minha senha"
passa a enviar e-mail de verdade e a tela de criar nova senha começa a funcionar.

A chave `anon` é pública por natureza e pode ficar no arquivo. **Nunca** coloque a
`service_role` key, o segredo do webhook ou qualquer senha aqui — tudo em `assets/`
é legível por qualquer pessoa.

5. Crie as contas em **Authentication → Users**, ou automatize com o webhook da
   Cakto (ver `WEBHOOK-CAKTO.md`).

---

## 3. Proteger os links do Drive

Por padrão (`modoSeguro: false`), os links ficam em `config.js` — arquivo público.
Qualquer pessoa que abrir `/membros/assets/config.js` lê os links **sem fazer login**.

Para fechar isso: rode o SQL do `WEBHOOK-CAKTO.md`, guarde os links na tabela
`colecoes` e ligue `modoSeguro: true`. A área passa a buscar os links no servidor,
que só entrega para quem tem sessão válida.

---

## 4. O que a área NÃO afirma

Não há menção a atualizações mensais, novos packs, comunidade, suporte incluso,
acesso vitalício, bônus, data de vencimento nem quantidade de figurinhas. Nenhum
número foi inventado. Quando alguma dessas coisas passar a existir de verdade, é só
me pedir para incluir.
