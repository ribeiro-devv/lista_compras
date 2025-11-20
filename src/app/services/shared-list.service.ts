import { Injectable } from '@angular/core';
import { Firestore, collection, doc, addDoc, getDoc, setDoc, updateDoc, query, where, getDocs, onSnapshot } from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SharedListMember {
  userId: string;
  email: string;
  role: 'owner' | 'member';
  invitedAt: Date;
  joinedAt?: Date;
}

export interface SharedList {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  createdAt: Date;
  updatedAt: Date;
  members: SharedListMember[];
  settings: {
    allowMembersEdit: boolean;
    allowMembersDelete: boolean;
  };
}

export interface ListInvitation {
  id: string;
  listaId: string;
  listaName: string;
  ownerId: string;
  ownerEmail: string;
  invitedEmail: string;
  status: 'pending' | 'accepted' | 'rejected';
  token: string;
  createdAt: Date;
  expiresAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SharedListService {
  private currentListSubject = new BehaviorSubject<SharedList | null>(null);
  public currentList$ = this.currentListSubject.asObservable();

  constructor(
    private firestore: Firestore,
    private authService: AuthService
  ) {
    this.loadCurrentList();
    
    // Observar mudanças na lista atual
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.loadCurrentList();
      } else {
        this.setCurrentList(null);
      }
    });
  }

  /**
   * Criar uma nova lista compartilhada
   */
  async createSharedList(name: string): Promise<string> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');

    const listData = {
      name,
      ownerId: user.uid,
      ownerEmail: user.email || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [{
        userId: user.uid,
        email: user.email || '',
        role: 'owner' as const,
        invitedAt: new Date(),
        joinedAt: new Date()
      }],
      settings: {
        allowMembersEdit: true,
        allowMembersDelete: true
      }
    };

    const docRef = await addDoc(collection(this.firestore, 'sharedLists'), listData);
    
    // Definir como lista atual
    const newList: SharedList = { id: docRef.id, ...listData } as SharedList;
    this.setCurrentList(newList);
    
    return docRef.id;
  }

  /**
   * Obter todas as listas do usuário (como owner ou member)
   */
  async getUserLists(): Promise<SharedList[]> {
    const user = this.authService.getCurrentUser();
    if (!user) return [];
  
    try {
      // Buscar listas onde o usuário é owner
      const ownerQuery = query(
        collection(this.firestore, 'sharedLists'),
        where('ownerId', '==', user.uid)
      );
      
      const ownerSnapshot = await getDocs(ownerQuery);
      const lists: SharedList[] = [];
      
      ownerSnapshot.forEach(doc => {
        const data = doc.data();
        
        // Converter datas do Firestore
        const list: SharedList = {
          id: doc.id,
          name: data['name'],
          ownerId: data['ownerId'],
          ownerEmail: data['ownerEmail'],
          createdAt: data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(data['createdAt']),
          updatedAt: data['updatedAt']?.toDate ? data['updatedAt'].toDate() : new Date(data['updatedAt']),
          members: data['members'] || [],
          settings: data['settings'] || { allowMembersEdit: true, allowMembersDelete: true }
        };
        
        lists.push(list);
      });
  
      // Buscar todas as listas para encontrar aquelas onde o usuário é membro
      // (Firestore tem limitações com array-contains em campos nested)
      const allListsQuery = query(collection(this.firestore, 'sharedLists'));
      const allListsSnapshot = await getDocs(allListsQuery);
      
      allListsSnapshot.forEach(doc => {
        // Evitar duplicatas (já adicionadas como owner)
        if (lists.some(l => l.id === doc.id)) return;
        
        const data = doc.data();
        const members = data['members'] || [];
        
        // Verificar se o usuário está nos membros
        const isMember = members.some((m: any) => {
          return m.userId === user.uid;
        });
        
        if (isMember) {
          const list: SharedList = {
            id: doc.id,
            name: data['name'],
            ownerId: data['ownerId'],
            ownerEmail: data['ownerEmail'],
            createdAt: data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(data['createdAt']),
            updatedAt: data['updatedAt']?.toDate ? data['updatedAt'].toDate() : new Date(data['updatedAt']),
            members: data['members'] || [],
            settings: data['settings'] || { allowMembersEdit: true, allowMembersDelete: true }
          };
          
          lists.push(list);
        }
      });
  
      return lists;
    } catch (error) {
      console.error('Erro ao buscar listas:', error);
      return [];
    }
  }

  /**
   * Obter lista por ID
   */
  async getListById(listId: string): Promise<SharedList | null> {
    try {
      const listDoc = await getDoc(doc(this.firestore, 'sharedLists', listId));
      if (listDoc.exists()) {
        return { id: listDoc.id, ...listDoc.data() } as SharedList;
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar lista:', error);
      return null;
    }
  }

  /**
   * Definir lista atual (ativa)
   */
  setCurrentList(list: SharedList | null): void {
    this.currentListSubject.next(list);
    if (list) {
      localStorage.setItem('currentSharedListId', list.id);
    } else {
      localStorage.removeItem('currentSharedListId');
    }
  }

  /**
   * Obter lista atual (ativa)
   */
  getCurrentList(): SharedList | null {
    return this.currentListSubject.value;
  }

  /**
   * Carregar lista atual do localStorage
   */
  async loadCurrentList(): Promise<void> {
    const listId = localStorage.getItem('currentSharedListId');
    if (!listId) return;

    try {
      const listDoc = await getDoc(doc(this.firestore, 'sharedLists', listId));
      if (listDoc.exists()) {
        const list = { id: listDoc.id, ...listDoc.data() } as SharedList;
        
        // Verificar se usuário ainda tem acesso
        const user = this.authService.getCurrentUser();
        if (user && this.userHasAccess(list, user.uid)) {
          this.setCurrentList(list);
        } else {
          localStorage.removeItem('currentSharedListId');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar lista atual:', error);
      localStorage.removeItem('currentSharedListId');
    }
  }

  /**
   * Convidar usuário por email
   */
  async inviteUserByEmail(listId: string, email: string): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');

    const listDoc = await getDoc(doc(this.firestore, 'sharedLists', listId));
    if (!listDoc.exists()) throw new Error('Lista não encontrada');

    const list = { id: listDoc.id, ...listDoc.data() } as SharedList;
    
    // Verificar se é o owner
    if (list.ownerId !== user.uid) {
      throw new Error('Apenas o dono da lista pode convidar membros');
    }

    // Verificar se email já é membro
    if (list.members && list.members.some(m => {
      const member = typeof m === 'object' && 'email' in m ? m : { email: '' };
      return member.email === email.toLowerCase().trim();
    })) {
      throw new Error('Este email já é membro da lista');
    }

    // Criar token único para o convite
    const token = this.generateInviteToken();

    // Criar convite
    const invitation = {
      listaId: listId,
      listaName: list.name,
      ownerId: user.uid,
      ownerEmail: user.email || '',
      invitedEmail: email.toLowerCase().trim(),
      status: 'pending' as const,
      token,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias
    };

    await addDoc(collection(this.firestore, 'listInvitations'), invitation);
  }

  /**
   * Aceitar convite
   */
  async acceptInvitation(invitationId: string): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');

    const inviteDoc = await getDoc(doc(this.firestore, 'listInvitations', invitationId));
    if (!inviteDoc.exists()) throw new Error('Convite não encontrado');

    const inviteData = inviteDoc.data();
    
    // Converter datas do Firestore
    let createdAt: Date;
    let expiresAt: Date;
    
    if (inviteData && inviteData['createdAt']) {
      createdAt = inviteData['createdAt'].toDate 
        ? inviteData['createdAt'].toDate() 
        : (inviteData['createdAt'] instanceof Date 
          ? inviteData['createdAt'] 
          : new Date(inviteData['createdAt']));
    } else {
      createdAt = new Date();
    }
    
    if (inviteData && inviteData['expiresAt']) {
      expiresAt = inviteData['expiresAt'].toDate 
        ? inviteData['expiresAt'].toDate() 
        : (inviteData['expiresAt'] instanceof Date 
          ? inviteData['expiresAt'] 
          : new Date(inviteData['expiresAt']));
    } else {
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
    
    const invite: ListInvitation = { 
      id: inviteDoc.id, 
      ...inviteData,
      createdAt,
      expiresAt
    } as ListInvitation;

    // Verificar se o email corresponde
    if (invite.invitedEmail.toLowerCase() !== (user.email || '').toLowerCase()) {
      throw new Error('Este convite não é para você');
    }

    // Verificar se não expirou
    if (new Date() > invite.expiresAt) {
      throw new Error('Convite expirado');
    }

    // Atualizar lista para adicionar membro
    const listRef = doc(this.firestore, 'sharedLists', invite.listaId);
    const listDoc = await getDoc(listRef);
    if (!listDoc.exists()) throw new Error('Lista não encontrada');

    const listData = listDoc.data();
    const list: SharedList = { id: listDoc.id, ...listData } as SharedList;

    // Converter members se necessário
    let members: SharedListMember[] = [];
    if (list.members && Array.isArray(list.members)) {
      members = list.members.map((m: any) => {
        if (typeof m === 'object' && 'userId' in m) {
          // Converter invitedAt
          let invitedAt: Date;
          if (m.invitedAt) {
            invitedAt = m.invitedAt.toDate 
              ? m.invitedAt.toDate() 
              : (m.invitedAt instanceof Date 
                ? m.invitedAt 
                : new Date(m.invitedAt));
          } else {
            invitedAt = new Date();
          }
          
          // Converter joinedAt
          let joinedAt: Date | undefined;
          if (m.joinedAt) {
            joinedAt = m.joinedAt.toDate 
              ? m.joinedAt.toDate() 
              : (m.joinedAt instanceof Date 
                ? m.joinedAt 
                : new Date(m.joinedAt));
          }
          
          return {
            ...m,
            invitedAt,
            joinedAt
          } as SharedListMember;
        }
        return m as SharedListMember;
      });
    }

    // Adicionar membro se não existir
    if (!members.some(m => m.userId === user.uid)) {
      members.push({
        userId: user.uid,
        email: user.email || '',
        role: 'member',
        invitedAt: invite.createdAt,
        joinedAt: new Date()
      });

      await updateDoc(listRef, {
        members: members,
        updatedAt: new Date()
      });
    }

    // Marcar convite como aceito
    await updateDoc(doc(this.firestore, 'listInvitations', invitationId), {
      status: 'accepted'
    });

    // Definir como lista atual
    const updatedList = { ...list, members };
    this.setCurrentList(updatedList);
  }

  /**
   * Obter convites pendentes do usuário
   */
  async getPendingInvitations(): Promise<ListInvitation[]> {
    const user = this.authService.getCurrentUser();
    if (!user || !user.email) return [];

    try {
      const q = query(
        collection(this.firestore, 'listInvitations'),
        where('invitedEmail', '==', user.email.toLowerCase()),
        where('status', '==', 'pending')
      );

      const snapshot = await getDocs(q);
      const invitations: ListInvitation[] = [];
      const now = new Date();

      snapshot.forEach(doc => {
        const data = doc.data();
        const expiresAt = data['expiresAt']?.toDate?.() || new Date(data['expiresAt']);
        
        // Verificar se não expirou
        if (now <= expiresAt) {
          invitations.push({ 
            id: doc.id, 
            ...data,
            createdAt: data['createdAt']?.toDate?.() || new Date(data['createdAt']),
            expiresAt
          } as ListInvitation);
        }
      });

      return invitations;
    } catch (error) {
      console.error('Erro ao buscar convites:', error);
      return [];
    }
  }

  /**
   * Remover membro da lista
   */
  async removeMember(listId: string, memberUserId: string): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');

    const listRef = doc(this.firestore, 'sharedLists', listId);
    const listDoc = await getDoc(listRef);
    if (!listDoc.exists()) throw new Error('Lista não encontrada');

    const listData = listDoc.data();
    const list: SharedList = { id: listDoc.id, ...listData } as SharedList;

    // Verificar se é o owner
    if (list.ownerId !== user.uid) {
      throw new Error('Apenas o dono da lista pode remover membros');
    }

    // Não pode remover o owner
    if (memberUserId === list.ownerId) {
      throw new Error('Não é possível remover o dono da lista');
    }

    let members: SharedListMember[] = [];
    if (list.members && Array.isArray(list.members)) {
      members = list.members.filter(m => {
        const member = typeof m === 'object' && 'userId' in m ? m : { userId: '' };
        return member.userId !== memberUserId;
      }) as SharedListMember[];
    }

    await updateDoc(listRef, {
      members: members,
      updatedAt: new Date()
    });
  }

  /**
   * Deletar lista compartilhada
   */
  async deleteList(listId: string): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');

    const listDoc = await getDoc(doc(this.firestore, 'sharedLists', listId));
    if (!listDoc.exists()) throw new Error('Lista não encontrada');

    const list: SharedList = { id: listDoc.id, ...listDoc.data() } as SharedList;

    // Verificar se é o owner
    if (list.ownerId !== user.uid) {
      throw new Error('Apenas o dono da lista pode deletá-la');
    }

    // Se for a lista atual, remover
    if (this.currentListSubject.value?.id === listId) {
      this.setCurrentList(null);
    }

    await setDoc(doc(this.firestore, 'sharedLists', listId), {}, { merge: false });
  }

  /**
   * Verificar se usuário tem acesso à lista
   */
  userHasAccess(list: SharedList, userId: string): boolean {
    if (list.ownerId === userId) return true;
    
    if (list.members && Array.isArray(list.members)) {
      return list.members.some(m => {
        const member = typeof m === 'object' && 'userId' in m ? m : { userId: '' };
        return member.userId === userId;
      });
    }
    
    return false;
  }

  /**
   * Verificar se usuário é dono da lista
   */
  isOwner(list: SharedList, userId: string): boolean {
    return list.ownerId === userId;
  }

  /**
   * Gerar token único para convite
   */
  private generateInviteToken(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}

