# Configurar o Supabase — passo a passo

Objetivo desta etapa: provar que **Supabase Auth + banco + RLS + acesso Premium +
área de membros** funcionam de ponta a ponta, com usuários criados à mão, **antes**
de existir qualquer integração com a Cakto.

Ao final você terá dois usuários de teste e a certeza de que quem não comprou não
recebe os links.

---

## Parte 1 — Criar o projeto

1. Entre em supabase.com e crie um projeto (plano gratuito serve).
2. Guarde a senha do banco que ele pedir — ela **não** vai para o código.
3. Espere o projeto terminar de provisionar (~2 min).

---

## Parte 2 — SQL

Cole tudo abaixo no **SQL Editor** e execute de uma vez. É idempotente: pode rodar
de novo sem quebrar nada.

```sql
-- ============================================================
-- 1. TABELA DE ACESSOS
-- ============================================================
create table if not exists public.acessos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  email         text not null,
  produto       text not null default 'premium',
  status        text not null default 'ativo',
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint acessos_produto_valido check (produto in ('premium')),
  constraint acessos_status_valido  check (status in ('ativo','inativo','reembolsado')),
  -- impede dois acessos do mesmo produto para a mesma pessoa
  constraint acessos_user_produto_unico unique (user_id, produto)
);

create index if not exists acessos_user_id_idx on public.acessos (user_id);
create index if not exists acessos_email_idx   on public.acessos (lower(email));

-- ============================================================
-- 2. TABELA DE COLEÇÕES (links do Drive)
-- ============================================================
create table if not exists public.colecoes (
  chave         text primary key,
  link          text not null,
  produto       text not null default 'premium',
  atualizado_em timestamptz not null default now()
);

-- ============================================================
-- 3. TRIGGER DE atualizado_em
-- ============================================================
create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists acessos_atualizado_em on public.acessos;
create trigger acessos_atualizado_em
  before update on public.acessos
  for each row execute function public.tocar_atualizado_em();

drop trigger if exists colecoes_atualizado_em on public.colecoes;
create trigger colecoes_atualizado_em
  before update on public.colecoes
  for each row execute function public.tocar_atualizado_em();

-- ============================================================
-- 4. FUNÇÃO DE VERIFICAÇÃO
-- ============================================================
create or replace function public.tem_premium_ativo()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.acessos
    where user_id = auth.uid()
      and produto = 'premium'
      and status  = 'ativo'
  );
$$;

revoke execute on function public.tem_premium_ativo() from public;
revoke execute on function public.tem_premium_ativo() from anon;
grant  execute on function public.tem_premium_ativo() to authenticated;

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================
alter table public.acessos  enable row level security;
alter table public.colecoes enable row level security;

-- Cada pessoa enxerga apenas a própria linha de acesso
drop policy if exists "cada um le apenas o proprio acesso" on public.acessos;
create policy "cada um le apenas o proprio acesso"
  on public.acessos for select
  to authenticated
  using (auth.uid() = user_id);

-- Só quem tem Premium ATIVO recebe os links
drop policy if exists "apenas premium ativo le colecoes" on public.colecoes;
create policy "apenas premium ativo le colecoes"
  on public.colecoes for select
  to authenticated
  using (produto = 'premium' and public.tem_premium_ativo());
```

**Repare no que não existe:** nenhuma policy de `insert`, `update` ou `delete` em
`acessos`. Isso é proposital. Só a `service_role` — que ignora RLS e vive apenas no
servidor — concede acesso. Uma cliente não vira Premium editando JavaScript.

E nenhuma policy usa `using (true)` para conteúdo Premium.

---

## Parte 3 — Cadastrar os links do Drive

```sql
insert into public.colecoes (chave, link) values
  ('premium',      'https://drive.google.com/drive/folders/COLE_AQUI'),
  ('figurinhas',   'https://drive.google.com/drive/folders/COLE_AQUI'),
  ('minimalistas', 'https://drive.google.com/drive/folders/COLE_AQUI'),
  ('icones',       'https://drive.google.com/drive/folders/COLE_AQUI')
on conflict (chave) do update set link = excluded.link, atualizado_em = now();
```

As chaves precisam ser exatamente essas quatro — são as que o `content.js` usa.

Depois disso, **apague os links do `config.js`** e deixe `modoSeguro: true`.

---

## Parte 4 — Criar os usuários de teste

### Usuária A — com Premium

1. **Authentication → Users → Add user → Create new user**
2. E-mail: `premium@teste.com` · Senha: escolha uma (mínimo 6 caracteres)
3. **Marque "Auto Confirm User"** — sem isso o login falha com "e-mail não confirmado"
4. Copie o **UID** que aparece na lista

Agora conceda o acesso. Você pode usar o e-mail, sem precisar copiar o UID:

```sql
insert into public.acessos (user_id, email, produto, status)
select id, email, 'premium', 'ativo'
from auth.users
where email = 'premium@teste.com'
on conflict (user_id, produto) do update
  set status = 'ativo', atualizado_em = now();
```

Confirme:

```sql
select a.email, a.produto, a.status, a.criado_em
from public.acessos a
where a.email = 'premium@teste.com';
```

### Usuária B — sem Premium

1. **Add user** com `semacesso@teste.com`, senha à sua escolha, **Auto Confirm** marcado
2. **Não rode nenhum insert para ela.** É esse o teste.

---

## Parte 5 — Configurar o Auth no painel

**Authentication → URL Configuration**

| Campo | Valor |
|---|---|
| Site URL | `https://sticker-pro.vercel.app/membros/` |
| Redirect URLs | `https://sticker-pro.vercel.app/membros/` |

Se for testar em máquina local, acrescente também `http://localhost:3000/membros/`
(ou a porta que você usar) na lista de Redirect URLs.

**Authentication → Providers → Email:** deixe *Email* habilitado e *Confirm email*
ligado. Para as contas criadas à mão, o "Auto Confirm User" já resolve.

**Sobre o link de redefinir senha:** corrigi o código nesta etapa. Antes o
`redirectTo` terminava em `#/redefinir`, e o Supabase também devolve dados no
fragmento — os dois disputavam o mesmo `#`. Agora o cliente usa **PKCE**, que
devolve `?code=...` na query, e a área detecta isso e abre a tela de nova senha
sozinha. Por isso a Redirect URL é a raiz de `/membros/`, sem fragmento.

---

## Parte 6 — Preencher o config.js

Em **Project Settings → API**, copie os dois valores:

```js
supabaseUrl:     'https://xxxxxxxxxxxx.supabase.co',
supabaseAnonKey: 'eyJhbGci...',   // "anon public" (ou "publishable")
modoSeguro:      true,
pastas: { premium: '', figurinhas: '', minimalistas: '', icones: '' },  // vazio!
```

E descomente o SDK no `membros/index.html`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

> Projetos mais novos do Supabase mostram "publishable key" em vez de "anon". As duas
> funcionam com o SDK v2 — use a que aparecer no painel.

**A `service_role` key NUNCA vai para o frontend.** Ela ignora toda a RLS: quem a
tiver lê e escreve tudo. Ela só vai aparecer na próxima etapa, dentro da Edge
Function da Cakto, via variável de ambiente.

---

## Parte 7 — Testar a RLS direto no banco

Não acredite na configuração: teste. No SQL Editor, troque os UUIDs pelos reais
(`select id, email from auth.users;`).

### Teste 1 — Premium consulta coleções → permitido

```sql
begin;
  select set_config('request.jwt.claims',
    json_build_object('sub','UUID-DA-USUARIA-A','role','authenticated')::text, true);
  set local role authenticated;

  select count(*) as colecoes_visiveis from public.colecoes;   -- esperado: 4
  select count(*) as acessos_visiveis  from public.acessos;    -- esperado: 1
rollback;
```

### Teste 2 — Autenticada sem Premium → negado

```sql
begin;
  select set_config('request.jwt.claims',
    json_build_object('sub','UUID-DA-USUARIA-B','role','authenticated')::text, true);
  set local role authenticated;

  select count(*) as colecoes_visiveis from public.colecoes;   -- esperado: 0
  select count(*) as acessos_visiveis  from public.acessos;    -- esperado: 0
rollback;
```

### Teste 3 — A tenta ver o acesso de B → negado

```sql
begin;
  select set_config('request.jwt.claims',
    json_build_object('sub','UUID-DA-USUARIA-A','role','authenticated')::text, true);
  set local role authenticated;

  -- Mesmo pedindo o e-mail da outra pessoa explicitamente:
  select count(*) from public.acessos where email = 'semacesso@teste.com';  -- esperado: 0
rollback;
```

### Teste 4 — Sem sessão → negado

```sql
begin;
  set local role anon;
  select count(*) as colecoes_visiveis from public.colecoes;   -- esperado: 0
rollback;
```

Se algum resultado divergir, **pare**: a RLS não está protegendo e não vale colocar
cliente real. Me avise o número do teste que falhou.

---

## Parte 8 — Testar no site

### Cenário A — Premium

1. Abra `https://sticker-pro.vercel.app/membros/`
2. Entre com `premium@teste.com`
3. A home deve carregar com o destaque e as 11 categorias
4. Busque `treino` → deve sobrar Rotina
5. Toque em Lifestyle → o Drive abre em nova aba
6. Em **Meu acesso**, o e-mail mostrado deve ser o dela

### Cenário B — sem Premium

1. Saia da conta
2. Entre com `semacesso@teste.com`
3. Deve aparecer **"Seu acesso ainda não está liberado."**
4. Abra o DevTools → aba **Network** → confirme que a requisição de `colecoes`
   **não aconteceu** (a área nem chega a pedir os links)
5. Na aba **Console**, rode `window.Dados.link('premium')` → deve devolver string vazia

### Cenário C — revogação

Com a usuária A logada, rode:

```sql
update public.acessos set status = 'reembolsado'
where email = 'premium@teste.com' and produto = 'premium';
```

Recarregue a página: ela deve cair na tela de acesso não liberado. Depois devolva o
acesso trocando para `'ativo'`.

---

## Detalhe técnico honesto

Quando a RLS bloqueia um `select`, o PostgREST responde **200 com lista vazia**, não
403. Por isso a autorização de verdade acontece na consulta a `acessos`: lista vazia
= sem Premium = tela de acesso negado, e a consulta a `colecoes` nem chega a ser
feita. O tratamento de 403 no `dados.js` é uma rede de segurança para o caso de a
permissão de tabela ser revogada por completo.

O efeito prático é o mesmo — sem Premium, nenhum link chega ao navegador —, mas vale
você saber disso ao olhar a aba Network.
