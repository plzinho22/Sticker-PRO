# Webhook da Cakto — **STATUS: PENDENTE**

> Nada aqui está implementado. O código do webhook **não foi escrito** porque
> depende da documentação da Cakto. As tabelas de suporte (`compras`, `acessos`)
> já existem no `SUPABASE-SQL.md` e estão prontas para receber essa integração.


Você pediu para eu analisar antes de codar. Analisei, e **não posso escrever o
webhook ainda**: faltam informações que só a documentação da Cakto tem, e eu não
vou inventar a estrutura dela.

Abaixo está o desenho completo, ponto a ponto, e no fim a lista exata do que
preciso de você.

---

## 1. Qual endpoint será utilizado

Uma **Supabase Edge Function**, no mesmo projeto do login:

```
POST https://SEU-PROJETO.supabase.co/functions/v1/cakto-webhook
```

Por que aqui e não em outro lugar:

- roda no servidor, então pode usar a `service_role` key com segurança;
- é o único lugar onde a criação de conta pode acontecer sem expor nada;
- fica separada da landing e do Vercel — nada do que já funciona é tocado.

A landing continua exatamente como está. O webhook não passa nem perto dela.

---

## 2. Quais dados a Cakto enviará

**Não sei, e não vou supor.** Preciso ver a documentação ou um exemplo real.

O que preciso descobrir:

- o formato do corpo (JSON, com quais campos);
- onde vem o e-mail da compradora;
- onde vem o identificador do produto/oferta;
- onde vem o status do pagamento e quais valores ele assume
  (`aprovado`? `paid`? `APPROVED`?);
- onde vem o identificador único da transação;
- se existem eventos separados para aprovação, reembolso e chargeback.

Escrever o webhook chutando esses nomes cria uma integração que falha em silêncio
na primeira venda real — que é o pior momento possível para descobrir.

---

## 3. Como o sistema identificará uma compra Premium

Pelo **identificador do produto ou da oferta** que a Cakto enviar, comparado com o
ID do seu checkout Premium (`gbokvhy_1030361`) guardado numa variável de ambiente.

Regra: só cria conta se **todas** forem verdadeiras:

1. a assinatura do webhook confere (ponto 6);
2. o status é o de pagamento aprovado;
3. o produto é o Premium.

Compra do Básico (`yjsbi6v_1030342`) não deve criar acesso Premium. Isso precisa
ser explícito, senão o primeiro comprador do Básico entra na área completa.

---

## 4. Como a conta será criada

Dentro da Edge Function, com a Admin API do Supabase:

1. `auth.admin.createUser({ email, email_confirm: true })`;
2. gerar um link de definição de senha (`generateLink` do tipo `recovery`);
3. enviar esse link para a cliente por e-mail.

Assim ela nunca recebe senha pronta por e-mail — ela mesma define a dela, e o link
tem validade.

**Falta decidir:** quem envia esse e-mail? O Supabase envia por padrão, mas com
limite baixo no plano gratuito e boa chance de cair em spam. Para venda de verdade
o certo é um serviço de e-mail (Resend, Brevo, SendGrid). Me diga qual você prefere.

---

## 5. Como impedir duplicação de contas

Duas camadas:

**Idempotência por transação.** Uma tabela `compras` com o ID da transação como
chave única. Antes de processar, a função tenta inserir; se já existir, ela devolve
`200 OK` e não faz mais nada. Isso resolve o caso comum de a Cakto reenviar o mesmo
webhook (todo gateway reenvia quando não recebe confirmação).

**E-mail já cadastrado.** Se a pessoa já tem conta (comprou antes, ou comprou o
Básico), `createUser` devolve erro de e-mail duplicado. Nesse caso a função não cria
nada: só marca o acesso Premium no perfil dela e envia o link de acesso.

Responder `200` para eventos repetidos é importante — se responder erro, a Cakto vai
continuar reenviando indefinidamente.

---

## 6. Como validar que o webhook veio mesmo da Cakto

Esta é a parte crítica, e é a que mais depende da documentação deles.

Sem validação, qualquer pessoa que descobrir a URL pode chamar o endpoint com o
próprio e-mail e ganhar acesso Premium de graça. O endereço de uma Edge Function é
fácil de descobrir.

O padrão do mercado é **HMAC-SHA256**: a Cakto assina o corpo da requisição com um
segredo compartilhado e manda a assinatura num cabeçalho. A função recalcula e
compara. Mas eu preciso saber:

- o nome do cabeçalho da assinatura;
- o algoritmo;
- exatamente o que é assinado (corpo cru? corpo + timestamp?);
- onde pegar o segredo no painel da Cakto.

Se a Cakto **não** oferecer assinatura, o plano B é um token secreto na própria URL
(`?token=...`) mais uma lista de IPs permitidos. É mais fraco, mas é melhor que
endpoint aberto. Só dá para decidir depois de ver a documentação.

A comparação da assinatura precisa ser feita em tempo constante, para não vazar
informação por diferença de tempo de resposta.

---

## 7. Como proteger o endpoint

- `service_role` key e segredo do webhook ficam em **variáveis de ambiente** da
  Edge Function (`supabase secrets set`), nunca no código e nunca no frontend;
- a função roda com `--no-verify-jwt`, porque a Cakto não manda JWT — por isso a
  assinatura do ponto 6 é a única defesa real;
- rejeitar tudo que não for `POST`;
- limitar o tamanho do corpo;
- registrar cada tentativa recusada, para você enxergar abuso;
- responder sempre rápido: validar, gravar, e devolver `200`. O envio de e-mail vai
  para segundo plano, senão um atraso do provedor de e-mail faz a Cakto achar que
  falhou e reenviar.

---

## O que eu preciso de você para escrever isso

| # | Informação | Onde encontrar |
|---|---|---|
| 1 | Documentação de webhooks da Cakto, ou um exemplo real do corpo enviado | Painel da Cakto → Webhooks/Integrações |
| 2 | A Cakto assina os webhooks? Se sim, como? | Mesma documentação |
| 3 | Nome exato dos eventos e do status de pagamento aprovado | Mesma documentação |
| 4 | ID do produto/oferta Premium como a Cakto o envia | Painel, na configuração do produto |
| 5 | Qual serviço de e-mail você quer usar | Sua escolha |

Se você conseguir fazer uma compra de teste e me mandar o JSON que a Cakto disparou,
isso sozinho resolve os itens 1, 3 e 4.

Uma verificação que vale a pena antes de tudo: **pergunte no suporte da Cakto se
eles já oferecem área de membros nativa**. Se oferecerem, todo este trabalho de
webhook deixa de ser necessário.

---

# SQL

Todo o SQL (tabelas `acessos`, `colecoes`, `compras`, RLS, função de verificação e
comandos para conceder/revogar acesso manualmente) está em **SUPABASE-SQL.md**.

A tabela `compras`, com `transacao_id` como chave primária, é a base da idempotência
descrita no item 5 acima: a Edge Function tenta inserir antes de processar e, se der
conflito, devolve `200 OK` sem criar nada.
