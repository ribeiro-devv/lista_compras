import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthError, User as SupabaseUser } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';

/** Usuário normalizado usado em todo o app (mantém o formato antigo do Firebase). */
export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  emailVerified: boolean;
}

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
  private currentUserSubject = new BehaviorSubject<AppUser | null>(null);
  public currentUser$: Observable<AppUser | null> = this.currentUserSubject.asObservable();

  private userProfileSubject = new BehaviorSubject<UserProfile | null>(null);
  public userProfile$: Observable<UserProfile | null> = this.userProfileSubject.asObservable();

  private authStateChecked = false;

  /** Resolve assim que a sessão persistida é verificada (usado pelos guards). */
  private authReadyResolve!: (user: AppUser | null) => void;
  public authReady: Promise<AppUser | null> = new Promise((res) => (this.authReadyResolve = res));

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {
    if (!this.supabaseService.isConfigured) {
      // Sem chaves ainda: marca como verificado para não travar os guards.
      this.authStateChecked = true;
      this.authReadyResolve(null);
      return;
    }

    // Estado inicial (sessão persistida) + mudanças de auth.
    this.supabaseService.client.auth.getSession().then(({ data }) => {
      this.handleUser(data.session?.user ?? null);
      this.authStateChecked = true;
      this.authReadyResolve(this.getCurrentUser());
    });

    this.supabaseService.client.auth.onAuthStateChange((_event, session) => {
      this.handleUser(session?.user ?? null);
      this.authStateChecked = true;
    });
  }

  isAuthStateChecked(): boolean {
    return this.authStateChecked;
  }

  /** Registra um novo usuário. O perfil e a "Minha Lista" são criados por trigger no banco. */
  async register(email: string, password: string, displayName?: string): Promise<AppUser> {
    this.assertConfigured();
    const { data, error } = await this.supabaseService.client.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || '' }
      }
    });

    if (error) throw this.handleAuthError(error);
    if (!data.user) throw new Error('Não foi possível criar a conta.');

    return this.toAppUser(data.user);
  }

  /** Login com email e senha. */
  async login(email: string, password: string): Promise<AppUser> {
    this.assertConfigured();
    const { data, error } = await this.supabaseService.client.auth.signInWithPassword({ email, password });
    if (error) throw this.handleAuthError(error);
    return this.toAppUser(data.user);
  }

  /** Login com Google (requer o provider habilitado no Supabase). */
  async loginWithGoogle(): Promise<void> {
    this.assertConfigured();
    const { error } = await this.supabaseService.client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/home' }
    });
    if (error) throw this.handleAuthError(error);
    // O fluxo OAuth redireciona a página; a sessão é capturada no retorno.
  }

  async logout(): Promise<void> {
    this.assertConfigured();
    const { error } = await this.supabaseService.client.auth.signOut();
    if (error) throw this.handleAuthError(error);
    this.userProfileSubject.next(null);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  async resetPassword(email: string): Promise<void> {
    this.assertConfigured();
    const { error } = await this.supabaseService.client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/login'
    });
    if (error) throw this.handleAuthError(error);
  }

  getCurrentUser(): AppUser | null {
    return this.currentUserSubject.value;
  }

  getCurrentUserProfile(): UserProfile | null {
    return this.userProfileSubject.value;
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  /** Atualiza nome/foto do perfil (auth metadata + tabela profiles). */
  async updateUserProfile(displayName?: string, photoURL?: string): Promise<void> {
    this.assertConfigured();
    const user = this.getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');

    const metadata: Record<string, string> = {};
    if (displayName !== undefined) metadata['display_name'] = displayName;
    if (photoURL !== undefined) metadata['photo_url'] = photoURL;

    const { error: authErr } = await this.supabaseService.client.auth.updateUser({ data: metadata });
    if (authErr) throw this.handleAuthError(authErr);

    const update: Record<string, any> = {};
    if (displayName !== undefined) update['display_name'] = displayName;
    if (photoURL !== undefined) update['photo_url'] = photoURL;

    const { error: dbErr } = await this.supabaseService.client
      .from('profiles')
      .update(update)
      .eq('id', user.uid);
    if (dbErr) console.warn('Erro ao atualizar perfil no banco:', dbErr.message);

    await this.loadUserProfile(user.uid);
  }

  // ---- internos ----

  private handleUser(supaUser: SupabaseUser | null): void {
    if (!supaUser) {
      this.currentUserSubject.next(null);
      this.userProfileSubject.next(null);
      return;
    }
    const appUser = this.toAppUser(supaUser);
    this.currentUserSubject.next(appUser);
    // Perfil básico imediato (do auth) + carrega o completo do banco.
    this.userProfileSubject.next({ ...appUser });
    this.loadUserProfile(appUser.uid);
  }

  private toAppUser(supaUser: SupabaseUser): AppUser {
    const meta = supaUser.user_metadata || {};
    return {
      uid: supaUser.id,
      email: supaUser.email || '',
      displayName: meta['display_name'] || meta['full_name'] || meta['name'] || '',
      photoURL: meta['photo_url'] || meta['avatar_url'] || '',
      emailVerified: !!supaUser.email_confirmed_at
    };
  }

  private async loadUserProfile(uid: string): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (error || !data) return; // mantém o perfil básico já emitido

      const user = this.getCurrentUser();
      this.userProfileSubject.next({
        uid,
        email: data['email'] || user?.email || '',
        displayName: data['display_name'] || user?.displayName || '',
        photoURL: data['photo_url'] || user?.photoURL || '',
        emailVerified: user?.emailVerified ?? false,
        createdAt: data['created_at'] ? new Date(data['created_at']) : undefined
      });
    } catch (e) {
      console.warn('Não foi possível carregar o perfil:', e);
    }
  }

  private assertConfigured(): void {
    if (!this.supabaseService.isConfigured) {
      throw new Error('Supabase não configurado. Veja SUPABASE_SETUP_GUIDE.md.');
    }
  }

  /** Traduz erros do Supabase em mensagens amigáveis em PT-BR. */
  private handleAuthError(error: AuthError | Error): Error {
    const raw = (error?.message || '').toLowerCase();

    if (raw.includes('invalid login credentials')) {
      return new Error('E-mail ou senha incorretos.');
    }
    if (raw.includes('email not confirmed')) {
      return new Error('Confirme seu e-mail antes de entrar (verifique sua caixa de entrada).');
    }
    if (raw.includes('user already registered') || raw.includes('already been registered')) {
      return new Error('Este e-mail já está cadastrado.');
    }
    if (raw.includes('password should be at least')) {
      return new Error('Senha muito curta. Use pelo menos 6 caracteres.');
    }
    if (raw.includes('unable to validate email') || raw.includes('invalid email')) {
      return new Error('E-mail inválido.');
    }
    if (raw.includes('rate limit') || raw.includes('too many')) {
      return new Error('Muitas tentativas. Aguarde um momento e tente novamente.');
    }
    if (raw.includes('provider is not enabled')) {
      return new Error('Login com Google não está habilitado no Supabase.');
    }
    if (raw.includes('network') || raw.includes('failed to fetch')) {
      return new Error('Erro de conexão. Verifique sua internet.');
    }
    return new Error(error?.message || 'Ocorreu um erro na autenticação.');
  }
}
