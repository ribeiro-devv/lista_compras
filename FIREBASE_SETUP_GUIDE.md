# 🔥 Guia de Configuração do Firebase Authentication

## ⚠️ Erro 400 (Bad Request) - Solução

Se você está recebendo erro **400 (Bad Request)** ao tentar cadastrar ou fazer login, é porque os métodos de autenticação **não estão habilitados** no Firebase Console.

## 📋 Passo a Passo - Configurar Firebase Authentication

### 1️⃣ Acessar o Firebase Console

1. Acesse: https://console.firebase.google.com/
2. Faça login com sua conta Google
3. Selecione seu projeto: **`lista-de-compras-3047d`**

### 2️⃣ Habilitar Authentication

1. No menu lateral esquerdo, clique em **"Authentication"** (ou "Autenticação")
2. Se for a primeira vez, clique em **"Get started"** (ou "Começar")
3. Você será redirecionado para a página de configuração

### 3️⃣ Habilitar Email/Password

1. Na aba **"Sign-in method"** (Métodos de login), você verá uma lista de provedores
2. Clique em **"Email/Password"**
3. Na tela que abrir:
   - ✅ Ative o switch **"Enable"** (Habilitar)
   - ✅ **OPCIONAL**: Ative também **"Email link (passwordless sign-in)"** se quiser (não necessário)
4. Clique em **"Save"** (Salvar)

### 4️⃣ Habilitar Google Sign-In (Opcional mas Recomendado)

1. Na mesma lista de provedores, clique em **"Google"**
2. Na tela que abrir:
   - ✅ Ative o switch **"Enable"** (Habilitar)
   - Selecione um **"Project support email"** (use seu email)
   - Clique em **"Save"** (Salvar)

**Nota:** Para Google, o Firebase pode pedir para configurar a tela de consentimento OAuth no Google Cloud Console. Se aparecer, siga as instruções ou use o email padrão.

### 5️⃣ Configurar Domínios Autorizados

1. Ainda na página de Authentication, clique na aba **"Settings"** (Configurações)
2. Role até **"Authorized domains"** (Domínios autorizados)
3. Certifique-se de que os seguintes domínios estão listados:
   - ✅ `localhost` (para desenvolvimento)
   - ✅ `lista-de-compras-3047d.firebaseapp.com`
   - ✅ Seu domínio de produção (se tiver)

### 6️⃣ Verificar Status

Após habilitar, você deve ver:

```
✅ Email/Password - Enabled
✅ Google - Enabled (se habilitou)
```

## 🎯 Verificação Rápida

Após configurar, teste novamente:

1. **Teste de Cadastro:**
   - Acesse `/register` no app
   - Preencha nome, email e senha
   - Clique em "Criar Conta"
   - ✅ Deve funcionar sem erro 400

2. **Teste de Login:**
   - Acesse `/login` no app
   - Faça login com o email/senha criado
   - ✅ Deve fazer login com sucesso

3. **Teste Google (se habilitou):**
   - Clique em "Entrar com Google"
   - ✅ Deve abrir popup do Google e funcionar

## 🐛 Solução de Problemas

### Erro 400 continua aparecendo?

1. **Verifique se salvou as configurações:**
   - Certifique-se de ter clicado em **"Save"** em cada método

2. **Limpe o cache do navegador:**
   - Ctrl + Shift + Delete (Windows/Linux)
   - Cmd + Shift + Delete (Mac)
   - Limpe cache e cookies

3. **Verifique a configuração do Firebase:**
   - Abra `src/environments/environment.ts`
   - Verifique se os dados estão corretos:
   ```typescript
   firebaseConfig: {
     apiKey: "AIzaSyCV4j19iZIez1bL9jpwbIBjGT7rt-l2hPQ",
     authDomain: "lista-de-compras-3047d.firebaseapp.com",
     projectId: "lista-de-compras-3047d",
     // ...
   }
   ```

4. **Reinicie o servidor de desenvolvimento:**
   ```bash
   # Pare o servidor (Ctrl+C)
   # Inicie novamente
   npm start
   # ou
   ionic serve
   ```

### Google Sign-In não funciona?

1. Verifique se habilitou o Google no Firebase Console
2. Verifique se configurou o email de suporte
3. Para desenvolvimento local, pode ser necessário configurar OAuth consent screen no Google Cloud Console

### Email já está em uso?

Isso é normal! Significa que:
- ✅ A autenticação está funcionando
- ❌ O email já foi cadastrado anteriormente
- 💡 Use outro email ou faça login com o email existente

## 📸 Imagens de Referência

### Tela de Sign-in Methods:
```
Authentication > Sign-in method

Email/Password       [Enabled]  [Edit]
Google               [Enabled]  [Edit]
Facebook             [Disabled] [Edit]
...
```

### Tela de configuração do Email/Password:
```
Email/Password
┌─────────────────────────────────────┐
│ Enable                              │
│ ──────────────●                     │
│                                      │
│ Email link (passwordless sign-in)   │
│ ────────────○                       │
│                                      │
│ [Save]  [Cancel]                    │
└─────────────────────────────────────┘
```

## ✅ Checklist de Configuração

- [ ] Acessei o Firebase Console
- [ ] Cliquei em "Authentication"
- [ ] Habilitei "Email/Password"
- [ ] Habilitei "Google" (opcional)
- [ ] Verifiquei domínios autorizados
- [ ] Salvei todas as alterações
- [ ] Testei cadastro no app
- [ ] Testei login no app

## 🆘 Ainda com Problemas?

Se após seguir todos os passos ainda houver erro:

1. **Verifique os logs do console do navegador:**
   - F12 > Console
   - Veja a mensagem de erro completa

2. **Verifique o Network tab:**
   - F12 > Network
   - Procure pela requisição que falhou
   - Veja a resposta completa

3. **Teste diretamente no Firebase Console:**
   - Authentication > Users
   - Tente adicionar um usuário manualmente
   - Se funcionar, o problema pode estar no código

## 📚 Recursos Adicionais

- [Firebase Auth Docs](https://firebase.google.com/docs/auth)
- [Firebase Console](https://console.firebase.google.com/)
- [Troubleshooting Firebase Auth](https://firebase.google.com/docs/auth/web/troubleshooting)

---

**Última atualização:** Agora mesmo!
**Status:** ✅ Funcional após configuração

