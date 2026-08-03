import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { ItemReorderEventDetail } from '@ionic/angular';
import { Router } from '@angular/router';

import {
  Categoria,
  CategoriaService,
  CORES_CATEGORIA,
  ICONES_CATEGORIA
} from 'src/app/services/categoria.service';
import { CATEGORIA_PADRAO_NOME } from 'src/app/services/catalogo.service';

@Component({
  selector: 'app-categorias',
  templateUrl: './categorias.page.html',
  styleUrls: ['./categorias.page.scss'],
})
export class CategoriasPage implements OnInit {

  categorias: Categoria[] = [];
  carregando = true;

  icones = ICONES_CATEGORIA;
  cores = CORES_CATEGORIA;

  // Estado do formulário de criar/editar
  editando: Categoria | null = null;
  formAberto = false;
  nome = '';
  icone = ICONES_CATEGORIA[0];
  cor = CORES_CATEGORIA[0];

  constructor(
    private categoriaService: CategoriaService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private router: Router
  ) {}

  ngOnInit() {
    this.categoriaService.lista$.subscribe(categorias => (this.categorias = categorias));
    this.carregar();
  }

  async carregar() {
    this.carregando = true;
    try {
      await this.categoriaService.carregar();
    } finally {
      this.carregando = false;
    }
  }

  ehPadrao(categoria: Categoria): boolean {
    return categoria.nome === CATEGORIA_PADRAO_NOME;
  }

  // ---- formulário ----

  abrirNova() {
    this.editando = null;
    this.nome = '';
    this.icone = this.icones[0];
    this.cor = this.cores[0];
    this.formAberto = true;
  }

  abrirEdicao(categoria: Categoria) {
    this.editando = categoria;
    this.nome = categoria.nome;
    this.icone = categoria.icone;
    this.cor = categoria.cor;
    this.formAberto = true;
  }

  fecharForm() {
    this.formAberto = false;
    this.editando = null;
  }

  async salvar() {
    const nome = this.nome.trim();
    if (!nome) {
      await this.toast('Dê um nome à categoria', 'warning');
      return;
    }

    try {
      if (this.editando) {
        await this.categoriaService.atualizarAparencia(this.editando.id, this.icone, this.cor);
        if (nome !== this.editando.nome) {
          await this.categoriaService.renomear(this.editando.id, nome);
        }
        await this.toast('Categoria atualizada', 'success');
      } else {
        await this.categoriaService.criar(nome, this.icone, this.cor);
        await this.toast('Categoria criada', 'success');
      }
      this.fecharForm();
    } catch (erro: any) {
      await this.toast(erro?.message || 'Não foi possível salvar', 'danger');
    }
  }

  // ---- exclusão ----

  async confirmarExclusao(categoria: Categoria) {
    if (this.ehPadrao(categoria)) {
      await this.toast(`"${CATEGORIA_PADRAO_NOME}" não pode ser excluída`, 'warning');
      return;
    }

    const destinos = this.categorias.filter(c => c.id !== categoria.id);

    const alert = await this.alertCtrl.create({
      header: `Excluir "${categoria.nome}"`,
      message: 'Para onde vão os itens que estão nesta categoria?',
      mode: 'ios',
      inputs: destinos.map((destino, indice) => ({
        type: 'radio' as const,
        label: destino.nome,
        value: destino.nome,
        checked: destino.nome === CATEGORIA_PADRAO_NOME || (indice === 0 && destinos.length === 1)
      })),
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Excluir',
          handler: (destino: string) => {
            this.excluir(categoria, destino);
          }
        }
      ]
    });

    await alert.present();
  }

  private async excluir(categoria: Categoria, destino: string | null) {
    try {
      await this.categoriaService.excluir(categoria.id, destino);
      await this.toast(`"${categoria.nome}" excluída`, 'success');
    } catch (erro: any) {
      await this.toast(erro?.message || 'Não foi possível excluir', 'danger');
    }
  }

  // ---- reordenação ----

  async reordenar(evento: CustomEvent<ItemReorderEventDetail>) {
    const ordenadas = evento.detail.complete([...this.categorias]) as Categoria[];

    try {
      await this.categoriaService.reordenar(ordenadas.map(c => c.id));
    } catch (erro: any) {
      await this.toast(erro?.message || 'Não foi possível reordenar', 'danger');
      await this.carregar();
    }
  }

  voltar() {
    this.router.navigate(['/settings']);
  }

  private async toast(mensagem: string, cor: string) {
    const toast = await this.toastCtrl.create({
      message: mensagem,
      duration: 2200,
      color: cor,
      position: 'top'
    });
    await toast.present();
  }
}
