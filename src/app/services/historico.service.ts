import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

export interface ItemCompra {
  codigo: number;
  tarefa: string;
  quantidade: number;
  valorUnitario: number;
  feito: boolean;
  dataCompra?: string | null;
  categoria?: string;
}

export interface ListaCompra {
  id: string;
  nome: string;
  dataInicio: string;
  dataFinalizacao: string;
  itens: ItemCompra[];
  totalGasto: number;
  totalItens: number;
  percentualConcluido: number;
}

export interface ResumoMensal {
  mes: string;
  ano: number;
  totalGasto: number;
  totalListas: number;
  totalItens: number;
  mediaGastoPorLista: number;
  listas: ListaCompra[];
  categorias: { [key: string]: number };
}

@Injectable({
  providedIn: 'root'
})
export class HistoricoService {

  /** Cache em memória, reconstruído a partir do Supabase em `carregar()`. */
  private meses: { [key: string]: ResumoMensal } = {};
  private listasArquivadas: ListaCompra[] = [];

  constructor(
    private authService: AuthService,
    private supabaseService: SupabaseService
  ) {}

  private get db() {
    return this.supabaseService.client;
  }

  /** Busca o histórico do usuário no Supabase e reconstrói os resumos mensais. */
  async carregar(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user || !this.supabaseService.isConfigured) {
      this.meses = {};
      this.listasArquivadas = [];
      return;
    }

    const { data, error } = await this.db
      .from('archived_lists')
      .select('*')
      .eq('user_id', user.uid)
      .order('data_finalizacao', { ascending: false });

    if (error) {
      console.error('❌ Erro ao carregar histórico:', error.message);
      return;
    }

    this.listasArquivadas = (data || []).map(row => this.mapArquivada(row));
    this.reconstruirMeses();
  }

  /** Arquiva a lista atual (grava no Supabase e atualiza o cache). */
  async arquivarListaAtual(itens: ItemCompra[], nomeCustomizado?: string): Promise<ListaCompra> {
    const user = this.authService.getCurrentUser();
    const agora = new Date();

    const itensClassificados = itens.map(item => ({
      ...item,
      dataCompra: item.feito ? agora.toISOString() : null,
      categoria: item.categoria || this.classificarItem(item.tarefa)
    }));

    const categorias = this.calcularCategorias(itensClassificados);

    const lista: ListaCompra = {
      id: this.gerarIdLista(),
      nome: nomeCustomizado || `Lista ${this.formatarData(agora)}`,
      dataInicio: this.obterDataInicioEstimada(itens),
      dataFinalizacao: agora.toISOString(),
      itens: itensClassificados,
      totalGasto: this.calcularTotalLista(itens),
      totalItens: itens.length,
      percentualConcluido: this.calcularPercentualConcluido(itens)
    };

    if (user && this.supabaseService.isConfigured) {
      const { data, error } = await this.db.from('archived_lists').insert({
        user_id: user.uid,
        nome: lista.nome,
        data_inicio: lista.dataInicio,
        data_finalizacao: lista.dataFinalizacao,
        total_gasto: lista.totalGasto,
        total_itens: lista.totalItens,
        percentual_concluido: lista.percentualConcluido,
        itens: lista.itens,
        categorias
      }).select().single();

      if (error) {
        console.error('❌ Erro ao arquivar lista:', error.message);
      } else if (data) {
        lista.id = data.id;
      }
    }

    this.listasArquivadas.unshift(lista);
    this.reconstruirMeses();
    return lista;
  }

  obterMesesDisponiveis(): Array<{ mes: number, ano: number, resumo: ResumoMensal }> {
    return Object.keys(this.meses)
      .map(chave => {
        const [ano, mes] = chave.split('-');
        return { mes: parseInt(mes), ano: parseInt(ano), resumo: this.meses[chave] };
      })
      .sort((a, b) => (a.ano !== b.ano ? b.ano - a.ano : b.mes - a.mes));
  }

  obterEstatisticasGerais(): any {
    const meses = this.obterMesesDisponiveis();

    if (meses.length === 0) {
      return {
        totalGastoGeral: 0,
        totalListasGeral: 0,
        mediaGastoMensal: 0,
        mesDeManiorGasto: null,
        categoriaMaisComprada: null,
        totalCategorias: {}
      };
    }

    const totalGasto = meses.reduce((sum, m) => sum + m.resumo.totalGasto, 0);
    const totalListas = meses.reduce((sum, m) => sum + m.resumo.totalListas, 0);

    const mesComMaiorGasto = meses.reduce((max, atual) =>
      atual.resumo.totalGasto > max.resumo.totalGasto ? atual : max);

    const todasCategorias: { [key: string]: number } = {};
    meses.forEach(m => {
      Object.keys(m.resumo.categorias).forEach(cat => {
        todasCategorias[cat] = (todasCategorias[cat] || 0) + m.resumo.categorias[cat];
      });
    });

    const categoriaMaisComprada = Object.keys(todasCategorias).length > 0
      ? Object.keys(todasCategorias).reduce((a, b) => todasCategorias[a] > todasCategorias[b] ? a : b)
      : null;

    return {
      totalGastoGeral: totalGasto,
      totalListasGeral: totalListas,
      mediaGastoMensal: totalGasto / meses.length,
      mesDeManiorGasto: mesComMaiorGasto,
      categoriaMaisComprada,
      totalCategorias: todasCategorias
    };
  }

  exportarDados(formato: 'json' | 'csv' = 'json'): string {
    const dados = {
      historico: this.meses,
      listas: this.listasArquivadas,
      estatisticas: this.obterEstatisticasGerais(),
      dataExportacao: new Date().toISOString()
    };

    if (formato === 'json') {
      return JSON.stringify(dados, null, 2);
    }
    return this.converterParaCSV(dados);
  }

  // ---- internos ----

  private reconstruirMeses(): void {
    this.meses = {};
    for (const lista of this.listasArquivadas) {
      const data = new Date(lista.dataFinalizacao);
      const chave = `${data.getFullYear()}-${(data.getMonth() + 1).toString().padStart(2, '0')}`;

      if (!this.meses[chave]) {
        this.meses[chave] = {
          mes: this.obterNomeMes(data.getMonth()),
          ano: data.getFullYear(),
          totalGasto: 0,
          totalListas: 0,
          totalItens: 0,
          mediaGastoPorLista: 0,
          listas: [],
          categorias: {}
        };
      }

      const resumo = this.meses[chave];
      resumo.listas.push(lista);
      resumo.totalGasto += lista.totalGasto;
      resumo.totalListas += 1;
      resumo.totalItens += lista.totalItens;
      resumo.mediaGastoPorLista = resumo.totalGasto / resumo.totalListas;

      const categorias = this.calcularCategorias(lista.itens);
      Object.keys(categorias).forEach(cat => {
        resumo.categorias[cat] = (resumo.categorias[cat] || 0) + categorias[cat];
      });
    }
  }

  private mapArquivada(row: any): ListaCompra {
    return {
      id: row.id,
      nome: row.nome,
      dataInicio: row.data_inicio,
      dataFinalizacao: row.data_finalizacao,
      itens: Array.isArray(row.itens) ? row.itens : [],
      totalGasto: Number(row.total_gasto) || 0,
      totalItens: row.total_itens || 0,
      percentualConcluido: row.percentual_concluido || 0
    };
  }

  private calcularCategorias(itens: ItemCompra[]): { [key: string]: number } {
    const categorias: { [key: string]: number } = {};
    itens.forEach(item => {
      const categoria = item.categoria || 'Outros';
      const valor = (parseFloat(item.quantidade?.toString()) || 0) *
                    (parseFloat(item.valorUnitario?.toString()) || 0);
      categorias[categoria] = (categorias[categoria] || 0) + valor;
    });
    return categorias;
  }

  private gerarIdLista(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private formatarData(data: Date): string {
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private obterDataInicioEstimada(itens: ItemCompra[]): string {
    const agora = new Date();
    agora.setDate(agora.getDate() - Math.min(7, itens.length));
    return agora.toISOString();
  }

  private classificarItem(nomeItem: string): string {
    const item = (nomeItem || '').toLowerCase();
    if (/pão|leite|ovo|queijo|manteiga|iogurte|cream|nata/.test(item)) return 'Laticínios & Padaria';
    if (/carne|frango|peixe|linguiça|salsicha|presunto/.test(item)) return 'Carnes & Proteínas';
    if (/maçã|banana|laranja|uva|fruta|tomate|alface|cebola|batata/.test(item)) return 'Frutas & Verduras';
    if (/arroz|feijão|macarrão|açúcar|sal|óleo|farinha/.test(item)) return 'Grãos & Básicos';
    if (/sabonete|shampoo|pasta|escova|papel|detergente|amaciante/.test(item)) return 'Higiene & Limpeza';
    if (/refrigerante|suco|água|cerveja|vinho|café/.test(item)) return 'Bebidas';
    return 'Outros';
  }

  private calcularTotalLista(itens: ItemCompra[]): number {
    return itens.reduce((total, item) => {
      const quantidade = parseFloat(item.quantidade?.toString()) || 0;
      const valor = parseFloat(item.valorUnitario?.toString()) || 0;
      return total + (quantidade * valor);
    }, 0);
  }

  private calcularPercentualConcluido(itens: ItemCompra[]): number {
    if (itens.length === 0) return 0;
    const concluidos = itens.filter(item => item.feito).length;
    return Math.round((concluidos / itens.length) * 100);
  }

  private obterNomeMes(numeroMes: number): string {
    const nomes = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return nomes[numeroMes];
  }

  private converterParaCSV(dados: any): string {
    let csv = 'Lista,Data,Item,Quantidade,Valor Unitário,Total,Categoria,Status\n';
    Object.values(dados.historico).forEach((mes: any) => {
      mes.listas.forEach((lista: ListaCompra) => {
        lista.itens.forEach(item => {
          const total = (parseFloat(item.quantidade?.toString()) || 0) *
                        (parseFloat(item.valorUnitario?.toString()) || 0);
          csv += `"${lista.nome}","${lista.dataFinalizacao}","${item.tarefa}",${item.quantidade},${item.valorUnitario},${total},"${item.categoria}","${item.feito ? 'Comprado' : 'Pendente'}"\n`;
        });
      });
    });
    return csv;
  }
}
