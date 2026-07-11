import { Injectable } from '@angular/core';
import { HistoricoService, ItemCompra } from './historico.service';
import { CatalogoService } from './catalogo.service';
import { AuthService } from './auth.service';
import { SharedListService, SharedList } from './shared-list.service';
import { SupabaseService } from './supabase.service';
import { BehaviorSubject } from 'rxjs';
import { RealtimeChannel } from '@supabase/supabase-js';

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
    private sharedListService: SharedListService
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
        quantidade: this.toNumber(tarefa.quantidade)
      }).eq('id', tarefa.id);
      if (error) console.error('❌ Erro ao atualizar item:', error.message);
    }
    await this.loadItems();
    if (callback) callback();
  }

  async edicao(tarefa: any, callback: (() => void) | null = null) {
    const idx = this.items.findIndex(i => i.codigo === tarefa.codigo);
    if (idx === -1) { if (callback) callback(); return; }

    const item = this.items[idx];
    const patch: any = {};
    if (tarefa.tarefa && tarefa.tarefa.trim() !== '') patch.tarefa = tarefa.tarefa;
    if (tarefa.quantidade != null && tarefa.quantidade !== '') patch.quantidade = this.toNumber(tarefa.quantidade);
    if (tarefa.valorUnitario != null && tarefa.valorUnitario !== '') patch.valor_unitario = this.toNumber(tarefa.valorUnitario);

    this.items[idx] = {
      ...item,
      tarefa: patch.tarefa ?? item.tarefa,
      quantidade: patch.quantidade ?? item.quantidade,
      valorUnitario: patch.valor_unitario ?? item.valorUnitario
    };
    this.listaAtualizada$.next([...this.items]);

    if (item.id) {
      const { error } = await this.db.from('list_items').update(patch).eq('id', item.id);
      if (error) console.error('❌ Erro ao editar item:', error.message);
    }
    await this.loadItems();
    if (callback) callback();
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

  async arquivarListaAtual(nomeCustomizado?: string): Promise<any> {
    const itensParaArquivar: ItemCompra[] = this.items.map(item => ({
      codigo: item.codigo,
      tarefa: item.tarefa,
      quantidade: this.toNumber(item.quantidade),
      valorUnitario: this.toNumber(item.valorUnitario),
      feito: item.feito,
      categoria: item.categoria || this.classificarItem(item.tarefa)
    }));

    const listaArquivada = await this.historicoService.arquivarListaAtual(itensParaArquivar, nomeCustomizado);
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
    return this.items.reduce((total, item) =>
      total + this.toNumber(item.quantidade) * this.toNumber(item.valorUnitario), 0);
  }

  calcularTotalComprado(): number {
    return this.items
      .filter(item => item.feito === true)
      .reduce((total, item) =>
        total + this.toNumber(item.quantidade) * this.toNumber(item.valorUnitario), 0);
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

  private classificarItem(nomeItem: string): string {
    const produtosEncontrados = this.catalogoService.buscarProdutos(nomeItem);
    if (produtosEncontrados.length > 0) {
      const produto = produtosEncontrados[0];
      const categoria = this.catalogoService.obterCategoriaPorId(produto.categoria);
      return categoria?.nome || 'Outros';
    }

    const item = (nomeItem || '').toLowerCase();
    if (/pão|leite|ovo|queijo|manteiga|iogurte|cream|nata/.test(item)) return 'Laticínios & Padaria';
    if (/carne|frango|peixe|linguiça|salsicha|presunto/.test(item)) return 'Carnes & Proteínas';
    if (/maçã|banana|laranja|uva|fruta|tomate|alface|cebola|batata/.test(item)) return 'Frutas & Verduras';
    if (/arroz|feijão|macarrão|açúcar|sal|óleo|farinha/.test(item)) return 'Grãos & Básicos';
    if (/sabonete|shampoo|pasta|escova|papel|detergente|amaciante/.test(item)) return 'Higiene Pessoal';
    if (/refrigerante|suco|água|cerveja|vinho|café/.test(item)) return 'Bebidas';
    return 'Outros';
  }
}
