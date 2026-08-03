import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';

import { CORES_LOJA, Loja, LojaService } from 'src/app/services/loja.service';

@Component({
  selector: 'app-lojas',
  templateUrl: './lojas.page.html',
  styleUrls: ['./lojas.page.scss'],
})
export class LojasPage implements OnInit {

  lojas: Loja[] = [];
  carregando = true;
  cores = CORES_LOJA;

  lojaAtualId: string | null = null;

  // Formulário
  formAberto = false;
  editando: Loja | null = null;
  nome = '';
  cor = CORES_LOJA[0];

  constructor(
    private lojaService: LojaService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private router: Router
  ) {}

  ngOnInit() {
    this.lojaService.lista$.subscribe(lojas => (this.lojas = lojas));
    this.carregar();
  }

  async carregar() {
    this.carregando = true;
    try {
      await this.lojaService.carregar();
      this.lojaAtualId = this.lojaService.lojaAtualId();
    } finally {
      this.carregando = false;
    }
  }

  selecionarComoAtual(loja: Loja) {
    const jaEra = this.lojaAtualId === loja.id;
    this.lojaService.definirLojaAtual(jaEra ? null : loja.id);
    this.lojaAtualId = this.lojaService.lojaAtualId();
    this.toast(
      jaEra ? 'Nenhuma loja selecionada' : `Comprando em ${loja.nome}`,
      'success'
    );
  }

  // ---- formulário ----

  abrirNova() {
    this.editando = null;
    this.nome = '';
    this.cor = this.cores[0];
    this.formAberto = true;
  }

  abrirEdicao(loja: Loja) {
    this.editando = loja;
    this.nome = loja.nome;
    this.cor = loja.cor;
    this.formAberto = true;
  }

  fecharForm() {
    this.formAberto = false;
    this.editando = null;
  }

  async salvar() {
    const nome = this.nome.trim();
    if (!nome) {
      await this.toast('Dê um nome à loja', 'warning');
      return;
    }

    try {
      if (this.editando) {
        await this.lojaService.atualizar(this.editando.id, nome, this.cor);
        await this.toast('Loja atualizada', 'success');
      } else {
        await this.lojaService.criar(nome, this.cor);
        await this.toast('Loja criada', 'success');
      }
      this.fecharForm();
    } catch (erro: any) {
      await this.toast(erro?.message || 'Não foi possível salvar', 'danger');
    }
  }

  async confirmarExclusao(loja: Loja) {
    const alert = await this.alertCtrl.create({
      header: `Excluir "${loja.nome}"`,
      message: 'O histórico de preços registrado nesta loja continua guardado, '
        + 'mas passa a aparecer como "Sem loja".',
      mode: 'ios',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Excluir', handler: () => this.excluir(loja) }
      ]
    });
    await alert.present();
  }

  private async excluir(loja: Loja) {
    try {
      await this.lojaService.excluir(loja.id);
      this.lojaAtualId = this.lojaService.lojaAtualId();
      await this.toast(`"${loja.nome}" excluída`, 'success');
    } catch (erro: any) {
      await this.toast(erro?.message || 'Não foi possível excluir', 'danger');
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
