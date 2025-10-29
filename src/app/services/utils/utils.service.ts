import { Injectable } from '@angular/core';
import { LoadingController, ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class UtilsService {

  constructor(
    private toastController: ToastController,
    private loadingCtrl: LoadingController
  ) { }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color,
      buttons: [
        {
          side: 'end',
          icon: 'close',
          handler: () => {
            toast.dismiss();
          }
        }
      ]
    });
    toast.present();
  }

  async showLoading(message: string = 'Jogando fora...') {
    const loading = await this.loadingCtrl.create({
      message: message,
      spinner: 'circles', // ou null se quiser só o texto
      cssClass: 'trash-loading',
      showBackdrop: true,
      backdropDismiss: false
    });
    
    await loading.present();
    return loading;
  }

  async showCartLoading(message: string = 'Adicionando ao carrinho...') {
    const loading = await this.loadingCtrl.create({
      message: message,
      spinner: 'circles',
      cssClass: 'cart-loading',
      showBackdrop: true,
      backdropDismiss: false
    });
    
    await loading.present();
    return loading;
  }
}
