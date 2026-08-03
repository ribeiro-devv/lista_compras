import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';

import { PrecoPorLoja, PrecoService } from 'src/app/services/preco.service';

/**
 * Onde esse produto sai mais barato. Usa o histórico de preços já registrado
 * por loja — não consulta nada externo.
 */
@Component({
  selector: 'app-comparar-precos-modal',
  templateUrl: './comparar-precos-modal.component.html',
  styleUrls: ['./comparar-precos-modal.component.scss']
})
export class CompararPrecosModalComponent implements OnInit {

  @Input() nomeProduto = '';

  precos: PrecoPorLoja[] = [];
  carregando = true;

  constructor(
    private precoService: PrecoService,
    private modalCtrl: ModalController
  ) {}

  async ngOnInit() {
    try {
      this.precos = await this.precoService.precosPorLoja(this.nomeProduto);
    } finally {
      this.carregando = false;
    }
  }

  /** Quanto essa loja custa a mais que a mais barata. */
  diferencaParaMenor(preco: PrecoPorLoja): number {
    if (this.precos.length === 0) return 0;
    return preco.valor - this.precos[0].valor;
  }

  nomeLoja(preco: PrecoPorLoja): string {
    return preco.loja?.nome || 'Sem loja';
  }

  corLoja(preco: PrecoPorLoja): string {
    return preco.loja?.cor || 'var(--ion-color-medium)';
  }

  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
  }

  formatarData(data: Date): string {
    return new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  }

  fechar() {
    this.modalCtrl.dismiss(null, 'cancel');
  }
}
