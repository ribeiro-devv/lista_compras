import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-pix-modal',
  templateUrl: './pix-modal.component.html',
  styleUrls: ['./pix-modal.component.scss'],
})
export class PixModalComponent implements OnInit {

  pixKey: string = 'teste_zezinho_123';

  constructor(
    private modalCtrl: ModalController
  ) { }

  fechar() {
    this.modalCtrl.dismiss();
  }

  copiarPix() {
    navigator.clipboard.writeText(this.pixKey).then(() => {
      alert('Chave PIX copiada!');
    });
  }

  ngOnInit() {}

}
