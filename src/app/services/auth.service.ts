import { Injectable } from '@angular/core';
import { 
  Auth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User,
  sendPasswordResetEmail,
  updateProfile,
  sendEmailVerification
} from '@angular/fire/auth';
import { Firestore, doc, setDoc, getDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { map, first } from 'rxjs/operators';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  createdAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  private userProfileSubject = new BehaviorSubject<UserProfile | null>(null);
  public userProfile$: Observable<UserProfile | null> = this.userProfileSubject.asObservable();

  private hasFirestorePermissionError = false; // Flag para evitar tentativas repetidas
  private authStateChecked = false; // Flag para indicar se o Firebase já verificou a sessão

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private router: Router
  ) {
    // Observar mudanças no estado de autenticação
    // O Firebase Auth automaticamente verifica a sessão persistida ao inicializar
    onAuthStateChanged(this.auth, async (user) => {
      this.currentUserSubject.next(user);
      this.authStateChecked = true; // Marca que o Firebase já verificou
      
      if (user) {
        // Se já teve erro de permissão, criar perfil local apenas
        if (this.hasFirestorePermissionError) {
          this.createLocalProfile(user);
        } else {
          await this.loadUserProfile(user.uid);
        }
      } else {
        this.userProfileSubject.next(null);
        this.hasFirestorePermissionError = false; // Reset ao fazer logout
      }
    });
  }

  /**
   * Verifica se o Firebase já verificou a sessão persistida
   */
  isAuthStateChecked(): boolean {
    return this.authStateChecked;
  }

  /**
   * Registra um novo usuário com email e senha
   */
  async register(email: string, password: string, displayName?: string): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;

      // Atualizar perfil do usuário
      if (displayName) {
        try {
          await updateProfile(user, { displayName });
        } catch (error) {
          console.warn('Erro ao atualizar perfil do usuário:', error);
          // Continua mesmo se falhar
        }
      }

      // Enviar email de verificação (não bloqueia se falhar)
      try {
        await sendEmailVerification(user);
      } catch (error) {
        console.warn('Erro ao enviar email de verificação:', error);
        // Continua mesmo se falhar
      }

      // Criar perfil no Firestore (não bloqueia se falhar)
      // O perfil será criado na próxima vez ou quando as regras forem configuradas
      await this.createUserProfile(user, displayName);

      return user;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Login com email e senha
   */
  async login(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      return userCredential.user;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Login com Google
   */
  async loginWithGoogle(): Promise<User> {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      
      const userCredential = await signInWithPopup(this.auth, provider);
      const user = userCredential.user;

      // Verificar se o perfil já existe no Firestore
      // Se não existir, tenta criar (não bloqueia se falhar)
      try {
        const profileExists = await this.checkUserProfileExists(user.uid);
        if (!profileExists) {
          await this.createUserProfile(user);
        }
      } catch (error) {
        // Se não conseguir verificar ou criar, tenta criar mesmo assim
        // Pode ser que as regras não permitam verificar mas permitam criar
        await this.createUserProfile(user);
      }

      return user;
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      this.userProfileSubject.next(null);
      this.router.navigate(['/login']);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Envia email de redefinição de senha
   */
  async resetPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Obtém o usuário atual
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Obtém o perfil do usuário atual
   */
  getCurrentUserProfile(): UserProfile | null {
    return this.userProfileSubject.value;
  }

  /**
   * Verifica se o usuário está autenticado
   */
  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  /**
   * Carrega o perfil do usuário do Firestore
   */
  private async loadUserProfile(uid: string): Promise<void> {
    try {
      const userDoc = await getDoc(doc(this.firestore, 'users', uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        this.userProfileSubject.next({
          uid,
          email: data['email'],
          displayName: data['displayName'],
          photoURL: data['photoURL'],
          emailVerified: data['emailVerified'] || false,
          createdAt: data['createdAt']?.toDate()
        });
        this.hasFirestorePermissionError = false; // Reset flag se funcionar
      } else {
        // Se não existe perfil, criar um básico (sem bloquear se falhar)
        const user = this.getCurrentUser();
        if (user) {
          await this.createUserProfile(user);
        }
      }
    } catch (error: any) {
      // Não mostrar erro se for permissão - apenas logar aviso uma vez
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        this.hasFirestorePermissionError = true;
        if (!this.userProfileSubject.value) { // Só logar se não tiver perfil ainda
          console.warn('⚠️ Aviso: Regras do Firestore não configuradas. O usuário está logado, mas o perfil não será salvo no Firestore.');
          console.info('💡 Configure as regras em: Firestore Database > Rules');
        }
        // Criar perfil básico local com dados do Auth
        const user = this.getCurrentUser();
        if (user) {
          this.createLocalProfile(user);
        }
      } else {
        console.error('Erro ao carregar perfil do usuário:', error);
      }
    }
  }

  /**
   * Cria perfil local quando Firestore não está disponível
   */
  private createLocalProfile(user: User): void {
    this.userProfileSubject.next({
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      emailVerified: user.emailVerified,
      createdAt: new Date()
    });
  }

  /**
   * Cria perfil do usuário no Firestore
   */
  private async createUserProfile(user: User, displayName?: string): Promise<void> {
    try {
      const userRef = doc(this.firestore, 'users', user.uid);
      const userData = {
        email: user.email,
        displayName: displayName || user.displayName || '',
        photoURL: user.photoURL || '',
        emailVerified: user.emailVerified,
        createdAt: new Date(),
        lastLogin: new Date()
      };

      await setDoc(userRef, userData, { merge: true });
      
      // Atualizar perfil local
      this.userProfileSubject.next({
        uid: user.uid,
        email: user.email || '',
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        emailVerified: user.emailVerified,
        createdAt: userData.createdAt
      });
    } catch (error: any) {
      console.error('Erro ao criar perfil do usuário no Firestore:', error);
      // Não bloqueia o registro/login se falhar - o perfil pode ser criado depois
      // Se for erro de permissão, mostrar mensagem útil
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        console.warn('⚠️ Regras de segurança do Firestore não configuradas. Configure as regras em: Firestore Database > Rules');
        console.warn('💡 O usuário foi criado, mas o perfil não foi salvo. Configure as regras para permitir.');
      }
      // Não lança erro para não bloquear o registro/login
      // O perfil será criado na próxima vez ou quando as regras forem configuradas
    }
  }

  /**
   * Verifica se o perfil do usuário existe no Firestore
   */
  private async checkUserProfileExists(uid: string): Promise<boolean> {
    try {
      const userDoc = await getDoc(doc(this.firestore, 'users', uid));
      return userDoc.exists();
    } catch (error) {
      console.error('Erro ao verificar perfil do usuário:', error);
      return false;
    }
  }

  /**
   * Atualiza o perfil do usuário
   */
  async updateUserProfile(displayName?: string, photoURL?: string): Promise<void> {
    const user = this.getCurrentUser();
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    try {
      // Atualizar no Auth
      if (displayName || photoURL) {
        await updateProfile(user, {
          displayName,
          photoURL
        });
      }

      // Atualizar no Firestore
      const userRef = doc(this.firestore, 'users', user.uid);
      const updateData: any = {};
      if (displayName !== undefined) updateData.displayName = displayName;
      if (photoURL !== undefined) updateData.photoURL = photoURL;

      await setDoc(userRef, updateData, { merge: true });

      // Recarregar perfil
      await this.loadUserProfile(user.uid);
    } catch (error: any) {
      throw this.handleAuthError(error);
    }
  }

  /**
   * Trata erros de autenticação e retorna mensagens amigáveis
   */
  private handleAuthError(error: any): Error {
    let message = 'Ocorreu um erro na autenticação.';

    // Verificar se é erro 400 (Bad Request) - geralmente significa que auth não está habilitada
    if (error.code === 'auth/operation-not-allowed' || 
        (error.message && error.message.includes('API key not valid')) ||
        (error.code && error.code.includes('400'))) {
      message = 'Autenticação não está habilitada no Firebase. Configure no Firebase Console: Authentication > Sign-in method > Habilitar Email/Password e Google.';
    } else {
      switch (error.code) {
        case 'auth/email-already-in-use':
          message = 'Este email já está sendo usado.';
          break;
        case 'auth/invalid-email':
          message = 'Email inválido.';
          break;
        case 'auth/operation-not-allowed':
          message = 'Este método de autenticação não está habilitado. Habilite no Firebase Console.';
          break;
        case 'auth/weak-password':
          message = 'Senha muito fraca. Use pelo menos 6 caracteres.';
          break;
        case 'auth/user-disabled':
          message = 'Esta conta foi desabilitada.';
          break;
        case 'auth/user-not-found':
          message = 'Usuário não encontrado.';
          break;
        case 'auth/wrong-password':
          message = 'Senha incorreta.';
          break;
        case 'auth/too-many-requests':
          message = 'Muitas tentativas. Tente novamente mais tarde.';
          break;
        case 'auth/network-request-failed':
          message = 'Erro de conexão. Verifique sua internet.';
          break;
        case 'auth/popup-closed-by-user':
          message = 'Popup fechado pelo usuário.';
          break;
        case 'auth/unauthorized-domain':
          message = 'Este domínio não está autorizado. Adicione no Firebase Console.';
          break;
        case 'auth/popup-blocked':
          message = 'Popup bloqueado pelo navegador. Permita popups para este site.';
          break;
        default:
          // Se for um erro HTTP 400, pode ser que o método não está habilitado
          if (error.message && (error.message.includes('400') || error.message.includes('Bad Request'))) {
            message = 'Erro ao conectar com Firebase. Verifique se a autenticação está habilitada no Firebase Console.';
          } else {
            message = error.message || error.code || message;
          }
      }
    }

    return new Error(message);
  }
}

