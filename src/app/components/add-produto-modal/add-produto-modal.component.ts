import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, IonInput } from '@ionic/angular';

@Component({
  selector: 'app-add-produto-modal',
  templateUrl: './add-produto-modal.component.html',
  styleUrls: ['./add-produto-modal.component.scss'],
})
export class AddProdutoModalComponent implements OnInit, AfterViewInit {

  produtoForm: FormGroup;

  // Referência ao primeiro input
  @ViewChild('nomeProduto', { static: false }) nomeProdutoInput!: IonInput;

  constructor(private fb: FormBuilder, private modalCtrl: ModalController) {
    this.produtoForm = this.fb.group({
      tarefa: ['', Validators.required],
      quantidade: ['', [Validators.required, Validators.min(1)]],
      valorUnitario: ['', [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit() {}

  ngAfterViewInit() {
    // Dá um pequeno delay para o modal abrir antes de setar o foco
    setTimeout(() => {
      this.nomeProdutoInput?.setFocus();
    }, 300);
  }

  formatarMoeda(event: any) {
    let valor = event.target.value.replace(/[^\d]/g, ''); // Remove tudo exceto números
    if (valor) {
      const numero = parseFloat(valor) / 100;
      valor = numero.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      this.produtoForm.get('valorUnitario')?.setValue(valor, { emitEvent: false });
    } else {
      this.produtoForm.get('valorUnitario')?.setValue('0,00', { emitEvent: false });
    }
  }

  salvar() {
    if (this.produtoForm.valid) {
      const dados = this.produtoForm.value;
      // Converte o valor formatado de volta para número
      dados.valorUnitario = parseFloat(
        dados.valorUnitario.replace(/R\$\s?/, '').replace(/\./g, '').replace(',', '.')
      );
      this.modalCtrl.dismiss(dados, 'confirm');
    }
  }

  dismiss() {
    this.modalCtrl.dismiss(null, 'cancel');
  }
}
