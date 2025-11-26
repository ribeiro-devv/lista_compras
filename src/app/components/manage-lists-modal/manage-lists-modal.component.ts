import { Component, OnInit } from '@angular/core';
import { ModalController, ToastController, AlertController, LoadingController } from '@ionic/angular';
import { SharedListService, SharedList, ListInvitation, SharedListMember } from 'src/app/services/shared-list.service';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-manage-lists-modal',
  templateUrl: './manage-lists-modal.component.html',
  styleUrls: ['./manage-lists-modal.component.scss'],
})
export class ManageListsModalComponent implements OnInit {
  lists: SharedList[] = [];
  currentList: SharedList | null = null;
  invitations: ListInvitation[] = [];
  newListName = '';
  inviteEmail = '';
  isLoading = false;

  memberDetailsMap: Map<string, SharedListMember[]> = new Map();

  constructor(
    private modalCtrl: ModalController,
    private sharedListService: SharedListService,
    private authService: AuthService,
    private toastController: ToastController,
    private alertController: AlertController,
    private loadingController: LoadingController
  ) {}

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.isLoading = true;
    try {
      this.lists = await this.sharedListService.getUserLists();
      this.currentList = this.sharedListService.getCurrentList();
      this.invitations = await this.sharedListService.getPendingInvitations();
      
      // 🔧 FIX: Carregar detalhes dos membros para cada lista
      for (const list of this.lists) {
        const details = await this.sharedListService.getMemberDetails(list);
        this.memberDetailsMap.set(list.id, details);
      }
      
      if (!this.currentList && this.lists.length > 0) {
        await this.selectList(this.lists[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async createList() {
    if (!this.newListName.trim()) {
      await this.showToast('Digite um nome para a lista', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Criando lista...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const listId = await this.sharedListService.createSharedList(this.newListName.trim());
      await this.showToast('Lista criada com sucesso!', 'success');
      this.newListName = '';
      await this.loadData();
    } catch (error: any) {
      await this.showToast(error.message || 'Erro ao criar lista', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  async selectList(list: SharedList) {
    const loading = await this.loadingController.create({
      message: 'Carregando lista...',
      spinner: 'crescent',
      duration: 500
    });
    await loading.present();

    try {
      this.sharedListService.setCurrentList(list);
      this.currentList = list;
      await this.showToast(`Lista "${list.name}" selecionada`, 'success');
      await loading.dismiss();
      // Aguardar um pouco para dar tempo de atualizar
      setTimeout(async () => {
        await this.dismiss();
      }, 500);
    } catch (error: any) {
      await loading.dismiss();
      await this.showToast(error.message || 'Erro ao selecionar lista', 'danger');
    }
  }

  async inviteUser() {
    if (!this.inviteEmail.trim()) {
      await this.showToast('Digite um email', 'warning');
      return;
    }

    if (!this.currentList) {
      await this.showToast('Selecione uma lista primeiro', 'warning');
      return;
    }

    // Validar formato de email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.inviteEmail.trim())) {
      await this.showToast('Email inválido', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Enviando convite...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await this.sharedListService.inviteUserByEmail(this.currentList.id, this.inviteEmail.trim());
      await this.showToast(`Convite enviado para ${this.inviteEmail}`, 'success');
      this.inviteEmail = '';
      await this.loadData();
    } catch (error: any) {
      await this.showToast(error.message || 'Erro ao convidar usuário', 'danger');
    } finally {
      await loading.dismiss();
    }
  }

  async acceptInvitation(invitation: ListInvitation) {
    const loading = await this.loadingController.create({
      message: 'Aceitando convite...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await this.sharedListService.acceptInvitation(invitation.id);
      await this.showToast('Convite aceito!', 'success');
      await this.loadData();
      
      // Selecionar a lista automaticamente após aceitar
      const list = await this.sharedListService.getListById(invitation.listaId);
      if (list) {
        await this.selectList(list);
      }
    } catch (error: any) {
      await loading.dismiss();
      await this.showToast(error.message || 'Erro ao aceitar convite', 'danger');
    }
  }

  async rejectInvitation(invitation: ListInvitation) {
    // Por enquanto, apenas não aceitar - pode implementar depois
    await this.showToast('Convite ignorado', 'medium');
  }

  async removeMember(list: SharedList, member: SharedListMember) {
    const alert = await this.alertController.create({
      header: 'Remover Membro',
      message: `Tem certeza que deseja remover ${member.email} da lista "${list.name}"?`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Remover',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Removendo membro...',
              spinner: 'crescent'
            });
            await loading.present();

            try {
              await this.sharedListService.removeMember(list.id, member.userId);
              await this.showToast('Membro removido com sucesso', 'success');
              await this.loadData();
            } catch (error: any) {
              await this.showToast(error.message || 'Erro ao remover membro', 'danger');
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async deleteList(list: SharedList) {
    if (!this.isOwner(list)) {
      await this.showToast('Apenas o dono pode deletar a lista', 'warning');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Deletar Lista',
      message: `Tem certeza que deseja deletar a lista "${list.name}"? Todos os itens serão perdidos. Esta ação não pode ser desfeita.`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Deletar',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingController.create({
              message: 'Deletando lista...',
              spinner: 'crescent'
            });
            await loading.present();

            try {
              await this.sharedListService.deleteList(list.id);
              await this.showToast('Lista deletada com sucesso', 'success');
              
              // Se era a lista atual, remover
              if (this.currentList?.id === list.id) {
                this.sharedListService.setCurrentList(null);
                this.currentList = null;
              }
              
              await this.loadData();
            } catch (error: any) {
              await this.showToast(error.message || 'Erro ao deletar lista', 'danger');
            } finally {
              await loading.dismiss();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  isOwner(list: SharedList): boolean {
    const user = this.authService.getCurrentUser();
    return user ? this.sharedListService.isOwner(list, user.uid) : false;
  }

  getCurrentUserId(): string | null {
    const user = this.authService.getCurrentUser();
    return user ? user.uid : null;
  }

  getListMembers(list: SharedList): SharedListMember[] {
    return this.memberDetailsMap.get(list.id) || [];
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'top',
      color
    });
    await toast.present();
  }

  async dismiss() {
    await this.modalCtrl.dismiss();
  }
}

