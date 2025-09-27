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
      quantidade: [null, [Validators.required, Validators.min(0)]],
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
      this.formatarValorInicial();
    }
  }
  
  formatarValorInicial() {
    const control = this.produtoForm.get('valorUnitario');
    if (control && control.value !== null) {
      const valorNumerico = control.value;
      const valorFormatado = Number(valorNumerico).toLocaleString('pt-BR', {
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
      this.produtoForm.markAllAsTouched();
      return;
    }

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