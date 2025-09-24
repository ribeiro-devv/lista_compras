import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-edit-produto-modal',
  templateUrl: './edit-produto-modal.component.html',
  styleUrls: ['./edit-produto-modal.component.scss'],
})
export class EditProdutoModalComponent implements OnInit {
  @Input() tarefa: any;
  produtoForm: FormGroup;

  constructor(private fb: FormBuilder, private modalCtrl: ModalController) {
    this.produtoForm = this.fb.group({
      codigo: [{ value: '', disabled: true }],
      tarefa: ['', Validators.required],
      quantidade: [1, [Validators.required, Validators.min(1)]],
      valorUnitario: [null, [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit() {
    if (this.tarefa) {
      this.produtoForm.patchValue({
        codigo: this.tarefa.codigo,
        tarefa: this.tarefa.tarefa,
        quantidade: this.tarefa.quantidade,
        valorUnitario: this.tarefa.valorUnitario,
      });
      // Formata o valor inicial para exibição
      this.formatarValorInicial();
    }
  }
  
  // Exibe o valor formatado quando o modal é aberto
  formatarValorInicial() {
    const control = this.produtoForm.get('valorUnitario');
    if (control && control.value !== null) {
      const valorNumerico = control.value;
      const valorFormatado = valorNumerico.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      // Usamos 'setValue' para atualizar a view do input
      control.setValue(valorFormatado, { emitEvent: false }); 
    }
  }

  // Função chamada a cada dígito no campo de valor
  // formatarMoeda(event: any) {
  //   const input = event.target;
  //   let value = input.value;
  //   value = value.replace(/\D/g, '');
  //   const numero = Number(value) / 100;
  //   this.produtoForm.get('valorUnitario')?.setValue(numero, { emitEvent: false });
  //   input.value = numero.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  // }

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