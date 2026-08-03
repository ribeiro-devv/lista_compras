import { Component, Input, OnInit } from '@angular/core';
import { AlertController, ModalController } from '@ionic/angular';

import { ItemCompra, ListaCompra } from 'src/app/services/historico.service';
import { subtotalItem } from 'src/app/services/calculo-item';
import { abreviarUnidade } from 'src/app/services/unidades';

interface GrupoDeItens {
  categoria: string;
  itens: ItemCompra[];
  subtotal: number;
}

/**
 * Detalhe de uma lista já arquivada. Substitui o alert de texto que existia
 * antes: agrupa por categoria, permite buscar dentro da lista, restaurar os
 * itens para a lista ativa e excluir do histórico.
 */
@Component({
  selector: 'app-detalhes-lista-modal',
  templateUrl: './detalhes-lista-modal.component.html',
  styleUrls: ['./detalhes-lista-modal.component.scss']
})
export class DetalhesListaModalComponent implements OnInit {

  @Input() lista!: ListaCompra;

  busca = '';
  grupos: GrupoDeItens[] = [];

  constructor(
    private modalCtrl: ModalController,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    this.recomputar();
  }

  onBuscaChange() {
    this.recomputar();
  }

  private recomputar() {
    const termo = this.busca.trim().toLowerCase();
    const itens = termo
      ? this.lista.itens.filter(item => (item.tarefa || '').toLowerCase().includes(termo))
      : this.lista.itens;

    const porCategoria = new Map<string, ItemCompra[]>();
    for (const item of itens) {
      const categoria = item.categoria || 'Outros';
      if (!porCategoria.has(categoria)) porCategoria.set(categoria, []);
      porCategoria.get(categoria)!.push(item);
    }

    this.grupos = Array.from(porCategoria.entries())
      .map(([categoria, itensDoGrupo]) => ({
        categoria,
        itens: itensDoGrupo,
        subtotal: itensDoGrupo.reduce((total, item) => total + this.subtotal(item), 0)
      }))
      .sort((a, b) => a.categoria.localeCompare(b.categoria, 'pt-BR'));
  }

  subtotal(item: ItemCompra): number {
    return subtotalItem(item);
  }

  /** Ex: "2 kg × R$ 10,00". Listas antigas não têm unidade — cai em avulso. */
  rotuloQuantidade(item: ItemCompra): string {
    const abreviacao = abreviarUnidade(item.unidade);
    return abreviacao ? `${item.quantidade} ${abreviacao}` : `${item.quantidade}`;
  }

  temDesconto(item: ItemCompra): boolean {
    return (item.desconto || 0) > 0;
  }

  get totalEncontrado(): number {
    return this.grupos.reduce((total, grupo) => total + grupo.itens.length, 0);
  }

  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
  }

  formatarData(data: string): string {
    if (!data) return '';
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  }

  async restaurar() {
    const alert = await this.alertCtrl.create({
      header: 'Restaurar itens',
      message: `Adicionar os ${this.lista.itens.length} itens desta lista à sua lista atual? `
        + 'Eles entram como não comprados. Esta lista continua no histórico.',
      mode: 'ios',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Restaurar',
          handler: () => this.modalCtrl.dismiss({ acao: 'restaurar', lista: this.lista }, 'confirm')
        }
      ]
    });
    await alert.present();
  }

  async excluir() {
    const alert = await this.alertCtrl.create({
      header: 'Excluir do histórico',
      message: `"${this.lista.nome}" sai do histórico e deixa de contar nas estatísticas. `
        + 'Não dá para desfazer.',
      mode: 'ios',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Excluir',
          cssClass: 'action-delete',
          handler: () => this.modalCtrl.dismiss({ acao: 'excluir', lista: this.lista }, 'confirm')
        }
      ]
    });
    await alert.present();
  }

  fechar() {
    this.modalCtrl.dismiss(null, 'cancel');
  }
}
