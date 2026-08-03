import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';
import {
  CatalogoService,
  CategoriaProduto,
  CATEGORIAS_PADRAO,
  CATEGORIA_PADRAO_NOME
} from './catalogo.service';

export interface Categoria extends CategoriaProduto {
  ordem: number;
}

/** Ícones oferecidos ao criar/editar uma categoria. */
export const ICONES_CATEGORIA: ReadonlyArray<string> = [
  'basket-outline', 'cart-outline', 'leaf-outline', 'fish-outline',
  'cafe-outline', 'wine-outline', 'happy-outline', 'snow-outline',
  'home-outline', 'sparkles-outline', 'paw-outline', 'medkit-outline',
  'construct-outline', 'shirt-outline', 'flower-outline', 'pricetag-outline'
];

/** Paleta oferecida ao criar/editar uma categoria. */
export const CORES_CATEGORIA: ReadonlyArray<string> = [
  '#3880ff', '#2dd36f', '#ffc409', '#f04141',
  '#7044ff', '#ff6b35', '#00d4ff', '#6c757d'
];

/**
 * Categorias do usuário. Fonte da verdade é a tabela `categorias` no Supabase;
 * o CatalogoService mantém um espelho síncrono para os templates.
 *
 * Atenção: `list_items.categoria` guarda o NOME da categoria, não o id. Por
 * isso renomear exige atualizar os itens junto — ver `renomear()`.
 */
@Injectable({
  providedIn: 'root'
})
export class CategoriaService {

  private categorias: Categoria[] = [];
  private categorias$ = new BehaviorSubject<Categoria[]>([]);
  public lista$ = this.categorias$.asObservable();

  constructor(
    private authService: AuthService,
    private supabaseService: SupabaseService,
    private catalogoService: CatalogoService
  ) {}

  private get db() {
    return this.supabaseService.client;
  }

  /** Carrega do Supabase e semeia as padrão se o usuário ainda não tem nenhuma. */
  async carregar(): Promise<Categoria[]> {
    const user = this.authService.getCurrentUser();
    if (!user || !this.supabaseService.isConfigured) {
      return this.publicar(this.padraoComoCategorias());
    }

    const { data, error } = await this.db
      .from('categorias')
      .select('*')
      .eq('user_id', user.uid)
      .order('ordem', { ascending: true });

    if (error) {
      console.error('❌ Erro ao carregar categorias:', error.message);
      // Sem categorias não dá para agrupar nada — cai nas padrão em memória.
      return this.publicar(this.padraoComoCategorias());
    }

    if (!data || data.length === 0) {
      return this.semear();
    }

    return this.publicar(data.map(row => this.mapCategoria(row)));
  }

  listarSync(): Categoria[] {
    return this.categorias;
  }

  /**
   * Slug da ilustração de uma categoria, ou null se não houver.
   * Só as dez categorias padrão têm arte; categoria criada pelo usuário
   * continua usando o ionicon escolhido por ele.
   *
   * O slug vira o atributo `data-arte` no template, e o SCSS aplica o SVG
   * como máscara CSS — assim a arte herda a cor da categoria, o que um
   * `<img src>` não faria.
   */
  slugIlustracao(nome: string): string | null {
    return CATEGORIAS_PADRAO.find(c => c.nome === nome)?.id ?? null;
  }

  async criar(nome: string, icone: string, cor: string): Promise<Categoria> {
    const user = this.exigirUsuario();
    const nomeLimpo = nome.trim();

    if (!nomeLimpo) throw new Error('O nome da categoria não pode ficar vazio');
    if (this.existeNome(nomeLimpo)) throw new Error('Já existe uma categoria com esse nome');

    const ordem = this.categorias.reduce((max, c) => Math.max(max, c.ordem), 0) + 1;

    const { data, error } = await this.db
      .from('categorias')
      .insert({ user_id: user.uid, nome: nomeLimpo, icone, cor, ordem })
      .select()
      .single();

    if (error) {
      console.error('❌ Erro ao criar categoria:', error.message);
      throw new Error(error.message);
    }

    const criada = this.mapCategoria(data);
    this.publicar([...this.categorias, criada]);
    return criada;
  }

  /**
   * Renomeia e arrasta junto todos os itens que apontam para o nome antigo.
   * Os itens são atualizados PRIMEIRO: se essa parte falhar, a categoria não
   * é renomeada e nada fica inconsistente.
   */
  async renomear(id: string, nome: string): Promise<void> {
    const categoria = this.exigirCategoria(id);
    const nomeLimpo = nome.trim();

    if (!nomeLimpo) throw new Error('O nome da categoria não pode ficar vazio');
    if (nomeLimpo === categoria.nome) return;
    if (categoria.nome === CATEGORIA_PADRAO_NOME) {
      throw new Error(`A categoria "${CATEGORIA_PADRAO_NOME}" não pode ser renomeada`);
    }
    if (this.existeNome(nomeLimpo)) throw new Error('Já existe uma categoria com esse nome');

    const { error: erroItens } = await this.db
      .from('list_items')
      .update({ categoria: nomeLimpo })
      .eq('categoria', categoria.nome);

    if (erroItens) {
      console.error('❌ Erro ao mover itens da categoria:', erroItens.message);
      throw new Error(erroItens.message);
    }

    const { error } = await this.db
      .from('categorias')
      .update({ nome: nomeLimpo })
      .eq('id', id);

    if (error) {
      console.error('❌ Erro ao renomear categoria:', error.message);
      throw new Error(error.message);
    }

    this.publicar(this.categorias.map(c => (c.id === id ? { ...c, nome: nomeLimpo } : c)));
  }

  async atualizarAparencia(id: string, icone: string, cor: string): Promise<void> {
    this.exigirCategoria(id);

    const { error } = await this.db
      .from('categorias')
      .update({ icone, cor })
      .eq('id', id);

    if (error) {
      console.error('❌ Erro ao atualizar categoria:', error.message);
      throw new Error(error.message);
    }

    this.publicar(this.categorias.map(c => (c.id === id ? { ...c, icone, cor } : c)));
  }

  /**
   * Exclui a categoria. `moverPara` recebe o nome da categoria que herda os
   * itens; passando null, os itens vão para "Outros".
   */
  async excluir(id: string, moverPara: string | null = null): Promise<void> {
    const categoria = this.exigirCategoria(id);

    if (categoria.nome === CATEGORIA_PADRAO_NOME) {
      throw new Error(`A categoria "${CATEGORIA_PADRAO_NOME}" não pode ser excluída`);
    }

    const destino = moverPara || CATEGORIA_PADRAO_NOME;

    const { error: erroItens } = await this.db
      .from('list_items')
      .update({ categoria: destino })
      .eq('categoria', categoria.nome);

    if (erroItens) {
      console.error('❌ Erro ao mover itens antes de excluir:', erroItens.message);
      throw new Error(erroItens.message);
    }

    const { error } = await this.db.from('categorias').delete().eq('id', id);

    if (error) {
      console.error('❌ Erro ao excluir categoria:', error.message);
      throw new Error(error.message);
    }

    this.publicar(this.categorias.filter(c => c.id !== id));
  }

  /** Recebe os ids na ordem desejada e grava `ordem` conforme a posição. */
  async reordenar(ids: string[]): Promise<void> {
    const porId = new Map(this.categorias.map(c => [c.id, c]));
    const reordenadas = ids
      .map((id, indice) => {
        const categoria = porId.get(id);
        return categoria ? { ...categoria, ordem: indice } : null;
      })
      .filter((c): c is Categoria => c !== null);

    this.publicar(reordenadas);

    for (const categoria of reordenadas) {
      const { error } = await this.db
        .from('categorias')
        .update({ ordem: categoria.ordem })
        .eq('id', categoria.id);

      if (error) {
        console.error('❌ Erro ao reordenar categorias:', error.message);
        throw new Error(error.message);
      }
    }
  }

  // ---- internos ----

  private async semear(): Promise<Categoria[]> {
    const user = this.exigirUsuario();

    const linhas = CATEGORIAS_PADRAO.map((categoria, indice) => ({
      user_id: user.uid,
      nome: categoria.nome,
      icone: categoria.icone,
      cor: categoria.cor,
      ordem: indice
    }));

    const { data, error } = await this.db.from('categorias').insert(linhas).select();

    if (error) {
      console.error('❌ Erro ao semear categorias:', error.message);
      return this.publicar(this.padraoComoCategorias());
    }

    return this.publicar((data || []).map(row => this.mapCategoria(row)));
  }

  private publicar(categorias: Categoria[]): Categoria[] {
    this.categorias = [...categorias].sort((a, b) => a.ordem - b.ordem);
    this.categorias$.next(this.categorias);
    this.catalogoService.definirCategorias(this.categorias);
    return this.categorias;
  }

  private padraoComoCategorias(): Categoria[] {
    return CATEGORIAS_PADRAO.map((categoria, indice) => ({ ...categoria, ordem: indice }));
  }

  private mapCategoria(row: any): Categoria {
    return {
      id: row.id,
      nome: row.nome,
      icone: row.icone,
      cor: row.cor,
      ordem: row.ordem ?? 0
    };
  }

  private existeNome(nome: string): boolean {
    const alvo = nome.trim().toLowerCase();
    return this.categorias.some(c => c.nome.trim().toLowerCase() === alvo);
  }

  private exigirCategoria(id: string): Categoria {
    const categoria = this.categorias.find(c => c.id === id);
    if (!categoria) throw new Error('Categoria não encontrada');
    return categoria;
  }

  private exigirUsuario() {
    const user = this.authService.getCurrentUser();
    if (!user || !this.supabaseService.isConfigured) {
      throw new Error('Entre na sua conta para gerenciar categorias');
    }
    return user;
  }
}
