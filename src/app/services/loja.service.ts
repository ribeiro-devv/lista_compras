import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

export interface Loja {
  id: string;
  nome: string;
  cor: string;
}

/** Paleta oferecida ao criar uma loja. */
export const CORES_LOJA: ReadonlyArray<string> = [
  '#3880ff', '#2dd36f', '#ffc409', '#f04141',
  '#7044ff', '#ff6b35', '#00d4ff', '#6c757d'
];

/**
 * Lojas do usuário. A "loja atual" é a que está selecionada nesta sessão de
 * compra — fica no localStorage, não no banco, porque é estado do aparelho.
 */
@Injectable({
  providedIn: 'root'
})
export class LojaService {

  private readonly LOJA_ATUAL_KEY = 'lojaAtual';

  private lojas: Loja[] = [];
  private lojas$ = new BehaviorSubject<Loja[]>([]);
  public lista$ = this.lojas$.asObservable();

  constructor(
    private authService: AuthService,
    private supabaseService: SupabaseService
  ) {}

  private get db() {
    return this.supabaseService.client;
  }

  async carregar(): Promise<Loja[]> {
    const user = this.authService.getCurrentUser();
    if (!user || !this.supabaseService.isConfigured) return this.publicar([]);

    const { data, error } = await this.db
      .from('lojas')
      .select('*')
      .eq('user_id', user.uid)
      .order('nome', { ascending: true });

    if (error) {
      console.error('❌ Erro ao carregar lojas:', error.message);
      return this.publicar([]);
    }

    return this.publicar((data || []).map(row => this.mapLoja(row)));
  }

  listarSync(): Loja[] {
    return this.lojas;
  }

  async criar(nome: string, cor: string): Promise<Loja> {
    const user = this.exigirUsuario();
    const nomeLimpo = nome.trim();

    if (!nomeLimpo) throw new Error('O nome da loja não pode ficar vazio');
    if (this.existeNome(nomeLimpo)) throw new Error('Já existe uma loja com esse nome');

    const { data, error } = await this.db
      .from('lojas')
      .insert({ user_id: user.uid, nome: nomeLimpo, cor })
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar loja:', error.message);
      throw new Error(error.message);
    }

    const criada = this.mapLoja(data);
    this.publicar([...this.lojas, criada]);
    return criada;
  }

  async atualizar(id: string, nome: string, cor: string): Promise<void> {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) throw new Error('O nome da loja não pode ficar vazio');

    const { error } = await this.db
      .from('lojas')
      .update({ nome: nomeLimpo, cor })
      .eq('id', id);

    if (error) {
      console.error('❌ Erro ao atualizar loja:', error.message);
      throw new Error(error.message);
    }

    this.publicar(this.lojas.map(l => (l.id === id ? { ...l, nome: nomeLimpo, cor } : l)));
  }

  /**
   * Exclui a loja. O histórico de preço NÃO é apagado: `loja_id` vira null
   * (on delete set null) e aqueles registros passam a aparecer como "Sem loja".
   */
  async excluir(id: string): Promise<void> {
    const { error } = await this.db.from('lojas').delete().eq('id', id);

    if (error) {
      console.error('❌ Erro ao excluir loja:', error.message);
      throw new Error(error.message);
    }

    if (this.lojaAtual()?.id === id) this.definirLojaAtual(null);
    this.publicar(this.lojas.filter(l => l.id !== id));
  }

  // ---- loja da sessão ----

  lojaAtual(): Loja | null {
    const id = localStorage.getItem(this.LOJA_ATUAL_KEY);
    if (!id) return null;
    return this.lojas.find(l => l.id === id) || null;
  }

  lojaAtualId(): string | null {
    return localStorage.getItem(this.LOJA_ATUAL_KEY);
  }

  definirLojaAtual(id: string | null): void {
    if (id) {
      localStorage.setItem(this.LOJA_ATUAL_KEY, id);
    } else {
      localStorage.removeItem(this.LOJA_ATUAL_KEY);
    }
  }

  // ---- internos ----

  private publicar(lojas: Loja[]): Loja[] {
    this.lojas = [...lojas].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    this.lojas$.next(this.lojas);
    return this.lojas;
  }

  private mapLoja(row: any): Loja {
    return { id: row.id, nome: row.nome, cor: row.cor };
  }

  private existeNome(nome: string): boolean {
    const alvo = nome.trim().toLowerCase();
    return this.lojas.some(l => l.nome.trim().toLowerCase() === alvo);
  }

  private exigirUsuario() {
    const user = this.authService.getCurrentUser();
    if (!user || !this.supabaseService.isConfigured) {
      throw new Error('Entre na sua conta para gerenciar lojas');
    }
    return user;
  }
}
