
import { Injectable } from '@angular/core';
import { Firestore, collection, doc, addDoc, getDoc, setDoc, updateDoc, query, where, getDocs, onSnapshot, arrayUnion, arrayRemove } from '@angular/fire/firestore';
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
  members: string[]; // 🔧 FIX: Array simples de UIDs para as regras funcionarem
  memberDetails?: SharedListMember[]; // Detalhes completos (apenas local)
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
  invitedUserId?: string;
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
      members: [user.uid], // 🔧 FIX: Array simples de UIDs
      settings: {
        allowMembersEdit: true,
        allowMembersDelete: true
      }
    };

    const docRef = await addDoc(collection(this.firestore, 'sharedLists'), listData);
    
    const newList: SharedList = { 
      id: docRef.id, 
      ...listData,
      memberDetails: [{
        userId: user.uid,
        email: user.email || '',
        role: 'owner' as const,
        invitedAt: new Date(),
        joinedAt: new Date()
      }]
    } as SharedList;
    
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
      const listsQuery = query(
        collection(this.firestore, 'sharedLists'),
        where('members', 'array-contains', user.uid)
      );
      
      const snapshot = await getDocs(listsQuery);
      const lists: SharedList[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        
        const list: SharedList = {
          id: doc.id,
          name: data['name'],
          ownerId: data['ownerId'],
          ownerEmail: data['ownerEmail'],
          createdAt: data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(data['createdAt']),
          updatedAt: data['updatedAt']?.toDate ? data['updatedAt'].toDate() : new Date(data['updatedAt']),
          members: data['members'] || [data['ownerId']],
          settings: data['settings'] || { allowMembersEdit: true, allowMembersDelete: true }
        };
        
        lists.push(list);
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
        const data = listDoc.data();
        return {
          id: listDoc.id,
          name: data['name'],
          ownerId: data['ownerId'],
          ownerEmail: data['ownerEmail'],
          createdAt: data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(data['createdAt']),
          updatedAt: data['updatedAt']?.toDate ? data['updatedAt'].toDate() : new Date(data['updatedAt']),
          members: data['members'] || [data['ownerId']],
          settings: data['settings'] || { allowMembersEdit: true, allowMembersDelete: true }
        } as SharedList;
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
        const data = listDoc.data();
        const list: SharedList = {
          id: listDoc.id,
          name: data['name'],
          ownerId: data['ownerId'],
          ownerEmail: data['ownerEmail'],
          createdAt: data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(data['createdAt']),
          updatedAt: data['updatedAt']?.toDate ? data['updatedAt'].toDate() : new Date(data['updatedAt']),
          members: data['members'] || [data['ownerId']],
          settings: data['settings'] || { allowMembersEdit: true, allowMembersDelete: true }
        };
        
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

    const data = listDoc.data();
    const list: SharedList = {
      id: listDoc.id,
      name: data['name'],
      ownerId: data['ownerId'],
      ownerEmail: data['ownerEmail'],
      createdAt: data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(data['createdAt']),
      updatedAt: data['updatedAt']?.toDate ? data['updatedAt'].toDate() : new Date(data['updatedAt']),
      members: data['members'] || [data['ownerId']],
      settings: data['settings'] || { allowMembersEdit: true, allowMembersDelete: true }
    };
    
    if (list.ownerId !== user.uid) {
      throw new Error('Apenas o dono da lista pode convidar membros');
    }

    const emailNormalized = email.toLowerCase().trim();
    
    // Verificar se já é membro (por enquanto apenas verifica owner)
    if (list.ownerEmail.toLowerCase() === emailNormalized) {
      throw new Error('Este email já é membro da lista');
    }

    const token = this.generateInviteToken();

    const invitation = {
      listaId: listId,
      listaName: list.name,
      ownerId: user.uid,
      ownerEmail: user.email || '',
      invitedEmail: emailNormalized,
      status: 'pending' as const,
      token,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
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
    
    let createdAt: Date = inviteData['createdAt']?.toDate ? 
      inviteData['createdAt'].toDate() : new Date(inviteData['createdAt']);
    
    let expiresAt: Date = inviteData['expiresAt']?.toDate ? 
      inviteData['expiresAt'].toDate() : new Date(inviteData['expiresAt']);
    
    const invite: ListInvitation = { 
      id: inviteDoc.id, 
      ...inviteData,
      createdAt,
      expiresAt
    } as ListInvitation;

    if (invite.invitedEmail.toLowerCase() !== (user.email || '').toLowerCase()) {
      throw new Error('Este convite não é para você');
    }

    if (new Date() > invite.expiresAt) {
      throw new Error('Convite expirado');
    }

    // Atualizar lista para adicionar membro
    const listRef = doc(this.firestore, 'sharedLists', invite.listaId);
    const listDoc = await getDoc(listRef);
    if (!listDoc.exists()) throw new Error('Lista não encontrada');

    const listData = listDoc.data();
    const members: string[] = listData['members'] || [listData['ownerId']];

    if (!members.includes(user.uid)) {
      // 🔧 FIX: Usar arrayUnion para adicionar ao array
      await updateDoc(listRef, {
        members: arrayUnion(user.uid),
        updatedAt: new Date()
      });
    }

    // Marcar convite como aceito
    await updateDoc(doc(this.firestore, 'listInvitations', invitationId), {
      status: 'accepted',
      invitedUserId: user.uid
    });

    // Recarregar a lista
    const updatedList = await this.getListById(invite.listaId);
    if (updatedList) {
      this.setCurrentList(updatedList);
    }
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
    const list: SharedList = {
      id: listDoc.id,
      name: listData['name'],
      ownerId: listData['ownerId'],
      ownerEmail: listData['ownerEmail'],
      createdAt: listData['createdAt']?.toDate ? listData['createdAt'].toDate() : new Date(listData['createdAt']),
      updatedAt: listData['updatedAt']?.toDate ? listData['updatedAt'].toDate() : new Date(listData['updatedAt']),
      members: listData['members'] || [listData['ownerId']],
      settings: listData['settings'] || { allowMembersEdit: true, allowMembersDelete: true }
    };

    if (list.ownerId !== user.uid) {
      throw new Error('Apenas o dono da lista pode remover membros');
    }

    if (memberUserId === list.ownerId) {
      throw new Error('Não é possível remover o dono da lista');
    }

    // 🔧 FIX: Usar arrayRemove
    await updateDoc(listRef, {
      members: arrayRemove(memberUserId),
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

    const data = listDoc.data();
    const list: SharedList = {
      id: listDoc.id,
      name: data['name'],
      ownerId: data['ownerId'],
      ownerEmail: data['ownerEmail'],
      createdAt: data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(data['createdAt']),
      updatedAt: data['updatedAt']?.toDate ? data['updatedAt'].toDate() : new Date(data['updatedAt']),
      members: data['members'] || [data['ownerId']],
      settings: data['settings'] || { allowMembersEdit: true, allowMembersDelete: true }
    };

    if (list.ownerId !== user.uid) {
      throw new Error('Apenas o dono da lista pode deletá-la');
    }

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
    return list.members.includes(userId);
  }

  /**
   * Verificar se usuário é dono da lista
   */
  isOwner(list: SharedList, userId: string): boolean {
    return list.ownerId === userId;
  }

  /**
   * Obter detalhes dos membros (buscar emails do Firestore)
   */
  async getMemberDetails(list: SharedList): Promise<SharedListMember[]> {
    const memberDetails: SharedListMember[] = [];
    
    for (const uid of list.members) {
      try {
        const userDoc = await getDoc(doc(this.firestore, 'users', uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          memberDetails.push({
            userId: uid,
            email: userData['email'] || '',
            role: uid === list.ownerId ? 'owner' : 'member',
            invitedAt: list.createdAt,
            joinedAt: list.createdAt
          });
        }
      } catch (error) {
        console.error('Erro ao buscar detalhes do membro:', error);
      }
    }
    
    return memberDetails;
  }

  /**
   * Gerar token único para convite
   */
  private generateInviteToken(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}