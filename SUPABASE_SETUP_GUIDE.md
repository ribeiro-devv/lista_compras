# Guia de configuração do Supabase

Este app usa o **Supabase** (Auth + Postgres + Realtime) como backend. Siga os
passos abaixo uma única vez para colocar tudo no ar.

---

## 1. Criar o projeto

1. Acesse https://supabase.com e faça login (pode usar conta Google/GitHub).
2. Clique em **New project**.
3. Dê um nome (ex.: `lista-de-compras`), defina uma senha para o banco e escolha
   a região mais próxima (ex.: *South America (São Paulo)*).
4. Aguarde ~1 minuto até o projeto ficar pronto.

## 2. Criar as tabelas (rodar o schema)

1. No menu lateral do projeto, abra **SQL Editor**.
2. Clique em **New query**.
3. Abra o arquivo [`supabase/schema.sql`](supabase/schema.sql) deste repositório,
   copie **todo** o conteúdo e cole no editor.
4. Clique em **Run** (canto inferior direito). Deve aparecer *Success*.

Isso cria as tabelas (`profiles`, `lists`, `list_members`, `list_items`,
`invitations`, `archived_lists`), as políticas de segurança (RLS), os gatilhos
que criam automaticamente o **perfil** e a **"Minha Lista"** quando alguém se
cadastra, e habilita o **realtime** dos itens.

## 3. Habilitar login por e-mail/senha

1. Vá em **Authentication → Providers**.
2. Confirme que **Email** está **habilitado**.
3. (Opcional, recomendado para testes) Em **Authentication → Providers → Email**,
   você pode **desligar** "Confirm email" para conseguir logar sem precisar
   confirmar o e-mail durante o desenvolvimento. Em produção, deixe ligado.

## 4. Copiar as chaves para o app

1. Vá em **Project Settings → API**.
2. Copie o **Project URL** e a chave **anon public**.
3. Cole em **`src/environments/environment.ts`**:

```ts
export const environment = {
  production: false,
  supabase: {
    url: 'https://xxxxxxxxxxxx.supabase.co',   // <- Project URL
    anonKey: 'eyJhbGciOiJI...'                  // <- anon public
  }
};
```

> A chave **anon public** pode ficar no front-end sem problema — a segurança é
> garantida pelas políticas RLS do banco. **Nunca** use a chave `service_role`
> no app.

Repita o mesmo em `src/environments/environment.prod.ts` para o build de produção.

## 5. Rodar o app

```bash
npm install
npm start
```

Abra `http://localhost:8100` (ou `4200`), crie uma conta e comece a usar.

---

## Como funciona (resumo)

- **Cadastro** → um gatilho cria o perfil e a lista pessoal "Minha Lista"
  automaticamente.
- **Listas compartilhadas** → o dono cria a lista e convida por e-mail; os itens
  sincronizam em tempo real entre os membros.
- **RLS** → cada usuário só enxerga listas das quais é dono ou membro.
- **Histórico** → listas arquivadas ficam na tabela `archived_lists`, por usuário.

## Solução de problemas

| Sintoma | Causa provável | Solução |
|---|---|---|
| App mostra "Supabase não configurado" | chaves não coladas | preencha `environment.ts` (passo 4) |
| "Invalid login credentials" | e-mail/senha errados ou e-mail não confirmado | verifique credenciais; desligue "Confirm email" em dev (passo 3) |
| Itens não sincronizam entre abas | realtime não habilitado | rode novamente o bloco *REALTIME* do `schema.sql` |
| "new row violates row-level security" | schema não aplicado por completo | rode o `schema.sql` inteiro de novo |
