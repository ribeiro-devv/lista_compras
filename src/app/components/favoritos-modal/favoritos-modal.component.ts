import { Component, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { CatalogoService, ProdutoCatalogo } from 'src/app/services/catalogo.service';
import { TarefaService } from 'src/app/services/tarefa.service';

@Component({
  selector: 'app-favoritos-modal',
  templateUrl: './favoritos-modal.component.html',
  styleUrls: ['./favoritos-modal.component.scss'],
})
export class FavoritosModalComponent implements OnInit {
  segmento: 'favoritos' | 'usados' | 'todos' = 'favoritos';
  termoBusca = '';
  produtos: ProdutoCatalogo[] = [];

  constructor(
    private modalCtrl: ModalController,
    private catalogoService: CatalogoService,
    private tarefaService: TarefaService,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.atualizar();
  }

  atualizar() {
    if (this.termoBusca.trim()) {
      this.produtos = this.catalogoService.buscarProdutos(this.termoBusca.trim());
      return;
    }
    if (this.segmento === 'favoritos') {
      this.produtos = this.catalogoService.obterFavoritos();
    } else if (this.segmento === 'usados') {
      this.produtos = this.catalogoService.obterMaisUsados(30);
    } else {
      this.produtos = this.catalogoService.obterCatalogo()
        .sort((a, b) => a.nome.localeCompare(b.nome));
    }
  }

  onSegmentChange() {
    this.termoBusca = '';
    this.atualizar();
  }

  toggleFavorito(produto: ProdutoCatalogo, ev: Event) {
    ev.stopPropagation();
    this.catalogoService.alternarFavorito(produto.id);
    this.atualizar();
  }

  async adicionar(produto: ProdutoCatalogo) {
    this.catalogoService.registrarUso(produto.id);
    await this.tarefaService.salvar({
      tarefa: produto.nome,
      quantidade: 1,
      valorUnitario: produto.precoMedio || 0,
      feito: false
    });
    const toast = await this.toastCtrl.create({
      message: `${produto.nome} adicionado à lista`,
      duration: 1500,
      position: 'top',
      color: 'success'
    });
    await toast.present();
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}
