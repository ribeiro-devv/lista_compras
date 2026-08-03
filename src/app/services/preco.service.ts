import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import { CatalogoService } from './catalogo.service';
import { Loja, LojaService } from './loja.service';

export interface PrecoHistorico {
  valor: number;
  data: Date;
  lojaId?: string | null;
}

export interface PrecoPorLoja {
  loja: Loja | null;
  valor: number;
  data: Date;
}

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
    private authService: AuthService,
    private catalogoService: CatalogoService,
    private lojaService: LojaService
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

  /** Registra a compra: aprende no catálogo (sempre) + memória de preço + histórico. */
  async registrar(nome: string, valor: number): Promise<void> {
    if (!nome) return;
    const v = Number(valor) || 0;

    // Catálogo local aprende sempre (cria produto novo / atualiza preço).
    this.catalogoService.aprender(nome, v);

    if (v <= 0) return;

    const user = this.authService.getCurrentUser();
    if (!user || !this.supabaseService.isConfigured) return;

    const nomeNorm = this.normalizar(nome);
    this.cache.set(nomeNorm, { valor: v, atualizadoEm: new Date() });

    const { error } = await this.db.from('precos_usuario').upsert({
      user_id: user.uid,
      nome_normalizado: nomeNorm,
      nome: nome.trim(),
      valor: v,
      atualizado_em: new Date().toISOString()
    });
    if (error) console.warn('Não foi possível salvar preço:', error.message);

    // Histórico (append) para ver a evolução do preço e comparar por loja.
    const { error: hErr } = await this.db.from('historico_precos').insert({
      user_id: user.uid,
      nome_normalizado: nomeNorm,
      nome: nome.trim(),
      valor: v,
      loja_id: this.lojaService.lojaAtualId()
    });
    if (hErr) console.warn('Não foi possível salvar histórico de preço:', hErr.message);
  }

  /** Últimos preços pagos por um produto (mais recente primeiro). */
  async obterHistorico(nome: string, limite = 8): Promise<PrecoHistorico[]> {
    const user = this.authService.getCurrentUser();
    if (!user || !this.supabaseService.isConfigured) return [];

    const { data, error } = await this.db
      .from('historico_precos')
      .select('valor, data, loja_id')
      .eq('user_id', user.uid)
      .eq('nome_normalizado', this.normalizar(nome))
      .order('data', { ascending: false })
      .limit(limite);

    if (error || !data) return [];
    return data.map(r => ({
      valor: Number(r.valor) || 0,
      data: new Date(r.data),
      lojaId: r.loja_id ?? null
    }));
  }

  /**
   * Último preço do produto em cada loja, do mais barato ao mais caro.
   * Registros sem loja entram como "Sem loja" (loja null).
   */
  async precosPorLoja(nome: string): Promise<PrecoPorLoja[]> {
    const user = this.authService.getCurrentUser();
    if (!user || !this.supabaseService.isConfigured) return [];

    const { data, error } = await this.db
      .from('historico_precos')
      .select('valor, data, loja_id')
      .eq('user_id', user.uid)
      .eq('nome_normalizado', this.normalizar(nome))
      .order('data', { ascending: false });

    if (error || !data) return [];

    const lojas = this.lojaService.listarSync();

    // Como já vem do mais recente para o mais antigo, o primeiro registro de
    // cada loja é o preço mais atual dela.
    const maisRecentePorLoja = new Map<string, PrecoPorLoja>();

    for (const linha of data) {
      const chave = linha.loja_id ?? '__sem_loja__';
      if (maisRecentePorLoja.has(chave)) continue;

      maisRecentePorLoja.set(chave, {
        loja: lojas.find(l => l.id === linha.loja_id) || null,
        valor: Number(linha.valor) || 0,
        data: new Date(linha.data)
      });
    }

    return Array.from(maisRecentePorLoja.values()).sort((a, b) => a.valor - b.valor);
  }
}
