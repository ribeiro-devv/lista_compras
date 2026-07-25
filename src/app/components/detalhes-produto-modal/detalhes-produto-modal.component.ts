import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { PrecoService, PrecoHistorico } from 'src/app/services/preco.service';

@Component({
  selector: 'app-detalhes-produto-modal',
  templateUrl: './detalhes-produto-modal.component.html',
  styleUrls: ['./detalhes-produto-modal.component.scss'],
})
export class DetalhesProdutoModalComponent implements OnInit {

  @Input() tarefa: any;
  subtotal: number = 0;
  historico: PrecoHistorico[] = [];

  constructor(private modalCtrl: ModalController, private precoService: PrecoService) {}

  async ngOnInit() {
    if (this.tarefa) {
      this.subtotal = (this.tarefa.quantidade || 0) * (this.tarefa.valorUnitario || 0);
      this.historico = await this.precoService.obterHistorico(this.tarefa.tarefa);
    }
  }

  variacao(): number | null {
    if (this.historico.length < 2) return null;
    const atual = this.historico[0].valor;
    const anterior = this.historico[1].valor;
    if (anterior === 0) return null;
    return ((atual - anterior) / anterior) * 100;
  }

  formatarData(d: Date): string {
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
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