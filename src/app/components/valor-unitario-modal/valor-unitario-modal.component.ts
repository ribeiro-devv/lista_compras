import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-valor-unitario-modal',
  templateUrl: './valor-unitario-modal.component.html',
  styleUrls: ['./valor-unitario-modal.component.scss'],
})
export class ValorUnitarioModalComponent implements OnInit {
  @Input() tarefa: any;
  produtoForm: FormGroup;
  
  // <<< NOVO: Propriedade para controlar a exibição do campo de quantidade
  mostrarCampoQuantidade = false;

  constructor(private fb: FormBuilder, private modalCtrl: ModalController) {
    // Começa o formulário apenas com o valor unitário
    this.produtoForm = this.fb.group({
      valorUnitario: [null, [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit() {
    // <<< LÓGICA ATUALIZADA
    // Verifica se a tarefa não tem uma quantidade válida
    if (!this.tarefa || !this.tarefa.quantidade || this.tarefa.quantidade <= 0) {
      this.mostrarCampoQuantidade = true;
      // Adiciona o campo 'quantidade' ao formulário dinamicamente
      this.produtoForm.addControl(
        'quantidade', 
        new FormControl('', [Validators.required, Validators.min(1)])
      );
    }
    
    // Preenche o valor unitário se ele já existir
    if (this.tarefa && this.tarefa.valorUnitario) {
      this.produtoForm.patchValue({
        valorUnitario: this.tarefa.valorUnitario,
      });
    }

    this.formatarValorInicial();
  }
  
  formatarValorInicial() {
    const control = this.produtoForm.get('valorUnitario');
    if (control && control.value !== null) {
      const valorNumerico = Number(control.value) || 0;
      const valorFormatado = valorNumerico.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
      control.setValue(valorFormatado, { emitEvent: false }); 
    }
  }

  formatarMoeda(event: any) {
    const input = event.target;
    let value = input.value.replace(/\D/g, '');
    
    if (value) {
      const numero = Number(value) / 100;
      const valorFormatado = numero.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
      input.value = valorFormatado;
      this.produtoForm.get('valorUnitario')?.setValue(valorFormatado, { emitEvent: false });
    } else {
      input.value = '';
      this.produtoForm.get('valorUnitario')?.setValue(null, { emitEvent: false });
    }
  }

  salvar() {
    if (this.produtoForm.invalid) {
      this.produtoForm.markAllAsTouched(); // força exibir erros
      return;
    }
    if (this.produtoForm.valid) {
      // Pega todos os valores do formulário (pode incluir 'quantidade' ou não)
      const formValue = this.produtoForm.value;
      
      const valorNumerico = parseFloat(
        String(formValue.valorUnitario)
          .replace('R$', '')
          .replace(/\./g, '')
          .replace(',', '.')
          .trim()
      );
      
      // <<< MUDANÇA: Monta o objeto de retorno dinamicamente
      const dadosRetorno: { valorUnitario: number; quantidade?: number } = {
        valorUnitario: valorNumerico
      };

      // Se a quantidade foi adicionada ao formulário, inclui ela no retorno
      if (formValue.quantidade) {
        dadosRetorno.quantidade = formValue.quantidade;
      }
      
      this.modalCtrl.dismiss(dadosRetorno, 'confirm');
    }
  }

  dismiss() {
    this.modalCtrl.dismiss(null, 'cancel');
  }
}