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
  members: string[];
  memberDetails?: SharedListMember[];
  settings: {
    allowMembersEdit: boolean;
    allowMembersDelete: boolean;
  };
  // 🔧 FIX: Identificador de lista pessoal
  isPersonal?: boolean;
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

  // 🔧 FIX: ID especial para lista pessoal
  private readonly PERSONAL_LIST_ID = 'personal_list';

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
   * 🔧 FIX: Obter ou criar lista pessoal padrão
   */
  getPersonalList(): SharedList {
    const user = this.authService.getCurrentUser();
    const userId = user?.uid || 'local_user';
    const userEmail = user?.email || 'offline@local.com';

    return {
      id: this.PERSONAL_LIST_ID,
      name: 'Minha Lista',
      ownerId: userId,
      ownerEmail: userEmail,
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [userId],
      isPersonal: true,
      settings: {
        allowMembersEdit: true,
        allowMembersDelete: true
      }
    };
  }

  /**
   * 🔧 FIX: Verificar se é lista pessoal
   */
  isPersonalList(list: SharedList | null): boolean {
    return list?.id === this.PERSONAL_LIST_ID || list?.isPersonal === true;
  }

  async createSharedList(name: string): Promise<string> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');

    console.log('🔵 Criando lista compartilhada:', name);

    const listData = {
      name,
      ownerId: user.uid,
      ownerEmail: user.email || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      members: [user.uid],
      settings: {
        allowMembersEdit: true,
        allowMembersDelete: true
      }
    };

    try {
      const docRef = await addDoc(collection(this.firestore, 'sharedLists'), listData);
      console.log('✅ Lista criada com ID:', docRef.id);
      
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
    } catch (error) {
      console.error('❌ Erro ao criar lista:', error);
      throw error;
    }
  }

  async getUserLists(): Promise<SharedList[]> {
    const user = this.authService.getCurrentUser();
    if (!user) return [];
  
    console.log('🔵 Buscando listas do usuário:', user.uid);
    
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
  
      console.log(`✅ Encontradas ${lists.length} listas`);
      return lists;
    } catch (error) {
      console.error('❌ Erro ao buscar listas:', error);
      return [];
    }
  }

  async getListById(listId: string): Promise<SharedList | null> {
    console.log('🔵 Buscando lista por ID:', listId);
    
    // 🔧 FIX: Se for lista pessoal, retornar objeto local
    if (listId === this.PERSONAL_LIST_ID) {
      return this.getPersonalList();
    }
    
    try {
      const listDoc = await getDoc(doc(this.firestore, 'sharedLists', listId));
      if (listDoc.exists()) {
        const data = listDoc.data();
        const list = {
          id: listDoc.id,
          name: data['name'],
          ownerId: data['ownerId'],
          ownerEmail: data['ownerEmail'],
          createdAt: data['createdAt']?.toDate ? data['createdAt'].toDate() : new Date(data['createdAt']),
          updatedAt: data['updatedAt']?.toDate ? data['updatedAt'].toDate() : new Date(data['updatedAt']),
          members: data['members'] || [data['ownerId']],
          settings: data['settings'] || { allowMembersEdit: true, allowMembersDelete: true }
        } as SharedList;
        
        console.log('✅ Lista encontrada:', list.name);
        return list;
      }
      
      console.warn('⚠️ Lista não encontrada');
      return null;
    } catch (error) {
      console.error('❌ Erro ao buscar lista:', error);
      return null;
    }
  }

  setCurrentList(list: SharedList | null): void {
    console.log('🔵 Definindo lista atual:', list?.name || 'null');
    this.currentListSubject.next(list);
    if (list) {
      localStorage.setItem('currentSharedListId', list.id);
    } else {
      localStorage.removeItem('currentSharedListId');
    }
  }

  getCurrentList(): SharedList | null {
    return this.currentListSubject.value;
  }

  /**
   * 🔧 FIX: Carregar lista atual - se não tiver, usar lista pessoal
   */
  async loadCurrentList(): Promise<void> {
    const listId = localStorage.getItem('currentSharedListId');
    
    // 🔧 FIX: Se não tem lista salva, usar lista pessoal
    if (!listId) {
      console.log('✅ Usando lista pessoal padrão');
      this.setCurrentList(this.getPersonalList());
      return;
    }

    // 🔧 FIX: Se for lista pessoal
    if (listId === this.PERSONAL_LIST_ID) {
      console.log('✅ Carregando lista pessoal');
      this.setCurrentList(this.getPersonalList());
      return;
    }

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
          console.log('✅ Lista carregada com sucesso');
        } else {
          console.warn('⚠️ Usuário sem acesso, voltando para lista pessoal');
          this.setCurrentList(this.getPersonalList());
        }
      } else {
        console.warn('⚠️ Lista não encontrada, voltando para lista pessoal');
        this.setCurrentList(this.getPersonalList());
      }
    } catch (error) {
      console.error('❌ Erro ao carregar lista, usando lista pessoal:', error);
      this.setCurrentList(this.getPersonalList());
    }
  }

  async inviteUserByEmail(listId: string, email: string): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');

    // 🔧 FIX: Não pode convidar para lista pessoal
    if (listId === this.PERSONAL_LIST_ID) {
      throw new Error('Não é possível convidar pessoas para sua lista pessoal. Crie uma lista compartilhada primeiro.');
    }

    console.log('🔵 Convidando usuário:', email, 'para lista:', listId);

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

    try {
      await addDoc(collection(this.firestore, 'listInvitations'), invitation);
      console.log('✅ Convite enviado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao enviar convite:', error);
      throw error;
    }
  }

  async acceptInvitation(invitationId: string): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');

    console.log('🔵 Aceitando convite:', invitationId);

    try {
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

      const listRef = doc(this.firestore, 'sharedLists', invite.listaId);
      const listDoc = await getDoc(listRef);
      
      if (!listDoc.exists()) throw new Error('Lista não encontrada');

      const listData = listDoc.data();
      const members: string[] = listData['members'] || [listData['ownerId']];

      if (!members.includes(user.uid)) {
        await updateDoc(listRef, {
          members: arrayUnion(user.uid),
          updatedAt: new Date()
        });
        console.log('✅ Usuário adicionado aos membros');
      }

      await updateDoc(doc(this.firestore, 'listInvitations', invitationId), {
        status: 'accepted',
        invitedUserId: user.uid
      });

      const updatedList = await this.getListById(invite.listaId);
      if (updatedList) {
        this.setCurrentList(updatedList);
      }
    } catch (error: any) {
      console.error('❌ Erro ao aceitar convite:', error);
      throw error;
    }
  }

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
      console.error('❌ Erro ao buscar convites:', error);
      return [];
    }
  }

  async removeMember(listId: string, memberUserId: string): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');

    // 🔧 FIX: Não pode remover de lista pessoal
    if (listId === this.PERSONAL_LIST_ID) {
      throw new Error('Não é possível remover membros da lista pessoal');
    }

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

    try {
      await updateDoc(listRef, {
        members: arrayRemove(memberUserId),
        updatedAt: new Date()
      });
      console.log('✅ Membro removido');
    } catch (error) {
      console.error('❌ Erro ao remover membro:', error);
      throw error;
    }
  }

  async deleteList(listId: string): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');

    // 🔧 FIX: Não pode deletar lista pessoal
    if (listId === this.PERSONAL_LIST_ID) {
      throw new Error('Não é possível deletar sua lista pessoal');
    }

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
      this.setCurrentList(this.getPersonalList());
    }

    try {
      await setDoc(doc(this.firestore, 'sharedLists', listId), {}, { merge: false });
      console.log('✅ Lista deletada');
    } catch (error) {
      console.error('❌ Erro ao deletar lista:', error);
      throw error;
    }
  }

  userHasAccess(list: SharedList, userId: string): boolean {
    // 🔧 FIX: Lista pessoal sempre tem acesso
    if (list.id === this.PERSONAL_LIST_ID || list.isPersonal) return true;
    
    if (list.ownerId === userId) return true;
    return list.members.includes(userId);
  }

  isOwner(list: SharedList, userId: string): boolean {
    return list.ownerId === userId;
  }

  async getMemberDetails(list: SharedList): Promise<SharedListMember[]> {
    // 🔧 FIX: Lista pessoal não tem membros para mostrar
    if (list.id === this.PERSONAL_LIST_ID || list.isPersonal) {
      return [];
    }
    
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
        console.error('❌ Erro ao buscar membro:', error);
      }
    }
    
    return memberDetails;
  }

  private generateInviteToken(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}