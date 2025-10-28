import { Injectable } from '@angular/core';
import { HistoricoService, ItemCompra } from './historico.service';
import { CatalogoService } from './catalogo.service';

import { Firestore, collection, addDoc, collectionData, doc, deleteDoc, updateDoc, query, orderBy, onSnapshot, writeBatch } from '@angular/fire/firestore';
import { Observable, Subscription } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TarefaService {
  private readonly STORAGE_KEY = 'tarefaCollection';
  private readonly FIREBASE_COLLECTION = 'listaCompras';
  codMostrar: boolean = false;

  private firestoreSubscription?: Subscription;
  private isUpdatingFromFirestore = false; // Flag para evitar loop infinito

  constructor(
    private historicoService: HistoricoService,
    private catalogoService: CatalogoService,
    private firestore: Firestore
  ) { 
    this.iniciarSincronizacao();
  }

  private iniciarSincronizacao() {
    const listaRef = collection(this.firestore, this.FIREBASE_COLLECTION);
    const q = query(listaRef, orderBy('codigo', 'asc'));

    // Escuta mudanças no Firestore
    onSnapshot(q, (snapshot) => {
      if (this.isUpdatingFromFirestore) return; // Evita loop

      const itensFirestore = snapshot.docs.map(doc => ({
        firebaseId: doc.id,
        ...doc.data()
      }));

      // Se houver diferença, atualiza localStorage
      const localCollection = this.getCollection();
      if (JSON.stringify(itensFirestore) !== JSON.stringify(localCollection)) {
        this.isUpdatingFromFirestore = true;
        this.saveCollection(itensFirestore);
        this.isUpdatingFromFirestore = false;
        console.log('✅ Lista sincronizada do Firebase');
      }
    });
  }


  async salvar(tarefa: any, callback = null) {
    tarefa.feito = false;
    
    let collections = this.getCollection();
    
    // Gerar próximo código baseado no último item
    if (collections.length > 0) {
      const ultimoItem = collections[collections.length - 1];
      tarefa.codigo = ultimoItem.codigo + 1;
    } else {
      tarefa.codigo = 1; // Primeiro item começa com código 1
    }

    tarefa.criadoEm = new Date().toISOString();

    collections.push(tarefa);
    this.saveCollection(collections);

    try {
      const listaRef = collection(this.firestore, this.FIREBASE_COLLECTION);
      const docRef = await addDoc(listaRef, tarefa);
      
      // Atualiza com o ID do Firebase
      tarefa.firebaseId = docRef.id;
      const index = collections.findIndex(item => item.codigo === tarefa.codigo);
      if (index !== -1) {
        collection[index] = tarefa;
        this.saveCollection(collections);
      }
      
      console.log('✅ Item salvo no Firebase:', docRef.id);
    } catch (error) {
      console.error('❌ Erro ao salvar no Firebase:', error);
      // Continua funcionando offline
    }
    

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

    if (tarefa.firebaseId) {
      try {
        const docRef = doc(this.firestore, this.FIREBASE_COLLECTION, tarefa.firebaseId);
        deleteDoc(docRef);
        console.log('✅ Item excluído do Firebase');
      } catch (error) {
        console.error('❌ Erro ao excluir do Firebase:', error);
      }
    }

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

    // Atualizar no Firestore
      if (tarefa.firebaseId) {
        try {
          const docRef = doc(this.firestore, this.FIREBASE_COLLECTION, tarefa.firebaseId);
          updateDoc(docRef, {
            feito: tarefa.feito,
            valorUnitario: tarefa.valorUnitario,
            quantidade: tarefa.quantidade,
            atualizadoEm: new Date().toISOString()
          });
          console.log('✅ Item atualizado no Firebase');
        } catch (error) {
          console.error('❌ Erro ao atualizar no Firebase:', error);
        }
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

  async excluirTodos(callback = null) {

    const collection = this.getCollection();
    await this.excluirTodosDoFirebase(collection);

    this.saveCollection([]);

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

  // Método para verificar se todos os itens foram comprados
  isListaCompleta(): boolean {
    const collection = this.getCollection();
    if (collection.length === 0) return false;
    return collection.every(item => item.feito === true);
  }

  // Método para arquivar a lista atual no histórico
  async arquivarListaAtual(nomeCustomizado?: string): Promise<any> {
    const collection = this.getCollection();
    const itensParaArquivar: ItemCompra[] = collection.map(item => ({
      codigo: item.codigo,
      tarefa: item.tarefa,
      quantidade: parseFloat(item.quantidade) || 0,
      valorUnitario: parseFloat(item.valorUnitario) || 0,
      feito: item.feito,
      categoria: this.classificarItem(item.tarefa)
    }));

    const listaArquivada = this.historicoService.arquivarListaAtual(itensParaArquivar, nomeCustomizado);
    
    await this.excluirTodosDoFirebase(collection);
    
    this.saveCollection([]);
    
    return listaArquivada;
  }

  private async excluirTodosDoFirebase(itens: any[]): Promise<void> {
    if (itens.length === 0) return;
  
    try {
      this.isUpdatingFromFirestore = true;
  
      const batch = writeBatch(this.firestore);
      
      itens.forEach(item => {
        if (item.firebaseId) {
          const docRef = doc(this.firestore, this.FIREBASE_COLLECTION, item.firebaseId);
          batch.delete(docRef);
        }
      });
  
      await batch.commit();
      console.log('✅ Todos os itens excluídos do Firebase ao arquivar');
      
      // Aguarda um pouco antes de liberar a flag
      setTimeout(() => {
        this.isUpdatingFromFirestore = false;
      }, 500);
      
    } catch (error) {
      console.error('❌ Erro ao excluir itens do Firebase:', error);
      this.isUpdatingFromFirestore = false;
      throw error;
    }
  }
  

  // Método auxiliar para classificar itens usando o catálogo
  private classificarItem(nomeItem: string): string {
    // Primeiro, tenta encontrar no catálogo
    const produtosEncontrados = this.catalogoService.buscarProdutos(nomeItem);
    if (produtosEncontrados.length > 0) {
      const produto = produtosEncontrados[0];
      const categoria = this.catalogoService.obterCategoriaPorId(produto.categoria);
      return categoria?.nome || 'Outros';
    }
    
    // Se não encontrar no catálogo, usa classificação manual
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
      return 'Higiene Pessoal';
    }
    if (/refrigerante|suco|água|cerveja|vinho|café/.test(item)) {
      return 'Bebidas';
    }
    
    return 'Outros';
  }
}