import { Injectable } from '@angular/core';
import { ActionSheetController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class TarefaService {
  private readonly STORAGE_KEY = 'tarefaCollection';
  codMostrar: boolean = false;

  constructor(private actionSheetCtrl: ActionSheetController) { }

  async salvar(tarefa: any, callback = null) {
    tarefa.feito = false;
    
    let collection = this.getCollection();
    
    // Gerar próximo código baseado no último item
    if (collection.length > 0) {
      const ultimoItem = collection[collection.length - 1];
      tarefa.codigo = ultimoItem.codigo + 1;
    } else {
      tarefa.codigo = 1; // Primeiro item começa com código 1
    }

    collection.push(tarefa);
    this.saveCollection(collection);

    if (callback != null) {
      callback(); 
    }
  }

  listar() {
    const collection = this.getCollection();
    
    // Verificar se deve mostrar código (só para controle interno se necessário)
    this.codMostrar = collection.some(item => item.tarefa != null);
    
    return collection;
  }

  excluir(tarefa: any, callback = null) {
    let collection = this.getCollection();
    
    const resultCollection = collection.filter(item => 
      item.codigo !== tarefa.codigo // Melhor usar código único para filtrar
    );

    this.saveCollection(resultCollection);

    if (callback != null) {
      callback();
    }
  }

  atualizar(tarefa: any, callback = null) {
    let collection = this.getCollection();
    
    const itemIndex = collection.findIndex(item => item.codigo === tarefa.codigo);
    if (itemIndex !== -1) {
      // collection[itemIndex].feito = tarefa.feito;
      collection[itemIndex] = { ...collection[itemIndex], ...tarefa };
      // Ou se preferir atualizar propriedade por propriedade:
      // collection[itemIndex].feito = tarefa.feito;
      // collection[itemIndex].valorUnitario = tarefa.valorUnitario;
      // collection[itemIndex].tarefa = tarefa.tarefa;
      // collection[itemIndex].quantidade = tarefa.quantidade;

      this.saveCollection(collection);
    }

    if (callback != null) {
      callback();
    }
  }

  edicao(tarefa: any, callback = null) {
    let collection = this.getCollection();
    
    const itemIndex = collection.findIndex(item => item.codigo === tarefa.codigo);
    if (itemIndex !== -1) {
      if (tarefa.tarefa && tarefa.tarefa.trim() !== '') {
        collection[itemIndex].tarefa = tarefa.tarefa;
      }
      
      if (tarefa.quantidade != null && tarefa.quantidade !== '') {
        collection[itemIndex].quantidade = tarefa.quantidade;
      }
      
      if (tarefa.valorUnitario != null && tarefa.valorUnitario !== '') {
        collection[itemIndex].valorUnitario = tarefa.valorUnitario;
      }
      
      this.saveCollection(collection);
    }

    if (callback != null) {
      callback();
    }
  }

  // Método para calcular o total geral
  calcularTotalGeral(): number {
    const collection = this.getCollection();
    return collection.reduce((total, item) => {
      const quantidade = parseFloat(item.quantidade) || 0;
      const valorUnitario = parseFloat(item.valorUnitario) || 0;
      return total + (quantidade * valorUnitario);
    }, 0);
  }

  // Método para calcular total dos itens comprados
  calcularTotalComprado(): number {
    const collection = this.getCollection();
    return collection
      .filter(item => item.feito === true)
      .reduce((total, item) => {
        const quantidade = parseFloat(item.quantidade) || 0;
        const valorUnitario = parseFloat(item.valorUnitario) || 0;
        return total + (quantidade * valorUnitario);
      }, 0);
  }

  // Método para calcular total dos itens pendentes
  // calcularTotalPendente(): number {
  //   const collection = this.getCollection();
  //   return collection
  //     .filter(item => item.feito === false)
  //     .reduce((total, item) => {
  //       const quantidade = parseFloat(item.quantidade) || 0;
  //       const valorUnitario = parseFloat(item.valorUnitario) || 0;
  //       return total + (quantidade * valorUnitario);
  //     }, 0);
  // }

  excluirTodos(callback = null) {
    this.saveCollection([]); // Simplesmente limpa o array

    if (callback != null) {
      callback();
    }
  }

  // Remove método setArray - não é mais necessário
  
  // Métodos auxiliares privados
  private getCollection(): any[] {
    const value = localStorage.getItem(this.STORAGE_KEY);
    
    if (value == null || value == undefined) {
      return [];
    }
    
    try {
      const collection = JSON.parse(value);
      return Array.isArray(collection) ? collection : [];
    } catch (error) {
      console.error('Erro ao parsear dados do localStorage:', error);
      return [];
    }
  }

  private saveCollection(collection: any[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(collection));
  }

  // Método para verificar se a lista está vazia (para uso no template)
  isListEmpty(): boolean {
    return this.getCollection().length === 0;
  }
}