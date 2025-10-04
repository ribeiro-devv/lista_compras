import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { UtilsService } from 'src/app/services/utils/utils.service';

@Component({
  selector: 'app-pix-modal',
  templateUrl: './pix-modal.component.html',
  styleUrls: ['./pix-modal.component.scss'],
})
export class PixModalComponent implements OnInit {

  pixKey: string = 'teste_zezinho_123';

  constructor(
    private modalCtrl: ModalController,
    private service: UtilsService
  ) { }

  fechar() {
    this.modalCtrl.dismiss();
  }

  copiarPix() {
    navigator.clipboard.writeText(this.pixKey).then(() => {
      this.service.showToast(`Chave PIX copiada com sucesso!`, 'success');
      this.fechar();
    });
  }

  ngOnInit() {}

}
