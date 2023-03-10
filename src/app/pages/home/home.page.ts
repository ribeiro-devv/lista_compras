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
          placeholder: 'Código',
          disabled: true
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
          handler: async (tarefa) => {
              if(tarefa.quantidade == null || tarefa.quantidade == undefined || tarefa.quantidade == '' ){
                tarefa.quantidade = 1;
              }
              if(tarefa.tarefa == null || tarefa.tarefa == undefined || tarefa.tarefa == '' ){
                const actionSheet = this.actionSheetCtrl.create({
                  header: 'O nome do Produto não pode estar vazio',
                  mode: 'ios',
                  buttons: [
                    {
                      text: 'OK',
                      icon: 'close',
                      role: 'cancel',
                    }
                  ],
                });
                (await actionSheet).present();
              } else{
                this.tarefaService.salvar(tarefa, () => {
                this.listarTarefa();
                });

              }
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
      header: 'Produto',
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
          value: tarefa.tarefa
        },
        {
          name: 'quantidade',
          type: 'number',
          value: tarefa.quantidade,
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
    if(tarefa.feito == true){
      const actionSheet = await this.actionSheetCtrl.create({
        header: 'O QUE DESEJA FAZER?',
        mode: 'ios',
        buttons: [
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
    } else{
      const actionSheet = await this.actionSheetCtrl.create({
        header: 'O QUE DESEJA FAZER?',
        mode: 'ios',
        buttons: [
          {
            text: 'Editar Produto',
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
  async showExclusion() {
    const alert = await this.alertCtrl.create({
      header: 'Excluir Todos Produtos?',
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
            this.tarefaService.excluirTodos(() => {
              this.listarTarefa();
            });
          }
        }
      ]
    });
    await alert.present();
  }
  async showArray() {
    const alert = await this.alertCtrl.create({
      header: 'Iniciar',
      mode: 'ios',
      buttons: [{
          text: 'Click aqui para Iniciar',
          handler: () => {
            this.tarefaService.setArray(() => {
              this.listarTarefa();
            });
          }
        }
      ]
    });
    await alert.present();
  }
  async showPix() {
    const alerta = await this.alertCtrl.create({
      header: 'Quer Doar?',
      subHeader: 'Ajude a manter esse projeto no ar!',
      message: '&#128591; <br> <br> Pix:',
      mode: 'ios',
      inputs: [
        {
          id: 'pix',
          value:'matheus.ribeiro6611@gmail.com',
          disabled: true
        }
      ],
      buttons: [{
          id:'btn-pix',
          text: 'Copiar chave Pix',
          handler() {
            let chave = 'matheus.ribeiro6611@gmail.com'
            navigator.clipboard.writeText(chave);
            let btn = document.querySelector('#btn-pix');
            btn.textContent = "Copiado"
            
          },
        }
      ]
    });
    await alerta.present();
  }
}
