import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { PixModalComponent } from 'src/app/components/pix-modal/pix-modal.component';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {

  userProfile = {
    name: 'Matheus Ribeiro',
    email: 'usuario@exemplo.com',
    avatar: 'assets/rede.jpeg'
  };

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
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.loadUserData();
    this.loadAppSettings();
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
    this.showToast('Configurações salvas!');
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

  async showToast(message: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color: 'success'
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
    // const alert = await this.alertCtrl.create({
    //   header: 'Quer Doar?',
    //   subHeader: 'Ajude a manter esse projeto no ar!',
    //   message: '🙏 <br><br> Pix:',
    //   mode: 'ios',
    //   inputs: [
    //     {
    //       value: 'matheus.ribeiro6611@gmail.com',
    //       disabled: true
    //     }
    //   ],
    //   buttons: [
    //     {
    //       text: 'Copiar chave Pix',
    //       handler: () => {
    //         const chave = 'matheus.ribeiro6611@gmail.com';
    //         navigator.clipboard.writeText(chave).then(() => {
    //           this.showSimpleAlert('Chave PIX copiada!');
    //         });
    //       }
    //     }
    //   ]
    // });
    // await alert.present();
  }
}