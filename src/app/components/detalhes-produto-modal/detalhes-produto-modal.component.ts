import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-detalhes-produto-modal',
  templateUrl: './detalhes-produto-modal.component.html',
  styleUrls: ['./detalhes-produto-modal.component.scss'],
})
export class DetalhesProdutoModalComponent implements OnInit {

  @Input() tarefa: any;
  subtotal: number = 0;

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    if (this.tarefa) {
      this.subtotal = (this.tarefa.quantidade || 0) * (this.tarefa.valorUnitario || 0);
    }
  }

  formatarMoeda(valor: number): string {
    if (!valor) return 'R$ 0,00';
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }

  formataStatus(status: boolean): string {
    if (!status) return 'Não adicionado no carrinho';
    return 'Adicionado no carrinho';
  }

  editar() {
    this.modalCtrl.dismiss(this.tarefa, 'editar');
  }

  dismiss() {
    this.modalCtrl.dismiss(null, 'cancel');
  }
}