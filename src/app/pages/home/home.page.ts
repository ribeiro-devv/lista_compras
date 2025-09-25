import { Component } from '@angular/core';
import { ActionSheetController, AlertController, LoadingController, ToastController } from '@ionic/angular';
import { readTask } from 'ionicons/dist/types/stencil-public-runtime';
import { from } from 'rxjs';
import { TarefaService } from 'src/app/services/tarefa.service';
import { AddProdutoModalComponent } from 'src/app/components/add-produto-modal/add-produto-modal.component';
import { ModalController } from '@ionic/angular';
import { ReactiveFormsModule } from '@angular/forms';
import { EditProdutoModalComponent } from 'src/app/components/edit-produto-modal/edit-produto-modal.component';
import { ValorUnitarioModalComponent } from 'src/app/components/valor-unitario-modal/valor-unitario-modal.component';

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
    private toastCtrl: ToastController, // Adicione esta importação
    private modalCtrl: ModalController
  ) { }

  ionViewDidEnter() {
    this.listarTarefa();
  }

  listarTarefa() {
    this.tarefaCollection = this.tarefaService.listar();
  }

  // Método para otimizar o *ngFor
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
  
        // Define valor unitário padrão
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

  // async showAdd() {
  //   const alert = await this.alertCtrl.create({
  //     header: 'Novo Produto',
  //     mode: 'ios',
  //     inputs: [
  //       {
  //         name: 'tarefa',
  //         type: 'text',
  //         placeholder: 'Nome do Produto',
  //       },
  //       {
  //         name: 'quantidade',
  //         type: 'number',
  //         placeholder: 'Quantidade'
  //       },
  //       {
  //         name: 'valorUnitario',
  //         type: 'text',
  //         placeholder: 'Valor Unitário (R$)',
  //         attributes: { 
  //           inputmode: 'decimal' 
  //         }
  //       }
  //     ],
  //     buttons: [
  //       {
  //         text: 'Cancelar',
  //         role: 'cancel',
  //         cssClass: 'secondary'
  //       },
  //       {
  //         text: 'Salvar',
  //         handler: async (dados) => {
  //           // Validação
  //           if (!dados.tarefa || dados.tarefa.trim() === '') {
  //             this.showSimpleAlert('O nome do produto não pode estar vazio');
  //             return false;
  //           }

  //           // Define quantidade padrão
  //           if (!dados.quantidade || dados.quantidade <= 0) {
  //             dados.quantidade = 1;
  //           };

  //           // Define valor unitário padrão
  //           if (!dados.valorUnitario || dados.valorUnitario < 0) {
  //             dados.valorUnitario = 0;
  //           }

  //           this.tarefaService.salvar(dados, () => {
  //             this.listarTarefa();
  //           });
  //         }
  //       }
  //     ]
  //   });
  //   await alert.present();
  // }

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
        // Garante que o código da tarefa original seja mantido
        dadosEditados.codigo = tarefa.codigo; // Preserva o código original
        this.tarefaService.edicao(dadosEditados, () => {
          this.listarTarefa(); // Atualiza a lista após a edição
        });
      }
    });

    await modal.present();
  }

  // async editar(tarefa: any) {
  //   const alert = await this.alertCtrl.create({
  //     header: 'Editar Produto',
  //     mode: 'ios',
  //     inputs: [
  //       {
  //         name: 'codigo',
  //         type: 'number',
  //         value: tarefa.codigo,
  //         disabled: true,
  //         cssClass: 'hidden-input'
  //       },
  //       {
  //         name: 'tarefa',
  //         type: 'text',
  //         value: tarefa.tarefa,
  //         placeholder: 'Nome do Produto'
  //       },
  //       {
  //         name: 'quantidade',
  //         type: 'number',
  //         value: tarefa.quantidade,
  //         placeholder: 'Quantidade'
  //       },
  //       {
  //         name: 'valorUnitario',
  //         type: 'number',
  //         value: tarefa.valorUnitario,
  //         attributes: {
  //           step: '0.01'
  //         }
  //       }
        
  //     ],
  //     buttons: [
  //       {
  //         text: 'Cancelar',
  //         role: 'cancel',
  //         cssClass: 'secondary'
  //       },
  //       {
  //         text: 'Salvar',
  //         handler: (dadosEditados) => {
  //           if (!dadosEditados.tarefa || dadosEditados.tarefa.trim() === '') {
  //             this.showSimpleAlert('O nome do produto não pode estar vazio');
  //             return false;
  //           }
            
  //           this.tarefaService.edicao(dadosEditados, () => {
  //             this.listarTarefa();
  //           });
  //         }
  //       }
  //     ]
  //   });
  //   await alert.present();
  // }

  async openActions(tarefa: any) {
    const buttons = [];

    // Botão para marcar/desmarcar como concluído
    buttons.push({
      text: tarefa.feito ? 'Marcar como Pendente' : 'Marcar como Comprado',
      icon: tarefa.feito ? 'close-circle' : 'checkmark-circle',
      handler: () => {
        if (!tarefa.feito) {
          // Se está marcando como COMPRADO, pedir o valor unitário
          this.solicitarValorUnitario(tarefa);
        } else {
          // Se está desmarcando (voltando para pendente), não pedir valor
          tarefa.feito = !tarefa.feito;
          this.tarefaService.atualizar(tarefa, () => {
            this.listarTarefa();
          });
        }
      }
    });

    // Botão para editar (só se não estiver concluído)
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

  // getTotalPendente(): number {
  //   return this.tarefaService.calcularTotalPendente();
  // }

  // Método para formatar valores em moeda
  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  // Método para calcular subtotal do item
  calcularSubtotal(item: any): number {
    const quantidade = parseFloat(item.quantidade) || 0;
    const valorUnitario = parseFloat(item.valorUnitario) || 0;
    return quantidade * valorUnitario;
  }

  async solicitarValorUnitario(tarefa: any) {
    const modal = await this.modalCtrl.create({
      component: ValorUnitarioModalComponent,
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
}