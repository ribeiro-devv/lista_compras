import { Component } from '@angular/core';
import { ActionSheetController, AlertController } from '@ionic/angular';
import { TarefaService } from 'src/app/services/tarefa.service';
import { AddProdutoModalComponent } from 'src/app/components/add-produto-modal/add-produto-modal.component';
import { ModalController } from '@ionic/angular';
import { EditProdutoModalComponent } from 'src/app/components/edit-produto-modal/edit-produto-modal.component';
import { InformacoesModalComponent } from 'src/app/components/informacoes-modal/informacoes-modal.component';
import { TourService } from 'src/app/services/tour.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  tarefaCollection: any[] = [];

  constructor(
    private alertCtrl: AlertController,
    private tarefaService: TarefaService,
    private actionSheetCtrl: ActionSheetController,
    private modalCtrl: ModalController,
    private router: Router,
    private tourService: TourService
  ) { }

  ionViewDidEnter() {
    this.listarTarefa();
    this.checkFirstAccess();
    this.loadThemeSettings();
  }

  loadThemeSettings() {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      document.body.classList.toggle('dark', settings.darkMode);
    }
  }

  openSettings() {
    this.router.navigate(['/settings']);
  }


  checkFirstAccess() {
    if (!this.tourService.isTourCompletedOnce()) {
      setTimeout(() => {
        this.tourService.startTour();
      }, 1000);
    }
  }

  listarTarefa() {
    this.tarefaCollection = this.tarefaService.listar();
  }

  trackByFn(index: number, item: any) {
    return item.codigo ? item.codigo : index;
  }

  async showAdd() {
    const modal = await this.modalCtrl.create({
      component: AddProdutoModalComponent,
      componentProps: {},
      cssClass: 'add-produto-modal',
      backdropDismiss: false
    });
  
    modal.onDidDismiss().then((result) => {
      if (result.role === 'confirm') {
        const dados = result.data;
        // Validação
        if (!dados.tarefa || dados.tarefa.trim() === '') {
          this.showSimpleAlert('O nome do produto não pode estar vazio');
          return;
        }
  
        if (!dados.quantidade || dados.quantidade <= 0) {
          dados.quantidade = 0;
        }
  
        console.log(dados.valorUnitario)
        if (!dados.valorUnitario || dados.valorUnitario < 0) {
          dados.valorUnitario = 0;
        }
  
        this.tarefaService.salvar(dados, () => {
          this.listarTarefa();
        });
      }
    });
  
    await modal.present();
  }

  async delete(item: any) {
    const alert = await this.alertCtrl.create({
      header: 'Confirmar Exclusão',
      message: `Deseja excluir "${item.tarefa}" da lista?`,
      mode: 'ios',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Excluir',
          cssClass: 'danger',
          handler: () => {
            this.tarefaService.excluir(item, () => {
              this.listarTarefa();
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async editar(tarefa: any) {
    const modal = await this.modalCtrl.create({
      component: EditProdutoModalComponent,
      componentProps: { tarefa },
      cssClass: 'add-produto-modal',
      backdropDismiss: false
    });

    modal.onDidDismiss().then((result) => {
      if (result.role === 'confirm') {
        const dadosEditados = result.data;
        if (!dadosEditados.tarefa || dadosEditados.tarefa.trim() === '') {
          this.showSimpleAlert('O nome do produto não pode estar vazio');
          return;
        }
        dadosEditados.codigo = tarefa.codigo;
        this.tarefaService.edicao(dadosEditados, () => {
          this.listarTarefa();
        });
      }
    });

    await modal.present();
  }

  async openActions(tarefa: any) {
    const buttons = [];

    buttons.push({
      text: tarefa.feito ? 'Remover do Carrinho' : 'Adicionar no Carrinho',
      icon: tarefa.feito ? 'close-circle' : 'checkmark-circle',
      handler: () => {
        if (!tarefa.feito) {
          this.solicitarValorUnitario(tarefa);
        } else {
          tarefa.feito = !tarefa.feito;
          this.tarefaService.atualizar(tarefa, () => {
            this.listarTarefa();
          });
        }
      }
    });

    if (!tarefa.feito) {
      buttons.push({
        text: 'Editar Produto',
        icon: 'pencil',
        handler: () => {
          this.editar(tarefa);
        }
      });
    }

    buttons.push({
      text: 'Excluir Produto',
      icon: 'trash',
      handler: () => {
        this.delete(tarefa);
      }
    });

    // Botão cancelar
    buttons.push({
      text: 'Cancelar',
      icon: 'close',
      role: 'cancel'
    });

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'O que deseja fazer?',
      mode: 'ios',
      buttons: buttons
    });

    await actionSheet.present();
  }

  

  async showExclusion() {
    const alert = await this.alertCtrl.create({
      header: 'Excluir Todos os Produtos?',
      message: 'Esta ação não pode ser desfeita.',
      mode: 'ios',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Excluir Tudo',
          cssClass: 'danger',
          handler: () => {
            this.tarefaService.excluirTodos(() => {
              this.listarTarefa();
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async showPix() {
    const alert = await this.alertCtrl.create({
      header: 'Quer Doar?',
      subHeader: 'Ajude a manter esse projeto no ar!',
      message: '🙏 <br><br> Pix:',
      mode: 'ios',
      inputs: [
        {
          value: 'matheus.ribeiro6611@gmail.com',
          disabled: true
        }
      ],
      buttons: [
        {
          text: 'Copiar chave Pix',
          handler: () => {
            const chave = 'matheus.ribeiro6611@gmail.com';
            navigator.clipboard.writeText(chave).then(() => {
              this.showSimpleAlert('Chave PIX copiada!');
            });
          }
        }
      ]
    });
    await alert.present();
  }

  // Método auxiliar para alertas simples
  private async showSimpleAlert(message: string) {
    const alert = await this.alertCtrl.create({
      header: 'Atenção',
      message: message,
      mode: 'ios',
      buttons: ['OK']
    });
    await alert.present();
  }

  // Métodos para cálculos de valores
  getTotalGeral(): number {
    return this.tarefaService.calcularTotalGeral();
  }

  getTotalComprado(): number {
    return this.tarefaService.calcularTotalComprado();
  }

  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  calcularSubtotal(item: any): number {
    const quantidade = parseFloat(item.quantidade) || 0;
    const valorUnitario = parseFloat(item.valorUnitario) || 0;
    return quantidade * valorUnitario;
  }

  async solicitarValorUnitario(tarefa: any) {
    const modal = await this.modalCtrl.create({
      component: InformacoesModalComponent,
      componentProps: { tarefa },
      cssClass: 'add-produto-modal',
      backdropDismiss: false
    });
  
    modal.onDidDismiss().then((result) => {
      if (result.role === 'confirm') {
        const dados = result.data;
        if (dados.valorUnitario !== undefined && dados.valorUnitario !== null && !isNaN(dados.valorUnitario)) {
          tarefa.feito = true;
          tarefa.valorUnitario = dados.valorUnitario;
          tarefa.quantidade = dados.quantidade
          this.tarefaService.atualizar(tarefa, () => {
            this.listarTarefa();
          });
        }
      }
    });
  
    await modal.present();
  }

  restartTour() {
    this.tourService.resetTour();
    setTimeout(() => {
      this.tourService.startTour();
    }, 500);
  }
}