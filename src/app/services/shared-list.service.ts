import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

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

  /** Cache da lista pessoal do usuário (row real no banco). */
  private personalList: SharedList | null = null;

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService
  ) {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.loadCurrentList();
      } else {
        this.personalList = null;
        this.setCurrentList(null);
      }
    });
  }

  private get db() {
    return this.supabaseService.client;
  }

  isPersonalList(list: SharedList | null): boolean {
    return list?.isPersonal === true;
  }

  /** Retorna a lista pessoal já carregada (ou null se ainda não carregou). */
  getPersonalList(): SharedList | null {
    return this.personalList;
  }

  /** Garante que a lista pessoal do usuário esteja carregada do banco. */
  async ensurePersonalList(): Promise<SharedList | null> {
    if (this.personalList) return this.personalList;
    const user = this.authService.getCurrentUser();
    if (!user || !this.supabaseService.isConfigured) return null;

    const { data, error } = await this.db
      .from('lists')
      .select('*')
      .eq('owner_id', user.uid)
      .eq('is_personal', true)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      console.warn('⚠️ Lista pessoal não encontrada:', error?.message);
      return null;
    }
    this.personalList = this.mapList(data, [user.uid]);
    return this.personalList;
  }

  async createSharedList(name: string): Promise<string> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data, error } = await this.db
      .from('lists')
      .insert({ name, owner_id: user.uid, owner_email: user.email, is_personal: false })
      .select()
      .single();

    if (error) throw error;

    const newList = this.mapList(data, [user.uid]);
    this.setCurrentList(newList);
    return data.id;
  }

  async getUserLists(): Promise<SharedList[]> {
    const user = this.authService.getCurrentUser();
    if (!user) return [];

    // RLS já limita às listas em que o usuário é dono ou membro.
    const { data: lists, error } = await this.db
      .from('lists')
      .select('*')
      .order('is_personal', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Erro ao buscar listas:', error.message);
      return [];
    }
    if (!lists || lists.length === 0) return [];

    const membersByList = await this.fetchMembers(lists.map(l => l.id));
    return lists.map(l => this.mapList(l, membersByList.get(l.id) || [l.owner_id]));
  }

  async getListById(listId: string): Promise<SharedList | null> {
    const { data, error } = await this.db
      .from('lists')
      .select('*')
      .eq('id', listId)
      .maybeSingle();

    if (error || !data) return null;
    const membersByList = await this.fetchMembers([listId]);
    return this.mapList(data, membersByList.get(listId) || [data.owner_id]);
  }

  setCurrentList(list: SharedList | null): void {
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

  /** Carrega a lista atual: a salva localmente (se acessível) ou a pessoal. */
  async loadCurrentList(): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user || !this.supabaseService.isConfigured) {
      this.setCurrentList(null);
      return;
    }

    const savedId = localStorage.getItem('currentSharedListId');
    if (savedId) {
      const list = await this.getListById(savedId);
      if (list && this.userHasAccess(list, user.uid)) {
        if (list.isPersonal) this.personalList = list;
        this.setCurrentList(list);
        return;
      }
    }

    const personal = await this.ensurePersonalList();
    this.setCurrentList(personal);
  }

  async inviteUserByEmail(listId: string, email: string): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');

    const list = await this.getListById(listId);
    if (!list) throw new Error('Lista não encontrada');
    if (list.isPersonal) {
      throw new Error('Não é possível convidar pessoas para sua lista pessoal. Crie uma lista compartilhada primeiro.');
    }
    if (list.ownerId !== user.uid) {
      throw new Error('Apenas o dono da lista pode convidar membros');
    }

    const emailNormalized = email.toLowerCase().trim();
    if (list.ownerEmail.toLowerCase() === emailNormalized) {
      throw new Error('Este email já é membro da lista');
    }

    const { error } = await this.db.from('invitations').insert({
      list_id: listId,
      list_name: list.name,
      owner_id: user.uid,
      owner_email: user.email,
      invited_email: emailNormalized,
      status: 'pending',
      token: this.generateInviteToken(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
    if (error) throw error;
  }

  async acceptInvitation(invitationId: string): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data: invite, error } = await this.db
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .maybeSingle();

    if (error || !invite) throw new Error('Convite não encontrado');
    if ((invite.invited_email || '').toLowerCase() !== (user.email || '').toLowerCase()) {
      throw new Error('Este convite não é para você');
    }
    if (invite.expires_at && new Date() > new Date(invite.expires_at)) {
      throw new Error('Convite expirado');
    }

    const { error: memberErr } = await this.db
      .from('list_members')
      .upsert({ list_id: invite.list_id, user_id: user.uid, email: user.email, role: 'member' });
    if (memberErr) throw memberErr;

    await this.db
      .from('invitations')
      .update({ status: 'accepted', invited_user_id: user.uid })
      .eq('id', invitationId);

    const updatedList = await this.getListById(invite.list_id);
    if (updatedList) this.setCurrentList(updatedList);
  }

  async getPendingInvitations(): Promise<ListInvitation[]> {
    const user = this.authService.getCurrentUser();
    if (!user || !user.email) return [];

    const { data, error } = await this.db
      .from('invitations')
      .select('*')
      .eq('invited_email', user.email.toLowerCase())
      .eq('status', 'pending');

    if (error || !data) return [];

    const now = new Date();
    return data
      .filter(inv => !inv.expires_at || now <= new Date(inv.expires_at))
      .map(inv => this.mapInvitation(inv));
  }

  async removeMember(listId: string, memberUserId: string): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');

    const list = await this.getListById(listId);
    if (!list) throw new Error('Lista não encontrada');
    if (list.isPersonal) throw new Error('Não é possível remover membros da lista pessoal');
    if (list.ownerId !== user.uid) throw new Error('Apenas o dono da lista pode remover membros');
    if (memberUserId === list.ownerId) throw new Error('Não é possível remover o dono da lista');

    const { error } = await this.db
      .from('list_members')
      .delete()
      .eq('list_id', listId)
      .eq('user_id', memberUserId);
    if (error) throw error;
  }

  async deleteList(listId: string): Promise<void> {
    const user = this.authService.getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');

    const list = await this.getListById(listId);
    if (!list) throw new Error('Lista não encontrada');
    if (list.isPersonal) throw new Error('Não é possível deletar sua lista pessoal');
    if (list.ownerId !== user.uid) throw new Error('Apenas o dono da lista pode deletá-la');

    // DELETE real (o Firebase antigo deixava lixo com setDoc vazio).
    const { error } = await this.db.from('lists').delete().eq('id', listId);
    if (error) throw error;

    if (this.currentListSubject.value?.id === listId) {
      const personal = await this.ensurePersonalList();
      this.setCurrentList(personal);
    }
  }

  userHasAccess(list: SharedList, userId: string): boolean {
    if (list.isPersonal) return true;
    if (list.ownerId === userId) return true;
    return list.members.includes(userId);
  }

  isOwner(list: SharedList, userId: string): boolean {
    return list.ownerId === userId;
  }

  async getMemberDetails(list: SharedList): Promise<SharedListMember[]> {
    if (list.isPersonal) return [];

    const { data, error } = await this.db
      .from('list_members')
      .select('*')
      .eq('list_id', list.id);

    if (error || !data) return [];

    return data.map(m => ({
      userId: m.user_id,
      email: m.email || '',
      role: m.role === 'owner' ? 'owner' : 'member',
      invitedAt: m.joined_at ? new Date(m.joined_at) : list.createdAt,
      joinedAt: m.joined_at ? new Date(m.joined_at) : undefined
    }));
  }

  // ---- helpers ----

  private async fetchMembers(listIds: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (listIds.length === 0) return map;

    const { data } = await this.db
      .from('list_members')
      .select('list_id, user_id')
      .in('list_id', listIds);

    (data || []).forEach(row => {
      const arr = map.get(row.list_id) || [];
      arr.push(row.user_id);
      map.set(row.list_id, arr);
    });
    return map;
  }

  private mapList(row: any, members: string[]): SharedList {
    return {
      id: row.id,
      name: row.name,
      ownerId: row.owner_id,
      ownerEmail: row.owner_email || '',
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
      members,
      settings: {
        allowMembersEdit: row.allow_members_edit ?? true,
        allowMembersDelete: row.allow_members_delete ?? true
      },
      isPersonal: !!row.is_personal
    };
  }

  private mapInvitation(row: any): ListInvitation {
    return {
      id: row.id,
      listaId: row.list_id,
      listaName: row.list_name || '',
      ownerId: row.owner_id,
      ownerEmail: row.owner_email || '',
      invitedEmail: row.invited_email,
      invitedUserId: row.invited_user_id,
      status: row.status,
      token: row.token || '',
      createdAt: row.created_at ? new Date(row.created_at) : new Date(),
      expiresAt: row.expires_at ? new Date(row.expires_at) : new Date()
    };
  }

  private generateInviteToken(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }
}
