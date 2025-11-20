# Guia de Implementação de Autenticação

## ✅ O que foi implementado

### 1. **Serviço de Autenticação (AuthService)**
- Localização: `src/app/services/auth.service.ts`
- Funcionalidades:
  - ✅ Registro com email/senha
  - ✅ Login com email/senha
  - ✅ Login com Google
  - ✅ Logout
  - ✅ Redefinição de senha
  - ✅ Verificação de email
  - ✅ Gerenciamento de perfil do usuário no Firestore
  - ✅ Observável do estado de autenticação

### 2. **Guards de Autenticação**
- **AuthGuard** (`src/app/guards/auth.guard.ts`): Protege rotas que requerem autenticação
- **NoAuthGuard** (`src/app/guards/no-auth.guard.ts`): Impede acesso a páginas de login/cadastro se já estiver autenticado

### 3. **Páginas de Autenticação**
- **Login** (`src/app/pages/login/`)
  - Login com email/senha
  - Login com Google
  - Redefinição de senha
  - Link para cadastro
- **Cadastro** (`src/app/pages/register/`)
  - Registro com email/senha e nome
  - Cadastro com Google
  - Validação de senhas
  - Link para login

### 4. **Configuração no App Module**
- Firebase Auth configurado em `app.module.ts`
- Rotas protegidas com AuthGuard

## 📋 Configuração do Firebase Console

Antes de usar, você precisa configurar no Firebase Console:

1. **Ativar Authentication:**
   - Vá para [Firebase Console](https://console.firebase.google.com/)
   - Selecione seu projeto: `lista-de-compras-3047d`
   - No menu lateral, clique em **Authentication**
   - Clique em **Get Started**
   - Na aba **Sign-in method**, ative:
     - ✅ **Email/Password**
     - ✅ **Google** (configure o OAuth consent screen se necessário)

2. **Configurar domínios autorizados:**
   - Na aba **Settings** do Authentication
   - Adicione seus domínios autorizados

3. **Regras de Segurança do Firestore:**
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Regras para coleção de usuários
       match /users/{userId} {
         allow read: if request.auth != null && request.auth.uid == userId;
         allow write: if request.auth != null && request.auth.uid == userId;
       }
       
       // Regras para lista de compras (exemplo - ajustar conforme necessidade)
       match /listaCompras/{itemId} {
         allow read, write: if request.auth != null && resource.data.userId == request.auth.uid;
         allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
       }
     }
   }
   ```

## 🔧 Próximos Passos Recomendados

### 1. **Atualizar TarefaService para usar dados por usuário**

Atualmente, o `TarefaService` salva dados na coleção `listaCompras` sem filtrar por usuário. Para integrar autenticação:

**Opção A: Adicionar userId aos documentos**

```typescript
// No TarefaService, injetar AuthService:
constructor(
  private historicoService: HistoricoService,
  private catalogoService: CatalogoService,
  private firestore: Firestore,
  private authService: AuthService  // Adicionar
) { }

// No método salvar:
async salvar(tarefa: any, callback = null) {
  const user = this.authService.getCurrentUser();
  if (!user) {
    throw new Error('Usuário não autenticado');
  }
  
  tarefa.userId = user.uid; // Adicionar userId
  
  // ... resto do código
}

// No método iniciarSincronizacao:
private iniciarSincronizacao() {
  const user = this.authService.getCurrentUser();
  if (!user) return;
  
  const listaRef = collection(this.firestore, this.FIREBASE_COLLECTION);
  // Filtrar por userId
  const q = query(
    listaRef, 
    where('userId', '==', user.uid),
    orderBy('codigo', 'asc')
  );
  
  // ... resto do código
}

// No método getCollection, usar userId no localStorage key:
private getCollection(): any[] {
  const user = this.authService.getCurrentUser();
  const storageKey = user ? `${this.STORAGE_KEY}_${user.uid}` : this.STORAGE_KEY;
  const value = localStorage.getItem(storageKey);
  // ... resto do código
}
```

**Opção B: Usar subcoleções por usuário**

```typescript
// Estrutura: users/{userId}/listaCompras/{itemId}
private getCollectionPath(): string {
  const user = this.authService.getCurrentUser();
  if (!user) throw new Error('Usuário não autenticado');
  return `users/${user.uid}/listaCompras`;
}
```

### 2. **Adicionar botão de logout na página Settings**

```typescript
// settings.page.ts
import { AuthService } from 'src/app/services/auth.service';

async logout() {
  const alert = await this.alertController.create({
    header: 'Sair',
    message: 'Tem certeza que deseja sair?',
    buttons: [
      {
        text: 'Cancelar',
        role: 'cancel'
      },
      {
        text: 'Sair',
        handler: async () => {
          await this.authService.logout();
        }
      }
    ]
  });
  await alert.present();
}
```

### 3. **Atualizar página de Settings para mostrar dados do usuário**

```typescript
// settings.page.ts
import { AuthService } from 'src/app/services/auth.service';

ngOnInit() {
  this.authService.userProfile$.subscribe(profile => {
    if (profile) {
      this.userProfile = {
        name: profile.displayName || 'Usuário',
        email: profile.email,
        avatar: profile.photoURL || 'assets/rede.jpeg'
      };
    }
  });
}
```

### 4. **Adicionar interceptor ou redirecionamento inicial**

No `app.component.ts`, você pode adicionar:

```typescript
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';

constructor(
  private authService: AuthService,
  private router: Router
) {
  this.authService.currentUser$.subscribe(user => {
    if (user) {
      // Usuário está logado
    } else {
      // Usuário não está logado, redirecionar para login
      if (this.router.url !== '/login' && this.router.url !== '/register') {
        this.router.navigate(['/login']);
      }
    }
  });
}
```

## 🧪 Testando a Implementação

1. **Teste de Registro:**
   ```bash
   # Execute o app e teste criar uma conta
   ```

2. **Teste de Login:**
   - Teste com email/senha
   - Teste com Google (se configurado)

3. **Teste de Proteção de Rotas:**
   - Tente acessar `/home` sem estar logado
   - Deve redirecionar para `/login`

4. **Teste de Dados por Usuário:**
   - Faça login com duas contas diferentes
   - Cada conta deve ter sua própria lista de compras

## 📚 Recursos Adicionais

- [Firebase Authentication Docs](https://firebase.google.com/docs/auth)
- [AngularFire Auth](https://github.com/angular/angularfire)
- [Ionic Authentication Guide](https://ionicframework.com/docs/enterprise/auth-connect)

## ⚠️ Importante

1. **Migração de Dados:** Se você já tem dados no Firestore sem userId, considere criar um script de migração
2. **Segurança:** Configure as regras de segurança do Firestore adequadamente
3. **Testes:** Teste em diferentes cenários antes de fazer deploy
4. **Backup:** Faça backup dos dados antes de alterar estruturas

## 🎯 Funcionalidades Futuras (Opcional)

- [ ] Login com Facebook
- [ ] Login com Apple
- [ ] Autenticação biométrica (fingerprint/face ID)
- [ ] Sincronização em tempo real entre dispositivos
- [ ] Compartilhamento de listas entre usuários
- [ ] Perfis de família/grupo

---

**Criado em:** $(date)
**Versão:** 1.0.0

