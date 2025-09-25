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
  @ViewChild('nomeProdutoInput', { static: false }) nomeProdutoInput!: IonInput;

  constructor(private fb: FormBuilder, private modalCtrl: ModalController) {
    this.produtoForm = this.fb.group({
      tarefa: ['', Validators.required],
      quantidade: [null, [Validators.min(0)]],
      valorUnitario: [null, [Validators.min(0)]], 
    });
  }

  ngOnInit() {}

  ngAfterViewInit() {
    setTimeout(() => {
      this.nomeProdutoInput?.setFocus();
    }, 300);
  }

  formatarMoeda(event: any) {
    const input = event.target;
    let value = input.value;

    // Se o campo estiver vazio, define o valor do formulário como null e encerra
    if (!value) {
      this.produtoForm.get('valorUnitario')?.setValue(null);
      return;
    }

    value = value.replace(/\D/g, ''); // Remove tudo que não for dígito
    const numero = Number(value) / 100; // Converte para número (ex: "1250" -> 12.50)

    // Atualiza o formulário com o número puro
    this.produtoForm.get('valorUnitario')?.setValue(numero, { emitEvent: false });
    
    // Atualiza o campo de input com o valor formatado para o usuário ver
    input.value = numero.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  }

  salvar() {
    if (this.produtoForm.valid) {
      const dados = this.produtoForm.value;

      console.log(dados)
      
      if (dados.valorUnitario === null) {
        dados.valorUnitario = 0;
      }

      if (dados.quantidade === null) {
        dados.quantidade = 0;
      }

      this.modalCtrl.dismiss(dados, 'confirm');
    }
  }

  dismiss() {
    this.modalCtrl.dismiss(null, 'cancel');
  }
}