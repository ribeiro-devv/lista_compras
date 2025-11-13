import { Component } from '@angular/core';
import { ActionSheetController, AlertController, ToastController } from '@ionic/angular';
import { TarefaService } from 'src/app/services/tarefa.service';
import { AddProdutoModalComponent } from 'src/app/components/add-produto-modal/add-produto-modal.component';
import { ModalController } from '@ionic/angular';
import { EditProdutoModalComponent } from 'src/app/components/edit-produto-modal/edit-produto-modal.component';
import { InformacoesModalComponent } from 'src/app/components/informacoes-modal/informacoes-modal.component';
import { TourService } from 'src/app/services/tour.service';
import { Router } from '@angular/router';
import { DetalhesProdutoModalComponent } from 'src/app/components/detalhes-produto-modal/detalhes-produto-modal.component';
import { UtilsService } from 'src/app/services/utils/utils.service';
import { ExcluirTodosModalComponent } from 'src/app/components/excluir-todos-modal/excluir-todos-modal.component';

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
    private tourService: TourService,
    private utilsService: UtilsService 
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

  openHistorico() {
    this.router.navigate(['/historico']);
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
  
    modal.onDidDismiss().then(async (result) => {
      if (result.role === 'confirm') {
        const dados = result.data;

        if (!dados.tarefa || dados.tarefa.trim() === '') {
          this.showSimpleAlert('O nome do produto não pode estar vazio');
          return;
        }
  
        if (!dados.quantidade || dados.quantidade <= 0) {
          dados.quantidade = 0;
        }
  
        if (!dados.valorUnitario || dados.valorUnitario < 0) {
          dados.valorUnitario = 0;
        }

        dados.feito = dados.feito ?? false;

        if (dados.feito) {
          const loading = await this.utilsService.showCartLoading('Adicionando ao carrinho...');
          setTimeout(() => {
            this.tarefaService.salvar(dados, () => {
              this.listarTarefa();
              this.utilsService.showToast(`Produto ${dados.tarefa} adicionado na lista com sucesso`, 'success');
              if (loading) loading.dismiss();
            });
          }, 1000);
        } else {
          this.tarefaService.salvar(dados, () => {
            this.listarTarefa();
            this.utilsService.showToast(`Produto ${dados.tarefa} adicionado na lista com sucesso`, 'success');
          });
        }
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
              this.utilsService.showToast(`Produto ${item.tarefa} removido na lista com sucesso`, 'success');
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
          this.utilsService.showToast(`O nome do produto não pode estar vazio`, 'danger');
          return;
        }
        dadosEditados.codigo = tarefa.codigo;
        this.tarefaService.edicao(dadosEditados, () => {
          this.listarTarefa();
          this.utilsService.showToast(`Produto ${dadosEditados.tarefa} editada com sucesso`, 'success');
        });
      }
    });

    await modal.present();
  }

  async solicitarValorUnitario(tarefa: any) {
    const modal = await this.modalCtrl.create({
      component: InformacoesModalComponent,
      componentProps: { tarefa },
      cssClass: 'add-produto-modal',
      backdropDismiss: false
    });
  
    modal.onDidDismiss().then(async (result) => {
      if (result.role === 'confirm') {
        const dados = result.data;
        if (dados.valorUnitario !== undefined && dados.valorUnitario !== null && !isNaN(dados.valorUnitario)) {
          const loading = await this.utilsService.showCartLoading('Adicionando ao carrinho...');
          tarefa.feito = true;
          tarefa.valorUnitario = dados.valorUnitario;
          tarefa.quantidade = dados.quantidade
          setTimeout(() => {
            this.tarefaService.atualizar(tarefa, () => {
              this.listarTarefa();
              this.utilsService.showToast(`Produto ${tarefa.tarefa} adicionado ao carrinho!`, 'success');
              if (loading) loading.dismiss();
            });
          }, 1000);
        }
      }
    });
    await modal.present();
  }

  async showExclusion() {
    const modal = await this.modalCtrl.create({
      component: ExcluirTodosModalComponent,
      componentProps: {},
      cssClass: 'add-produto-modal',
      backdropDismiss: false
    });   

    modal.onDidDismiss().then(async (result)  => {
      if (result.role === 'confirm') {
        const loading = await this.utilsService.showLoading('Excluindo todos...');
        
        setTimeout(() => {
          this.tarefaService.excluirTodos(() => {
            this.listarTarefa();
            this.utilsService.showToast(`Todos os produtos foram excluídos com sucesso`, 'success');
            if (loading) loading.dismiss();
          });
        }, 1000);
      }
    });

    await modal.present();

    // const alert = await this.alertCtrl.create({
    //   header: 'Excluir Todos os Produtos?',
    //   message: 'Esta ação não pode ser desfeita.',
    //   mode: 'ios',
    //   buttons: [
    //     {
    //       text: 'Cancelar',
    //       role: 'cancel',
    //       cssClass: 'secondary'
    //     },
    //     {
    //       text: 'Excluir Tudo',
    //       cssClass: 'danger',
    //       handler: () => {
    //         this.tarefaService.excluirTodos(() => {
    //           this.listarTarefa();
    //         });
    //       }
    //     }
    //   ]
    // });
    // await alert.present();
  }

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

  restartTour() {
    this.tourService.resetTour();
    setTimeout(() => {
      this.tourService.startTour();
    }, 500);
  }

  async openActions(tarefa: any) {
    const actionSheet = await this.actionSheetCtrl.create({
      header: `Ações para "${tarefa.tarefa}"`,
      subHeader: tarefa.feito ? 'Item já adicionado ao carrinho' : 'Item não adicionado no carrinho',
      cssClass: 'custom-action-sheet',
      mode: 'ios',
      buttons: [
        {
          text: tarefa.feito ? 'Remover do Carrinho' : 'Adicionar ao Carrinho',
          icon: tarefa.feito ? 'remove-circle' : 'checkmark-circle',
          cssClass: tarefa.feito ? 'action-remove' : 'action-add',
          handler: () => {
            if (!tarefa.feito) {
              this.adicionarAoCarrinho(tarefa);
            } else {
              this.removerDoCarrinho(tarefa);
            }
          }
        },
        
        ...(tarefa.feito ? [] : [{
          text: 'Editar Produto',
          icon: 'pencil',
          cssClass: 'action-edit',
          handler: () => {
            this.editar(tarefa);
          }
        }]),

        {
          text: 'Ver Detalhes',
          icon: 'information-circle',
          cssClass: 'action-info',
          handler: () => {
            this.mostrarDetalhes(tarefa);
          }
        },

        {
          text: '',
          icon: '',
          cssClass: 'action-separator',
          handler: () => false
        },

        {
          text: 'Excluir Produto',
          icon: 'trash',
          cssClass: 'action-delete',
          handler: () => {
            this.delete(tarefa);
          }
        },

        {
          text: 'Cancelar',
          icon: 'close',
          role: 'cancel',
          cssClass: 'action-cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  private adicionarAoCarrinho(tarefa: any) {
    this.solicitarValorUnitario(tarefa);
  }

  async removerDoCarrinho(tarefa: any) {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Remover do Carrinho',
      subHeader: `Deseja remover "${tarefa.tarefa}" do carrinho?`,
      mode: 'ios',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Remover',
          cssClass: 'danger',
          handler: () => {
            tarefa.feito = false;
            this.tarefaService.atualizar(tarefa, () => {
              this.listarTarefa();
              this.utilsService.showToast(`Produto ${tarefa.tarefa} removido do carrinho`, 'warning');
            });
          }
        }
      ]
    });
    await actionSheet.present();
  }

  async mostrarDetalhes(tarefa: any) {
    const modal = await this.modalCtrl.create({
      component: DetalhesProdutoModalComponent,
      componentProps: { tarefa },
      cssClass: 'add-produto-modal',
      backdropDismiss: false
    });
  
    modal.onDidDismiss().then(result => {
      if (result.role === 'editar') {
        this.editar(result.data);
      }
    });
  
    await modal.present();
  }

  private async showSimpleAlert(message: string) {
    const alert = await this.alertCtrl.create({
      header: 'Atenção',
      message: message,
      mode: 'ios',
      buttons: ['OK']
    });
    await alert.present();
  }

  // Método para verificar se a lista está completa
  isListaCompleta(): boolean {
    return this.tarefaService.isListaCompleta();
  }

  // Método para arquivar a lista
  async arquivarLista() {
    const alert = await this.alertCtrl.create({
      header: 'Arquivar Lista',
      message: 'Deseja arquivar esta lista no histórico? Ela será salva e a lista atual será limpa.',
      mode: 'ios',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Arquivar',
          handler: async () => {
            try {
              const loading = await this.utilsService.showLoading('Arquivando lista...');

              const listaArquivada = await this.tarefaService.arquivarListaAtual();
              
              if (loading) await loading.dismiss();
              this.listarTarefa();
              this.utilsService.showToast(`Lista "${listaArquivada.nome}" arquivada com sucesso!`, 'success');
            } catch (error) {
              this.utilsService.showToast(`Erro ao arquivar a lista. Tente novamente.`, 'danger');
            }
          }
        }
      ]
    });
    await alert.present();
  }


  async showComingSoon(feature: string) {
    const alert = await this.alertCtrl.create({
      header: 'Em Breve',
      message: `A funcionalidade "${feature}" estará disponível em breve!`,
      mode: 'ios',
      buttons: ['OK']
    });
    await alert.present();
  }

}



