import { Injectable } from '@angular/core';
import { ActionSheetController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class TarefaService {
  tarefaCollection: any[] = [];
  key: 'tarefaCollection';

  constructor(private actionSheetCtrl: ActionSheetController) { }
  async salvar(tarefa: any, callback = null) {
    tarefa.feito = false;
 
    if(tarefa.tarefa == null || tarefa.tarefa == undefined || tarefa.tarefa == '' ){
      const actionSheet = this.actionSheetCtrl.create({
        header: 'O nome do Produto não pode estar vazio',
        mode: 'ios',
        buttons: [
          {
            text: 'OK',
            icon: 'close',
            role: 'cancel',
            handler: () => {
            }
          }
        ],
      });
     (await actionSheet).present();
    } else{
      let value = localStorage.getItem(this.key);
  
      if (value == null || value == undefined) {
        this.tarefaCollection.push(tarefa)
        localStorage.setItem(this.key, JSON.stringify(this.tarefaCollection));
      }
      else {
        let collection: any[] = JSON.parse(value);
        collection.push(tarefa);
        localStorage.setItem(this.key, JSON.stringify(collection));
        
      }
  
      if (callback != null) {
        callback();
      }

    }

  }

  listar() {
    let value = localStorage.getItem(this.key);

    if (value == null || value == undefined) {

      return [];
    }

    let collection: any[] = JSON.parse(value);
    return collection;
  }

  excluir(tarefa: any, callback = null) {
    let value = localStorage.getItem(this.key);

    if (value == null || value == undefined) {

      return;
    }

    let collection: any[] = JSON.parse(value);

    let resultCollection = collection.filter(item => {
      return item.tarefa != tarefa.tarefa
    });

    localStorage.setItem(this.key, JSON.stringify(resultCollection));

    if (callback != null) {
      callback();
    }
  }
  atualizar(tarefa: any, callback = null){
    let value = localStorage.getItem(this.key);
    
    if (value == null || value == undefined) {
     return;
    }
    else {
      let collection: any[] = JSON.parse(value);

      collection.forEach(item=>{
        if(item.tarefa == tarefa.tarefa){
          item.feito = tarefa.feito
        }
      });
      

      localStorage.setItem(this.key, JSON.stringify(collection));
    }

    if (callback != null) {
      callback();
    }
  }
  edicao(tarefa: any, callback = null){

    let value = localStorage.getItem(this.key);

    console.log(value)

    if (value == null || value == undefined) {
      return;
    }

    else {
      let collection: any[] = JSON.parse(value);
      
      console.log(collection);

      collection.forEach(item=>{
        // console.log('item ==>' + item)
        console.log('item ==>' + (item.codigo))
        console.log('tarefa ==>' + tarefa.codigo)
        if(item.codigo == tarefa.codigo){
          console.log("entrou")
          item.tarefa = tarefa.tarefa
        } else{
          console.log("n entrou")
        }
      });
      
      localStorage.setItem(this.key, JSON.stringify(collection));
    }

    if (callback != null) {
      callback();
    }
  }
}
