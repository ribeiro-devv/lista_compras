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

  @ViewChild('nomeProdutoInput', { static: false }) nomeProdutoInput!: IonInput;

  constructor(private fb: FormBuilder, private modalCtrl: ModalController) {
    this.produtoForm = this.fb.group({
      tarefa: ['', Validators.required],
      quantidade: [null, [Validators.min(0)]],
      valorUnitario: [null, [Validators.min(0.00)]],
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

    const dados = this.produtoForm.value;

    const valorLimpo = String(dados.valorUnitario).replace(/[^\d,.-]/g, '').replace(',', '.');

    const retorno = {
      tarefa: dados.tarefa,
      quantidade: dados.quantidade ?? 0,
      valorUnitario: Number(valorLimpo),
      feito: false,
      
    };
    this.modalCtrl.dismiss(retorno, 'confirm');
  }

  dismiss() {
    this.modalCtrl.dismiss(null, 'cancel');
  }
}
