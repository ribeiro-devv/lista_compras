import { Injectable } from '@angular/core';
import { HistoricoService, ItemCompra } from './historico.service';
import { CatalogoService } from './catalogo.service';
import { AuthService } from './auth.service';
import { SharedListService } from './shared-list.service';

import { Firestore, collection, addDoc, collectionData, doc, deleteDoc, updateDoc, query, orderBy, onSnapshot, writeBatch, where } from '@angular/fire/firestore';
import { Observable, Subscription, BehaviorSubject } from 'rxjs';
import { Unsubscribe } from 'firebase/auth';

@Injectable({
  providedIn: 'root'
})
export class TarefaService {
  private readonly STORAGE_KEY = 'tarefaCollection';
  private readonly FIREBASE_COLLECTION = 'listaCompras';
  codMostrar: boolean = false;

  private firestoreSubscription?: Unsubscribe;
  private isUpdatingFromFirestore = false;

  private listaAtualizada$ = new BehaviorSubject<any[]>([]);
  public lista$ = this.listaAtualizada$.asObservable();

  constructor(
    private historicoService: HistoricoService,
    private catalogoService: CatalogoService,
    private firestore: Firestore,
    private authService: AuthService,
    private sharedListService: SharedListService
  ) { 
    this.sharedListService.loadCurrentList();
    
    this.sharedListService.currentList$.subscribe(() => {
      this.iniciarSincronizacao();
      this.clearLocalCollection();
      
      // 🔧 FIX: Emitir lista atual ao trocar
      const lista = this.getCollection();
      this.listaAtualizada$.next(lista);
    });
    
    this.iniciarSincronizacao();
  }

  private iniciarSincronizacao() {
    if (this.firestoreSubscription) {
      this.firestoreSubscription();
    }

    const currentList = this.sharedListService.getCurrentList();
    if (!currentList) {
      console.warn('⚠️ Nenhuma lista selecionada');
      this.listaAtualizada$.next([]);
      return;
    }

    // 🔧 FIX: Se for lista pessoal, não sincronizar com Firebase
    if (this.sharedListService.isPersonalList(currentList)) {
      console.log('✅ Lista pessoal - modo offline');
      const lista = this.getCollection();
      this.listaAtualizada$.next(lista);
      return;
    }

    // Lista compartilhada - sincronizar com Firebase
    const user = this.authService.getCurrentUser();
    if (!user) {
      console.warn('⚠️ Usuário não autenticado');
      this.listaAtualizada$.next([]);
      return;
    }

    if (!this.sharedListService.userHasAccess(currentList, user.uid)) {
      console.warn('⚠️ Você não tem acesso a esta lista');
      this.listaAtualizada$.next([]);
      return;
    }

    const listaRef = collection(this.firestore, this.FIREBASE_COLLECTION);
    
    const q = query(
      listaRef, 
      where('listaId', '==', currentList.id),
      orderBy('codigo', 'asc')
    );

    this.firestoreSubscription = onSnapshot(q, (snapshot) => {
      if (this.isUpdatingFromFirestore) return;

      const itensFirestore = snapshot.docs.map(doc => ({
        firebaseId: doc.id,
        ...doc.data()
      }));

      this.isUpdatingFromFirestore = true;
      this.saveCollection(itensFirestore);
      this.listaAtualizada$.next(itensFirestore);
      this.isUpdatingFromFirestore = false;
      
      console.log('✅ Lista compartilhada sincronizada:', itensFirestore.length, 'itens');
    }, (error) => {
      console.error('❌ Erro ao sincronizar lista:', error);
      
      if (error.code === 'failed-precondition') {
        console.error('⚠️ ERRO DE ÍNDICE: Crie um índice composto no Firestore');
        console.error('   Collection: listaCompras');
        console.error('   Fields: listaId (Ascending), codigo (Ascending)');
      }
    });
  }

  async salvar(tarefa: any, callback = null) {
    const currentList = this.sharedListService.getCurrentList();
    
    if (!currentList) {
      throw new Error('Nenhuma lista selecionada');
    }
    
    let collections = this.getCollection();
    
    if (collections.length > 0) {
      const ultimoItem = collections[collections.length - 1];
      tarefa.codigo = ultimoItem.codigo + 1;
    } else {
      tarefa.codigo = 1;
    }

    tarefa.listaId = currentList.id;
    
    // 🔧 FIX: Adicionar dados do usuário apenas se estiver autenticado
    const user = this.authService.getCurrentUser();
    if (user) {
      tarefa.criadoPor = user.uid;
    }
    tarefa.criadoEm = new Date().toISOString();

    collections.push(tarefa);
    this.saveCollection(collections);
    this.listaAtualizada$.next([...collections]);

    // 🔧 FIX: Sincronizar com Firebase apenas se for lista compartilhada
    if (!this.sharedListService.isPersonalList(currentList)) {
      if (!user) {
        console.warn('⚠️ Usuário não autenticado - item não será sincronizado');
      } else if (!this.sharedListService.userHasAccess(currentList, user.uid)) {
        throw new Error('Você não tem permissão para adicionar itens nesta lista');
      } else {
        try {
          const listaRef = collection(this.firestore, this.FIREBASE_COLLECTION);
          const docRef = await addDoc(listaRef, tarefa);
          
          tarefa.firebaseId = docRef.id;
          const index = collections.findIndex(item => item.codigo === tarefa.codigo);
          if (index !== -1) {
            collections[index] = tarefa;
            this.saveCollection(collections);
            this.listaAtualizada$.next([...collections]);
          }
          
          console.log('✅ Item salvo no Firebase:', docRef.id);
        } catch (error) {
          console.error('❌ Erro ao salvar no Firebase:', error);
        }
      }
    } else {
      console.log('✅ Item salvo localmente (lista pessoal)');
    }

    if (callback != null) {
      callback(); 
    }
  }

  listar() {
    const collection = this.getCollection();
    this.codMostrar = collection.some(item => item.tarefa != null);
    return collection;
  }

  excluir(tarefa: any, callback = null) {
    let collection = this.getCollection();
    
    const resultCollection = collection.filter(item => 
      item.codigo !== tarefa.codigo
    );

    this.saveCollection(resultCollection);
    this.listaAtualizada$.next([...resultCollection]);

    // 🔧 FIX: Excluir do Firebase apenas se for lista compartilhada
    const currentList = this.sharedListService.getCurrentList();
    if (currentList && !this.sharedListService.isPersonalList(currentList) && tarefa.firebaseId) {
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
      collection[itemIndex] = { ...collection[itemIndex], ...tarefa };
      this.saveCollection(collection);
      this.listaAtualizada$.next([...collection]);
    }

    // 🔧 FIX: Atualizar no Firebase apenas se for lista compartilhada
    const currentList = this.sharedListService.getCurrentList();
    if (currentList && !this.sharedListService.isPersonalList(currentList) && tarefa.firebaseId) {
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
      this.listaAtualizada$.next([...collection]);
    }

    if (callback != null) {
      callback();
    }
  }

  calcularTotalGeral(): number {
    const collection = this.getCollection();
    return collection.reduce((total, item) => {
      const quantidade = parseFloat(item.quantidade) || 0;
      const valorUnitario = parseFloat(item.valorUnitario) || 0;
      return total + (quantidade * valorUnitario);
    }, 0);
  }

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

  async excluirTodos(callback = null) {
    const collection = this.getCollection();
    
    // 🔧 FIX: Excluir do Firebase apenas se for lista compartilhada
    const currentList = this.sharedListService.getCurrentList();
    if (currentList && !this.sharedListService.isPersonalList(currentList)) {
      await this.excluirTodosDoFirebase(collection);
    }

    this.saveCollection([]);
    this.listaAtualizada$.next([]);

    if (callback != null) {
      callback();
    }
  }

  private getCollection(): any[] {
    const currentList = this.sharedListService.getCurrentList();
    const storageKey = currentList ? `${this.STORAGE_KEY}_${currentList.id}` : this.STORAGE_KEY;
    
    const value = localStorage.getItem(storageKey);
    
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
    const currentList = this.sharedListService.getCurrentList();
    const storageKey = currentList ? `${this.STORAGE_KEY}_${currentList.id}` : this.STORAGE_KEY;
    localStorage.setItem(storageKey, JSON.stringify(collection));
  }

  private clearLocalCollection(): void {
    const currentList = this.sharedListService.getCurrentList();
    if (currentList) {
      const storageKey = `${this.STORAGE_KEY}_${currentList.id}`;
    }
  }

  isListEmpty(): boolean {
    return this.getCollection().length === 0;
  }

  isListaCompleta(): boolean {
    const collection = this.getCollection();
    if (collection.length === 0) return false;
    return collection.every(item => item.feito === true);
  }

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
    
    // 🔧 FIX: Excluir do Firebase apenas se for lista compartilhada
    const currentList = this.sharedListService.getCurrentList();
    if (currentList && !this.sharedListService.isPersonalList(currentList)) {
      await this.excluirTodosDoFirebase(collection);
    }
    
    this.saveCollection([]);
    this.listaAtualizada$.next([]);
    
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
      console.log('✅ Todos os itens excluídos do Firebase');
      
      setTimeout(() => {
        this.isUpdatingFromFirestore = false;
      }, 500);
      
    } catch (error) {
      console.error('❌ Erro ao excluir itens do Firebase:', error);
      this.isUpdatingFromFirestore = false;
      throw error;
    }
  }

  private classificarItem(nomeItem: string): string {
    const produtosEncontrados = this.catalogoService.buscarProdutos(nomeItem);
    if (produtosEncontrados.length > 0) {
      const produto = produtosEncontrados[0];
      const categoria = this.catalogoService.obterCategoriaPorId(produto.categoria);
      return categoria?.nome || 'Outros';
    }
    
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