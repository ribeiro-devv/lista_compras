import { Component } from '@angular/core';
import { ActionSheetController, AlertController, LoadingController } from '@ionic/angular';
import { readTask } from 'ionicons/dist/types/stencil-public-runtime';
import { from } from 'rxjs';
import { TarefaService } from 'src/app/services/tarefa.service';

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
    private actionSheetCtrl: ActionSheetController
  ) { }

  ionViewDidEnter() {
    this.listarTarefa();
  }

  listarTarefa() {
    this.tarefaCollection = this.tarefaService.listar();
  }

  async showAdd() {
    const alert = await this.alertCtrl.create({
      header: 'Produto',
      mode: 'ios',
      inputs: [
        {
          name: 'codigo',
          type: 'number',
        },
        {
          name: 'tarefa',
          type: 'text',
          placeholder: 'Nome do Produto',
        },
        {
          name: 'quantidade',
          type: 'number',
          placeholder: 'Quantidade',
        }

      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
          }
        }, {
          text: 'Salvar',
          handler: (tarefa) => {
            this.tarefaService.salvar(tarefa, () => {
              this.listarTarefa();
            });
          }
        }
      ]
    });
    await alert.present();
  }
  async delete(item) {
    const alert = await this.alertCtrl.create({
      header: 'Excluir Produto?',
      mode: 'ios',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
          }
        }, {
          text: 'Excluir',
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
  async editar(tarefa) {
    const alert = await this.alertCtrl.create({
      header: 'Tarefa',
      mode: 'ios',
      inputs: [
        {
          name: 'codigo',
          type: 'number',
          value: tarefa.codigo,
          disabled: true

        },
        {
          name: 'tarefa',
          type: 'text',
          placeholder: tarefa.tarefa
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary',
          handler: () => {
          }
        }, {
          text: 'Salvar',
          handler: (tarefa) => {
            this.tarefaService.edicao(tarefa, () => {
              this.listarTarefa();
            });
          }
        }
      ]
    });
    await alert.present();
  }
  async openActions(tarefa: any) {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'O QUE DESEJA FAZER?',
      mode: 'ios',
      buttons: [
        {
          text: 'Editar tarefa',
          icon: 'pencil',
          handler: () => {
            this.editar(tarefa);
          },
        },
        {
          text: tarefa.feito ? 'Colocar como pendente' : 'Marcar como realizado',
          icon: tarefa.feito ? 'close-circle' : 'checkmark-circle',
          handler: () => {
            tarefa.feito = !tarefa.feito

            this.tarefaService.atualizar(tarefa, () => {
              this.listarTarefa();
            });
          },
        },
        {
          text: 'Cancelar',
          icon: 'close',
          role: 'cancel',
          handler: () => {
          }
        }
      ],
    });
    await actionSheet.present();
  }
}
