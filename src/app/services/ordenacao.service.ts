import { Injectable } from '@angular/core';

export type ModoOrdenacao = 'categoria' | 'nome' | 'pendentes' | 'comprados';

export interface GrupoItens {
  categoria: string;
  itens: any[];
}

/** Modos na ordem em que aparecem no seletor da home. */
export const MODOS_ORDENACAO: ReadonlyArray<{ valor: ModoOrdenacao; rotulo: string; icone: string }> = [
  { valor: 'categoria', rotulo: 'Por categoria', icone: 'grid-outline' },
  { valor: 'nome', rotulo: 'Nome (A-Z)', icone: 'text-outline' },
  { valor: 'pendentes', rotulo: 'Faltando primeiro', icone: 'ellipse-outline' },
  { valor: 'comprados', rotulo: 'No carrinho primeiro', icone: 'checkmark-circle-outline' }
];

const MODO_PADRAO: ModoOrdenacao = 'categoria';

/**
 * Ordenação da lista. É só visualização: nunca reescreve `codigo`,
 * que continua sendo a ordem de inserção guardada no banco.
 */
@Injectable({
  providedIn: 'root'
})
export class OrdenacaoService {
  private readonly STORAGE_KEY = 'ordenacaoLista';

  obterModo(): ModoOrdenacao {
    const salvo = localStorage.getItem(this.STORAGE_KEY);
    return MODOS_ORDENACAO.some(m => m.valor === salvo) ? (salvo as ModoOrdenacao) : MODO_PADRAO;
  }

  definirModo(modo: ModoOrdenacao): void {
    localStorage.setItem(this.STORAGE_KEY, modo);
  }

  rotulo(modo: ModoOrdenacao): string {
    return MODOS_ORDENACAO.find(m => m.valor === modo)?.rotulo ?? '';
  }

  icone(modo: ModoOrdenacao): string {
    return MODOS_ORDENACAO.find(m => m.valor === modo)?.icone ?? 'swap-vertical-outline';
  }

  /**
   * Devolve os itens prontos para o template. No modo `categoria` sai um grupo
   * por categoria; nos demais sai um único grupo com `categoria: ''`, que o
   * template usa como sinal para esconder o cabeçalho.
   */
  agrupar(itens: any[], modo: ModoOrdenacao): GrupoItens[] {
    if (itens.length === 0) return [];

    if (modo === 'categoria') return this.agruparPorCategoria(itens);

    return [{ categoria: '', itens: this.ordenarPlano(itens, modo) }];
  }

  private agruparPorCategoria(itens: any[]): GrupoItens[] {
    const grupos = new Map<string, any[]>();

    for (const item of itens) {
      const categoria = item.categoria || 'Outros';
      if (!grupos.has(categoria)) grupos.set(categoria, []);
      grupos.get(categoria)!.push(item);
    }

    return Array.from(grupos.entries())
      .map(([categoria, itensDoGrupo]) => ({
        categoria,
        // Pendentes primeiro; comprados descem para o fim do grupo.
        itens: [...itensDoGrupo].sort((a, b) => this.porFeito(a, b, false))
      }))
      .sort((a, b) => a.categoria.localeCompare(b.categoria, 'pt-BR'));
  }

  private ordenarPlano(itens: any[], modo: ModoOrdenacao): any[] {
    const copia = [...itens];

    if (modo === 'nome') {
      return copia.sort((a, b) => this.porNome(a, b));
    }

    const comprarosPrimeiro = modo === 'comprados';
    return copia.sort((a, b) => {
      const porStatus = this.porFeito(a, b, comprarosPrimeiro);
      return porStatus !== 0 ? porStatus : this.porNome(a, b);
    });
  }

  private porNome(a: any, b: any): number {
    return (a.tarefa || '').localeCompare(b.tarefa || '', 'pt-BR');
  }

  private porFeito(a: any, b: any, feitoPrimeiro: boolean): number {
    if (a.feito === b.feito) return 0;
    const aVemAntes = feitoPrimeiro ? a.feito : !a.feito;
    return aVemAntes ? -1 : 1;
  }
}
