import { Injectable } from '@angular/core';
import { HistoricoService, ItemCompra } from './historico.service';
import { CatalogoService, CATEGORIA_PADRAO_NOME } from './catalogo.service';
import { AuthService } from './auth.service';
import { SharedListService, SharedList } from './shared-list.service';
import { SupabaseService } from './supabase.service';
import { PrecoService } from './preco.service';
import { BehaviorSubject } from 'rxjs';
import { RealtimeChannel } from '@supabase/supabase-js';
import { somarSubtotais, subtotalItem, totalDescontos } from './calculo-item';
import { normalizarUnidade, UNIDADE_PADRAO } from './unidades';

@Injectable({
  providedIn: 'root'
})
export class TarefaService {
  private readonly STORAGE_KEY = 'tarefaCollection';
  codMostrar: boolean = false;

  private listaAtualizada$ = new BehaviorSubject<any[]>([]);
  public lista$ = this.listaAtualizada$.asObservable();

  private currentList: SharedList | null = null;
  private items: any[] = [];
  private channel?: RealtimeChannel;

  constructor(
    private historicoService: HistoricoService,
    private catalogoService: CatalogoService,
    private supabaseService: SupabaseService,
    private authService: AuthService,
    private sharedListService: SharedListService,
    private precoService: PrecoService
  ) {
    this.sharedListService.currentList$.subscribe(list => {
      this.currentList = list;
      this.onListChanged();
    });
  }

  private get db() {
    return this.supabaseService.client;
  }

  // ------------------------------------------------------------------
  // Ciclo de vida / sincronização
  // ------------------------------------------------------------------

  private onListChanged(): void {
    this.teardownChannel();

    if (!this.currentList || !this.supabaseService.isConfigured) {
      this.items = [];
      this.listaAtualizada$.next([]);
      return;
    }

    // Paint instantâneo a partir do cache local, depois busca do servidor.
    this.items = this.readCache();
    this.listaAtualizada$.next([...this.items]);

    this.loadItems();
    this.subscribeRealtime(this.currentList.id);
  }

  private async loadItems(): Promise<void> {
    if (!this.currentList) return;
    const { data, error } = await this.db
      .from('list_items')
      .select('*')
      .eq('list_id', this.currentList.id)
      .order('codigo', { ascending: true });

    if (error) {
      console.error('❌ Erro ao carregar itens:', error.message);
      return;
    }

    this.items = (data || []).map(row => this.mapItem(row));
    this.writeCache(this.items);
    this.codMostrar = this.items.some(i => i.tarefa != null);
    this.listaAtualizada$.next([...this.items]);
  }

  private subscribeRealtime(listId: string): void {
    this.channel = this.db
      .channel(`list_items:${listId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'list_items', filter: `list_id=eq.${listId}` },
        () => this.loadItems()
      )
      .subscribe();
  }

  private teardownChannel(): void {
    if (this.channel) {
      this.db.removeChannel(this.channel);
      this.channel = undefined;
    }
  }

  // ------------------------------------------------------------------
  // CRUD
  // ------------------------------------------------------------------

  async salvar(tarefa: any, callback: (() => void) | null = null) {
    if (!this.currentList) throw new Error('Nenhuma lista selecionada');
    const user = this.authService.getCurrentUser();

    // codigo = maior existente + 1 (robusto a exclusões, diferente do length antigo).
    const maxCodigo = this.items.reduce((max, i) => Math.max(max, i.codigo || 0), 0);
    const novo = {
      list_id: this.currentList.id,
      codigo: maxCodigo + 1,
      tarefa: tarefa.tarefa,
      quantidade: this.toNumber(tarefa.quantidade),
      valor_unitario: this.toNumber(tarefa.valorUnitario),
      desconto: this.toNumber(tarefa.desconto),
      unidade: normalizarUnidade(tarefa.unidade ?? this.unidadeDoCatalogo(tarefa.tarefa)),
      feito: tarefa.feito ?? false,
      categoria: this.classificarItem(tarefa.tarefa),
      criado_por: user?.uid ?? null
    };

    // Otimista: mostra já na UI.
    const optimistic = this.mapItem({ ...novo, id: 'temp_' + Date.now(), criado_em: new Date().toISOString() });
    this.items = [...this.items, optimistic];
    this.listaAtualizada$.next([...this.items]);

    const { error } = await this.db.from('list_items').insert(novo);
    if (error) console.error('❌ Erro ao salvar item:', error.message);

    // Aprende o preço se veio com valor.
    if (novo.valor_unitario > 0) this.precoService.registrar(novo.tarefa, novo.valor_unitario);

    await this.loadItems();

    if (callback) callback();
  }

  async excluir(tarefa: any, callback: (() => void) | null = null) {
    this.items = this.items.filter(i => i.codigo !== tarefa.codigo);
    this.listaAtualizada$.next([...this.items]);

    if (tarefa.id) {
      const { error } = await this.db.from('list_items').delete().eq('id', tarefa.id);
      if (error) console.error('❌ Erro ao excluir item:', error.message);
    }
    await this.loadItems();
    if (callback) callback();
  }

  async atualizar(tarefa: any, callback: (() => void) | null = null) {
    const idx = this.items.findIndex(i => i.codigo === tarefa.codigo);
    if (idx !== -1) {
      this.items[idx] = { ...this.items[idx], ...tarefa };
      this.listaAtualizada$.next([...this.items]);
    }

    if (tarefa.id) {
      const { error } = await this.db.from('list_items').update({
        feito: tarefa.feito,
        valor_unitario: this.toNumber(tarefa.valorUnitario),
        quantidade: this.toNumber(tarefa.quantidade),
        desconto: this.toNumber(tarefa.desconto),
        unidade: normalizarUnidade(tarefa.unidade)
      }).eq('id', tarefa.id);
      if (error) console.error('❌ Erro ao atualizar item:', error.message);
    }

    // Aprende o preço se o item ganhou valor.
    const valor = this.toNumber(tarefa.valorUnitario);
    if (valor > 0 && tarefa.tarefa) this.precoService.registrar(tarefa.tarefa, valor);

    await this.loadItems();
    if (callback) callback();
  }

  /** Move o item para outra categoria. Otimista, com rollback se o banco recusar. */
  async mudarCategoria(tarefa: any, categoria: string): Promise<void> {
    const idx = this.items.findIndex(i => i.codigo === tarefa.codigo);
    const anterior = idx !== -1 ? this.items[idx].categoria : null;

    if (idx !== -1) {
      this.items[idx] = { ...this.items[idx], categoria };
      this.listaAtualizada$.next([...this.items]);
    }

    if (tarefa.id) {
      const { error } = await this.db.from('list_items').update({ categoria }).eq('id', tarefa.id);
      if (error) {
        console.error('❌ Erro ao mudar categoria:', error.message);
        if (idx !== -1) {
          this.items[idx] = { ...this.items[idx], categoria: anterior };
          this.listaAtualizada$.next([...this.items]);
        }
        throw new Error(error.message);
      }
    }

    await this.loadItems();
  }

  async edicao(tarefa: any, callback: (() => void) | null = null) {
    const idx = this.items.findIndex(i => i.codigo === tarefa.codigo);
    if (idx === -1) { if (callback) callback(); return; }

    const item = this.items[idx];
    const patch: any = {};
    if (tarefa.tarefa && tarefa.tarefa.trim() !== '') patch.tarefa = tarefa.tarefa;
    if (tarefa.quantidade != null && tarefa.quantidade !== '') patch.quantidade = this.toNumber(tarefa.quantidade);
    if (tarefa.valorUnitario != null && tarefa.valorUnitario !== '') patch.valor_unitario = this.toNumber(tarefa.valorUnitario);
    if (tarefa.desconto != null && tarefa.desconto !== '') patch.desconto = this.toNumber(tarefa.desconto);
    if (tarefa.unidade) patch.unidade = normalizarUnidade(tarefa.unidade);

    this.items[idx] = {
      ...item,
      tarefa: patch.tarefa ?? item.tarefa,
      quantidade: patch.quantidade ?? item.quantidade,
      valorUnitario: patch.valor_unitario ?? item.valorUnitario,
      desconto: patch.desconto ?? item.desconto,
      unidade: patch.unidade ?? item.unidade
    };
    this.listaAtualizada$.next([...this.items]);

    if (item.id) {
      const { error } = await this.db.from('list_items').update(patch).eq('id', item.id);
      if (error) console.error('❌ Erro ao editar item:', error.message);
    }

    // Aprende o preço se foi editado.
    if (patch.valor_unitario > 0) {
      this.precoService.registrar(patch.tarefa ?? item.tarefa, patch.valor_unitario);
    }

    await this.loadItems();
    if (callback) callback();
  }

  /**
   * Recria itens de uma lista arquivada na lista ativa, todos como pendentes.
   * Devolve quantos foram inseridos. Não mexe no histórico.
   */
  async restaurarItens(itens: ItemCompra[]): Promise<number> {
    if (!this.currentList || itens.length === 0) return 0;

    const user = this.authService.getCurrentUser();
    let proximoCodigo = this.items.reduce((max, i) => Math.max(max, i.codigo || 0), 0);

    const novos = itens.map(item => ({
      list_id: this.currentList!.id,
      codigo: ++proximoCodigo,
      tarefa: item.tarefa,
      quantidade: this.toNumber(item.quantidade),
      valor_unitario: this.toNumber(item.valorUnitario),
      desconto: this.toNumber((item as any).desconto),
      unidade: normalizarUnidade((item as any).unidade),
      feito: false,
      categoria: item.categoria || this.classificarItem(item.tarefa),
      criado_por: user?.uid ?? null
    }));

    const { error } = await this.db.from('list_items').insert(novos);
    if (error) {
      console.error('❌ Erro ao restaurar itens:', error.message);
      throw new Error(error.message);
    }

    await this.loadItems();
    return novos.length;
  }

  async excluirTodos(callback: (() => void) | null = null) {
    if (this.currentList) {
      const { error } = await this.db.from('list_items').delete().eq('list_id', this.currentList.id);
      if (error) console.error('❌ Erro ao excluir todos:', error.message);
    }
    this.items = [];
    this.writeCache([]);
    this.listaAtualizada$.next([]);
    if (callback) callback();
  }

  async arquivarListaAtual(nomeCustomizado?: string, lojaId: string | null = null): Promise<any> {
    const itensParaArquivar: ItemCompra[] = this.items.map(item => ({
      codigo: item.codigo,
      tarefa: item.tarefa,
      quantidade: this.toNumber(item.quantidade),
      valorUnitario: this.toNumber(item.valorUnitario),
      desconto: this.toNumber(item.desconto),
      unidade: normalizarUnidade(item.unidade),
      feito: item.feito,
      categoria: item.categoria || this.classificarItem(item.tarefa)
    }));

    const listaArquivada = await this.historicoService.arquivarListaAtual(
      itensParaArquivar, nomeCustomizado, lojaId
    );
    await this.excluirTodos();
    return listaArquivada;
  }

  // ------------------------------------------------------------------
  // Leitura / cálculos
  // ------------------------------------------------------------------

  listar() {
    this.codMostrar = this.items.some(item => item.tarefa != null);
    return this.items;
  }

  calcularTotalGeral(): number {
    return somarSubtotais(this.items);
  }

  calcularTotalComprado(): number {
    return somarSubtotais(this.items, item => item.feito === true);
  }

  /** Quanto os descontos economizaram na lista inteira. */
  calcularTotalDesconto(): number {
    return totalDescontos(this.items);
  }

  calcularSubtotal(item: any): number {
    return subtotalItem(item);
  }

  isListEmpty(): boolean {
    return this.items.length === 0;
  }

  isListaCompleta(): boolean {
    if (this.items.length === 0) return false;
    return this.items.every(item => item.feito === true);
  }

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  private mapItem(row: any): any {
    return {
      id: row.id,
      codigo: row.codigo,
      tarefa: row.tarefa,
      quantidade: this.toNumber(row.quantidade),
      valorUnitario: this.toNumber(row.valor_unitario ?? row.valorUnitario),
      desconto: this.toNumber(row.desconto),
      unidade: normalizarUnidade(row.unidade),
      feito: row.feito,
      categoria: row.categoria,
      criadoPor: row.criado_por,
      criadoEm: row.criado_em
    };
  }

  private toNumber(v: any): number {
    const n = parseFloat(v);
    return isNaN(n) ? 0 : n;
  }

  private cacheKey(): string {
    return this.currentList ? `${this.STORAGE_KEY}_${this.currentList.id}` : this.STORAGE_KEY;
  }

  private readCache(): any[] {
    try {
      const raw = localStorage.getItem(this.cacheKey());
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeCache(items: any[]): void {
    localStorage.setItem(this.cacheKey(), JSON.stringify(items));
  }

  /** Herda a unidade do catálogo quando o produto digitado é conhecido. */
  private unidadeDoCatalogo(nomeItem: string): string {
    const encontrados = this.catalogoService.buscarProdutos(nomeItem);
    return encontrados.length > 0 ? encontrados[0].unidade : UNIDADE_PADRAO;
  }

  private classificarItem(nomeItem: string): string {
    const produtosEncontrados = this.catalogoService.buscarProdutos(nomeItem);
    if (produtosEncontrados.length > 0) {
      const produto = produtosEncontrados[0];
      const categoria = this.catalogoService.obterCategoriaPorId(produto.categoria);
      if (categoria) return this.categoriaExistente(categoria.nome);
    }

    const item = (nomeItem || '').toLowerCase();
    if (/pão|leite|ovo|queijo|manteiga|iogurte|cream|nata/.test(item)) return this.categoriaExistente('Laticínios & Padaria');
    if (/carne|frango|peixe|linguiça|salsicha|presunto/.test(item)) return this.categoriaExistente('Carnes & Proteínas');
    if (/maçã|banana|laranja|uva|fruta|tomate|alface|cebola|batata/.test(item)) return this.categoriaExistente('Frutas & Verduras');
    if (/arroz|feijão|macarrão|açúcar|sal|óleo|farinha/.test(item)) return this.categoriaExistente('Grãos & Básicos');
    if (/sabonete|shampoo|pasta|escova|papel|detergente|amaciante/.test(item)) return this.categoriaExistente('Higiene Pessoal');
    if (/refrigerante|suco|água|cerveja|vinho|café/.test(item)) return this.categoriaExistente('Bebidas');
    return CATEGORIA_PADRAO_NOME;
  }

  /**
   * Se o usuário renomeou ou excluiu a categoria que a classificação sugere,
   * o palpite não vale mais — o item iria para um grupo que não existe no
   * gerenciador de categorias. Nesse caso cai em "Outros".
   */
  private categoriaExistente(nome: string): string {
    const existe = this.catalogoService.obterCategorias()
      .some(categoria => categoria.nome === nome);
    return existe ? nome : CATEGORIA_PADRAO_NOME;
  }
}
