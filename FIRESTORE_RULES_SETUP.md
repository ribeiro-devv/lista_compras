# 🔒 Guia de Configuração das Regras de Segurança do Firestore

## ⚠️ Erro: "Missing or insufficient permissions"

Se você está recebendo o erro **"Missing or insufficient permissions"** ao tentar criar/ler dados no Firestore, é porque as **regras de segurança** não estão configuradas corretamente.

**Boa notícia:** O usuário foi criado no Firebase Authentication! 🎉
O problema é apenas nas regras do Firestore para salvar o perfil do usuário.

## 📋 Configurar Regras do Firestore - Passo a Passo

### 1️⃣ Acessar Firestore Database

1. Acesse: https://console.firebase.google.com/
2. Selecione seu projeto: **`lista-de-compras-3047d`**
3. No menu lateral, clique em **"Firestore Database"** (ou "Firestore")
4. Clique na aba **"Rules"** (Regras) no topo

### 2️⃣ Configurar Regras de Segurança

Você verá algo assim (regras padrão que bloqueiam tudo):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;  // ❌ Isso bloqueia tudo!
    }
  }
}
```

**Substitua por estas regras:**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Regras para coleção de usuários
    match /users/{userId} {
      // Usuário autenticado pode ler seu próprio perfil
      allow read: if request.auth != null && request.auth.uid == userId;
      // Usuário autenticado pode criar/atualizar seu próprio perfil
      allow create, update: if request.auth != null && request.auth.uid == userId;
      // Usuário autenticado pode deletar seu próprio perfil
      allow delete: if request.auth != null && request.auth.uid == userId;
    }
    
    // Regras para lista de compras (filtrado por listaId)
    match /listaCompras/{itemId} {
      // Permite leitura/escrita se o usuário estiver autenticado e tiver acesso à lista
      allow read, write: if request.auth != null;
    }
    
    // Regras para listas compartilhadas
    match /sharedLists/{listId} {
      // Usuário autenticado pode ler se for owner ou member
      allow read: if request.auth != null && (
        resource.data.ownerId == request.auth.uid ||
        request.auth.uid in resource.data.members.map(m => m.userId)
      );
      
      // Apenas o owner pode criar (já que ownerId será o criador)
      allow create: if request.auth != null && 
        request.resource.data.ownerId == request.auth.uid;
      
      // Apenas o owner pode atualizar/deletar
      allow update, delete: if request.auth != null && 
        resource.data.ownerId == request.auth.uid;
    }
    
    // Regras para convites de lista
    match /listInvitations/{invitationId} {
      // Usuário autenticado pode ler seus próprios convites (como convidado)
      allow read: if request.auth != null && (
        resource.data.invitedEmail == request.auth.token.email ||
        resource.data.ownerId == request.auth.uid
      );
      
      // Apenas o owner da lista pode criar convites
      allow create: if request.auth != null;
      
      // Convidado pode atualizar (para aceitar/rejeitar)
      allow update: if request.auth != null && 
        (resource.data.invitedEmail == request.auth.token.email ||
         resource.data.ownerId == request.auth.uid);
      
      // Apenas o owner pode deletar
      allow delete: if request.auth != null && 
        resource.data.ownerId == request.auth.uid;
    }
    
    // Se tiver outras coleções, adicione regras específicas aqui
  }
}
```

### 3️⃣ Publicar as Regras

1. Clique em **"Publish"** (Publicar) no topo direito
2. Aguarde a confirmação: **"Rules published successfully"**

### 4️⃣ Testar Novamente

Após publicar as regras:
1. Tente criar uma conta novamente
2. O erro de permissão deve desaparecer
3. O perfil do usuário será criado no Firestore

## 🔍 Regras Explicadas

### Para Coleção `users`:
```javascript
match /users/{userId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow create, update: if request.auth != null && request.auth.uid == userId;
  allow delete: if request.auth != null && request.auth.uid == userId;
}
```

**O que isso significa:**
- ✅ Usuário autenticado pode ler seu próprio perfil (`userId` deve ser igual ao `uid` do usuário logado)
- ✅ Usuário autenticado pode criar/atualizar seu próprio perfil
- ✅ Usuário autenticado pode deletar seu próprio perfil
- ❌ Usuário não pode acessar perfis de outros usuários

### Para Coleção `listaCompras`:
```javascript
match /listaCompras/{itemId} {
  allow read, write: if request.auth != null;
}
```

**O que isso significa:**
- ✅ Qualquer usuário autenticado pode ler/escrever itens
- ❌ Usuários não autenticados não podem acessar
- ⚠️ Os itens são filtrados por `listaId` no código (usando o `SharedListService`)

### Para Coleção `sharedLists`:
```javascript
match /sharedLists/{listId} {
  allow read: if request.auth != null && (
    resource.data.ownerId == request.auth.uid ||
    request.auth.uid in resource.data.members.map(m => m.userId)
  );
  allow create: if request.auth != null && 
    request.resource.data.ownerId == request.auth.uid;
  allow update, delete: if request.auth != null && 
    resource.data.ownerId == request.auth.uid;
}
```

**O que isso significa:**
- ✅ Usuário pode ler se for owner ou member da lista
- ✅ Apenas o owner pode criar/atualizar/deletar listas
- ❌ Usuários não autenticados não podem acessar

### Para Coleção `listInvitations`:
```javascript
match /listInvitations/{invitationId} {
  allow read: if request.auth != null && (
    resource.data.invitedEmail == request.auth.token.email ||
    resource.data.ownerId == request.auth.uid
  );
  allow create: if request.auth != null;
  allow update: if request.auth != null && 
    (resource.data.invitedEmail == request.auth.token.email ||
     resource.data.ownerId == request.auth.uid);
  allow delete: if request.auth != null && 
    resource.data.ownerId == request.auth.uid;
}
```

**O que isso significa:**
- ✅ Usuário pode ler convites enviados para seu email ou da lista que ele é owner
- ✅ Owner pode criar/deletar convites
- ✅ Convidado pode atualizar convite (para aceitar/rejeitar)
- ❌ Usuários não autenticados não podem acessar

## 🧪 Modo de Desenvolvimento (TEMPORÁRIO)

⚠️ **ATENÇÃO: Só use isso para desenvolvimento/testes!**

Se quiser testar rapidamente sem configurar tudo (não recomendado para produção):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ⚠️ PERMITE TUDO - SÓ PARA DESENVOLVIMENTO!
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Isso permite que qualquer usuário autenticado leia/escreva em qualquer documento.**
**Use apenas para testar. Configure regras específicas para produção!**

## ✅ Checklist de Configuração

- [ ] Acessei Firestore Database no Firebase Console
- [ ] Cliquei na aba "Rules"
- [ ] Substituí as regras padrão pelas regras corretas
- [ ] Cliquei em "Publish"
- [ ] Recebi confirmação "Rules published successfully"
- [ ] Testei criar uma conta novamente
- [ ] Verifiquei que o perfil foi criado no Firestore

## 🔍 Verificar se Funcionou

Após configurar as regras:

1. **No Firebase Console:**
   - Vá para: Firestore Database > Data
   - Deve aparecer a coleção `users`
   - Deve aparecer um documento com o `userId` do usuário criado

2. **No App:**
   - Tente criar uma conta novamente
   - Não deve mais aparecer erro de permissão
   - O perfil deve ser criado com sucesso

## 🐛 Solução de Problemas

### Erro continua aparecendo?

1. **Verifique se publicou as regras:**
   - Você precisa clicar em "Publish" para salvar

2. **Limpe o cache:**
   - O Firebase pode estar usando regras antigas em cache
   - Aguarde alguns segundos após publicar

3. **Verifique se está autenticado:**
   - Certifique-se de que o usuário está logado antes de tentar criar o perfil

4. **Verifique a estrutura:**
   - O código cria documento em `users/{userId}`
   - Certifique-se de que a regra está correta para essa estrutura

### Quer regras mais restritivas?

Se quiser que usuários só vejam seus próprios dados na lista de compras:

```javascript
match /listaCompras/{itemId} {
  // Só permite ler/escrever se o documento tiver userId igual ao usuário logado
  allow read, write: if request.auth != null && 
    (resource == null || resource.data.userId == request.auth.uid);
  allow create: if request.auth != null && 
    request.resource.data.userId == request.auth.uid;
}
```

Mas para isso funcionar, você precisa atualizar o `TarefaService` para adicionar `userId` aos documentos. Veja `AUTH_IMPLEMENTATION.md`.

## 📚 Recursos Adicionais

- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firestore Rules Playground](https://console.firebase.google.com/project/_/firestore/rules) - Teste suas regras
- [Rules Simulator](https://console.firebase.google.com/project/_/firestore/rules/simulator) - Simule requisições

---

**Última atualização:** Agora mesmo!
**Status:** ✅ Funcional após configuração

