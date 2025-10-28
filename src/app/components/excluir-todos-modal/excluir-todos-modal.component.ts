import { Component, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-excluir-todos-modal',
  templateUrl: './excluir-todos-modal.component.html',
  styleUrls: ['./excluir-todos-modal.component.scss'],
})
export class ExcluirTodosModalComponent implements OnInit {

  constructor(
    private modalCtrl: ModalController,
  ) { }

  ngOnInit() {}

  fechar() {
    this.modalCtrl.dismiss();
  }

  excluirTodos() {
    this.modalCtrl.dismiss(null, 'confirm');
  }
}
