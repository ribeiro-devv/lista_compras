import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

/**
 * Memória de preços por usuário: guarda o ÚLTIMO preço que a pessoa pagou em
 * cada produto e sugere isso na hora de adicionar — em vez de um preço fixo
 * chumbado no catálogo, que envelhece e engana.
 */
@Injectable({
  providedIn: 'root'
})
export class PrecoService {
  /** Cache em memória: nome_normalizado -> { valor, atualizadoEm }. */
  private cache = new Map<string, { valor: number; atualizadoEm: Date }>();

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.carregar();
      } else {
        this.cache.clear();
      }
    });
  }

  private get db() {
    return this.supabaseService.client;
  }

  private normalizar(nome: string): string {
    return (nome || '').trim().toLowerCase();
  }

  /** Carrega os preços do usuário para o cache. */
  async carregar(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user || !this.supabaseService.isConfigured) return;

    const { data, error } = await this.db
      .from('precos_usuario')
      .select('*')
      .eq('user_id', user.uid);

    if (error) {
      console.warn('Não foi possível carregar preços:', error.message);
      return;
    }

    this.cache.clear();
    (data || []).forEach(row => {
      this.cache.set(row.nome_normalizado, {
        valor: Number(row.valor) || 0,
        atualizadoEm: row.atualizado_em ? new Date(row.atualizado_em) : new Date()
      });
    });
  }

  /** Retorna o último preço conhecido do produto (ou null). */
  obterPreco(nome: string): number | null {
    const info = this.cache.get(this.normalizar(nome));
    return info && info.valor > 0 ? info.valor : null;
  }

  /** Retorna há quantos dias esse preço foi registrado (ou null). */
  diasDesde(nome: string): number | null {
    const info = this.cache.get(this.normalizar(nome));
    if (!info) return null;
    const ms = Date.now() - info.atualizadoEm.getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }

  /** Registra/atualiza o preço de um produto (chamado quando um item ganha preço). */
  async registrar(nome: string, valor: number): Promise<void> {
    const v = Number(valor);
    if (!nome || !v || v <= 0) return;

    const user = this.authService.getCurrentUser();
    if (!user || !this.supabaseService.isConfigured) return;

    const nomeNorm = this.normalizar(nome);

    // Atualiza o cache na hora (feedback imediato).
    this.cache.set(nomeNorm, { valor: v, atualizadoEm: new Date() });

    const { error } = await this.db.from('precos_usuario').upsert({
      user_id: user.uid,
      nome_normalizado: nomeNorm,
      nome: nome.trim(),
      valor: v,
      atualizado_em: new Date().toISOString()
    });

    if (error) console.warn('Não foi possível salvar preço:', error.message);
  }
}
