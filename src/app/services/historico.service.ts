import { Injectable } from '@angular/core';

export interface ItemCompra {
  codigo: number;
  tarefa: string;
  quantidade: number;
  valorUnitario: number;
  feito: boolean;
  dataCompra?: string;
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

  private readonly HISTORICO_KEY = 'historicoCompras';
  private readonly LISTAS_ARQUIVADAS_KEY = 'listasArquivadas';

  constructor() {}

  // Arquivar lista atual
  arquivarListaAtual(itens: ItemCompra[], nomeCustomizado?: string): ListaCompra {
    const agora = new Date();
    const lista: ListaCompra = {
      id: this.gerarIdLista(),
      nome: nomeCustomizado || `Lista ${this.formatarData(agora)}`,
      dataInicio: this.obterDataInicioEstimada(itens),
      dataFinalizacao: agora.toISOString(),
      itens: itens.map(item => ({
        ...item,
        dataCompra: item.feito ? agora.toISOString() : null,
        categoria: this.classificarItem(item.tarefa)
      })),
      totalGasto: this.calcularTotalLista(itens),
      totalItens: itens.length,
      percentualConcluido: this.calcularPercentualConcluido(itens)
    };

    this.salvarListaArquivada(lista);
    this.atualizarResumoMensal(lista);
    
    return lista;
  }

  // Buscar histórico mensal
  obterHistoricoMensal(mes: number, ano: number): ResumoMensal | null {
    const historico = this.obterHistoricoCompleto();
    const chave = `${ano}-${mes.toString().padStart(2, '0')}`;
    return historico[chave] || null;
  }

  // Obter todos os meses com dados
  obterMesesDisponiveis(): Array<{mes: number, ano: number, resumo: ResumoMensal}> {
    const historico = this.obterHistoricoCompleto();
    return Object.keys(historico)
      .map(chave => {
        const [ano, mes] = chave.split('-');
        return {
          mes: parseInt(mes),
          ano: parseInt(ano),
          resumo: historico[chave]
        };
      })
      .sort((a, b) => {
        if (a.ano !== b.ano) return b.ano - a.ano;
        return b.mes - a.mes;
      });
  }

  // Obter estatísticas gerais
  obterEstatisticasGerais(): any {
    const meses = this.obterMesesDisponiveis();
    
    if (meses.length === 0) {
      return {
        totalGastoGeral: 0,
        totalListasGeral: 0,
        mediaGastoMensal: 0,
        mesDeManiorGasto: null,
        categoriaMaisComprada: null
      };
    }

    const totalGasto = meses.reduce((sum, m) => sum + m.resumo.totalGasto, 0);
    const totalListas = meses.reduce((sum, m) => sum + m.resumo.totalListas, 0);
    
    // Mês de maior gasto
    const mesComMaiorGasto = meses.reduce((max, atual) => 
      atual.resumo.totalGasto > max.resumo.totalGasto ? atual : max
    );

    // Categoria mais comprada
    const todasCategorias = {};
    meses.forEach(m => {
      Object.keys(m.resumo.categorias).forEach(cat => {
        todasCategorias[cat] = (todasCategorias[cat] || 0) + m.resumo.categorias[cat];
      });
    });

    const categoriaMaisComprada = Object.keys(todasCategorias).length > 0 
      ? Object.keys(todasCategorias).reduce((a, b) => 
          todasCategorias[a] > todasCategorias[b] ? a : b
        ) 
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

  // Exportar dados
  exportarDados(formato: 'json' | 'csv' = 'json'): string {
    const dados = {
      historico: this.obterHistoricoCompleto(),
      listas: this.obterListasArquivadas(),
      estatisticas: this.obterEstatisticasGerais(),
      dataExportacao: new Date().toISOString()
    };

    if (formato === 'json') {
      return JSON.stringify(dados, null, 2);
    } else {
      return this.converterParaCSV(dados);
    }
  }

  // Limpar dados antigos (opcional)
  limparDadosAntigos(mesesParaManter: number = 12): void {
    const meses = this.obterMesesDisponiveis();
    const mesesParaRemover = meses.slice(mesesParaManter);
    
    const historico = this.obterHistoricoCompleto();
    mesesParaRemover.forEach(m => {
      const chave = `${m.ano}-${m.mes.toString().padStart(2, '0')}`;
      delete historico[chave];
    });
    
    localStorage.setItem(this.HISTORICO_KEY, JSON.stringify(historico));
  }

  // Métodos privados
  private gerarIdLista(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private formatarData(data: Date): string {
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  private obterDataInicioEstimada(itens: ItemCompra[]): string {
    // Estima que a lista foi iniciada há alguns dias
    const agora = new Date();
    agora.setDate(agora.getDate() - Math.min(7, itens.length));
    return agora.toISOString();
  }

  private classificarItem(nomeItem: string): string {
    const item = nomeItem.toLowerCase();
    
    if (/pão|leite|ovo|queijo|manteiga|iogurte|cream|nata/.test(item)) {
      return 'Laticínios & Padaria';
    }
    if (/carne|frango|peixe|linguiça|salsicha|presunto/.test(item)) {
      return 'Carnes & Proteínas';
    }
    if (/maçã|banana|laranja|uva|fruta|tomate|alface|cebola|batata/.test(item)) {
      return 'Frutas & Verduras';
    }
    if (/arroz|feijão|macarrão|açúcar|sal|óleo|farinha/.test(item)) {
      return 'Grãos & Básicos';
    }
    if (/sabonete|shampoo|pasta|escova|papel|detergente|amaciante/.test(item)) {
      return 'Higiene & Limpeza';
    }
    if (/refrigerante|suco|água|cerveja|vinho|café/.test(item)) {
      return 'Bebidas';
    }
    
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

  private salvarListaArquivada(lista: ListaCompra): void {
    const listas = this.obterListasArquivadas();
    listas.push(lista);
    localStorage.setItem(this.LISTAS_ARQUIVADAS_KEY, JSON.stringify(listas));
  }

  private obterListasArquivadas(): ListaCompra[] {
    const dados = localStorage.getItem(this.LISTAS_ARQUIVADAS_KEY);
    return dados ? JSON.parse(dados) : [];
  }

  private atualizarResumoMensal(lista: ListaCompra): void {
    const data = new Date(lista.dataFinalizacao);
    const chave = `${data.getFullYear()}-${(data.getMonth() + 1).toString().padStart(2, '0')}`;
    
    const historico = this.obterHistoricoCompleto();
    
    if (!historico[chave]) {
      historico[chave] = {
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

    const resumo = historico[chave];
    resumo.listas.push(lista);
    resumo.totalGasto += lista.totalGasto;
    resumo.totalListas += 1;
    resumo.totalItens += lista.totalItens;
    resumo.mediaGastoPorLista = resumo.totalGasto / resumo.totalListas;

    // Atualizar categorias
    lista.itens.forEach(item => {
      const categoria = item.categoria || 'Outros';
      const valor = (parseFloat(item.quantidade?.toString()) || 0) * 
                   (parseFloat(item.valorUnitario?.toString()) || 0);
      resumo.categorias[categoria] = (resumo.categorias[categoria] || 0) + valor;
    });

    localStorage.setItem(this.HISTORICO_KEY, JSON.stringify(historico));
  }

  private obterHistoricoCompleto(): { [key: string]: ResumoMensal } {
    const dados = localStorage.getItem(this.HISTORICO_KEY);
    return dados ? JSON.parse(dados) : {};
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
