import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { PixModalComponent } from 'src/app/components/pix-modal/pix-modal.component';
import { ManageListsModalComponent } from 'src/app/components/manage-lists-modal/manage-lists-modal.component';
import { AuthService } from 'src/app/services/auth.service';
import { SharedListService } from 'src/app/services/shared-list.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit, OnDestroy {

  userProfile = {
    name: 'Matheus Ribeiro',
    email: 'usuario@exemplo.com',
    avatar: 'assets/rede.jpeg'
  };

  private authSubscription?: Subscription;
  private listSubscription?: Subscription;
  isAuthenticated = false;
  currentList: any = null;

  appSettings = {
    darkMode: false,
    notifications: true,
    currency: 'BRL',
    language: 'pt-BR'
  };

  constructor(
    private router: Router,
    private alertController: AlertController,
    private modalCtrl: ModalController,
    private toastController: ToastController,
    private authService: AuthService,
    private sharedListService: SharedListService
  ) { }

  ngOnInit() {
    this.loadUserData();
    this.loadAppSettings();
    this.loadAuthUser();
  }

  ngOnDestroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    if (this.listSubscription) {
      this.listSubscription.unsubscribe();
    }
  }

  loadAuthUser() {
    // Observar mudanças no estado de autenticação
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      this.isAuthenticated = !!user;
      
      if (user) {
        // Carregar perfil do usuário autenticado
        const profile = this.authService.getCurrentUserProfile();
        if (profile) {
          this.userProfile = {
            name: profile.displayName || user.displayName || 'Usuário',
            email: profile.email || user.email || '',
            avatar: profile.photoURL || user.photoURL || 'assets/rede.jpeg'
          };
        } else {
          // Usar dados básicos do Auth se não tiver perfil
          this.userProfile = {
            name: user.displayName || 'Usuário',
            email: user.email || '',
            avatar: user.photoURL || 'assets/rede.jpeg'
          };
        }
      } else {
        // Se não estiver autenticado, manter dados locais
        this.loadUserData();
      }
    });

    // Também observar mudanças no perfil
    this.authService.userProfile$.subscribe(profile => {
      if (profile) {
        const user = this.authService.getCurrentUser();
        if (user) {
          this.userProfile = {
            name: profile.displayName || user.displayName || 'Usuário',
            email: profile.email || user.email || '',
            avatar: profile.photoURL || user.photoURL || 'assets/rede.jpeg'
          };
        }
      }
    });

    // Observar lista atual
    this.listSubscription = this.sharedListService.currentList$.subscribe(list => {
      this.currentList = list;
    });
  }

  loadUserData() {
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) {
      this.userProfile = { ...this.userProfile, ...JSON.parse(savedProfile) };
    }
  }

  loadAppSettings() {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      this.appSettings = { ...this.appSettings, ...JSON.parse(savedSettings) };
    }
  }

  saveUserProfile() {
    localStorage.setItem('userProfile', JSON.stringify(this.userProfile));
    this.showToast('Perfil salvo com sucesso!');
  }

  saveAppSettings() {
    localStorage.setItem('appSettings', JSON.stringify(this.appSettings));
    // this.showToast('Configurações salvas!');
  }

  async editProfile() {
    const alert = await this.alertController.create({
      header: 'Editar Perfil',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Nome',
          value: this.userProfile.name
        },
        {
          name: 'email',
          type: 'email',
          placeholder: 'Email',
          value: this.userProfile.email
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Salvar',
          handler: (data) => {
            if (data.name && data.email) {
              this.userProfile.name = data.name;
              this.userProfile.email = data.email;
              this.saveUserProfile();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async clearData() {
    const alert = await this.alertController.create({
      header: 'Limpar Dados',
      message: 'Tem certeza que deseja limpar todos os dados? Esta ação não poderá ser desfeita.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Limpar',
          handler: () => {
            localStorage.clear();
            this.showToast('Dados limpos com sucesso!');
            this.router.navigate(['/home']);
          }
        }
      ]
    });

    await alert.present();
  }

  onDarkModeToggle() {
    document.body.classList.toggle('dark', this.appSettings.darkMode);
    this.saveAppSettings();
  }

  onNotificationsToggle() {
    this.saveAppSettings();
  }

  onCurrencyChange() {
    this.saveAppSettings();
  }

  async showToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    toast.present();
  }

  goBack() {
    this.router.navigate(['/home']);
  }

  async showPix() {
    const modal = await this.modalCtrl.create({
      component: PixModalComponent,
      cssClass: 'add-produto-modal',
      backdropDismiss: false
    });
    await modal.present();
  }

  async manageSharedLists() {
    const modal = await this.modalCtrl.create({
      component: ManageListsModalComponent,
      cssClass: 'manage-lists-modal',
      backdropDismiss: true
    });
    await modal.present();
  }

  async logout() {
    const alert = await this.alertController.create({
      header: 'Sair da Conta',
      message: 'Tem certeza que deseja sair? Você precisará fazer login novamente.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Sair',
          role: 'destructive',
          handler: async () => {
            try {
              await this.authService.logout();
              await this.showToast('Logout realizado com sucesso!', 'success');
              // O router já é chamado pelo authService, mas garantimos aqui
              this.router.navigate(['/login'], { replaceUrl: true });
            } catch (error: any) {
              await this.showToast(error.message || 'Erro ao fazer logout', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }
}