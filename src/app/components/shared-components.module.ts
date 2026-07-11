import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { DetalhesProdutoModalComponent } from './detalhes-produto-modal/detalhes-produto-modal.component';
import { ExcluirTodosModalComponent } from './excluir-todos-modal/excluir-todos-modal.component';
import { ManageListsModalComponent } from './manage-lists-modal/manage-lists-modal.component';
import { FavoritosModalComponent } from './favoritos-modal/favoritos-modal.component';
import { PixModalComponent } from './pix-modal/pix-modal.component';

/**
 * Módulo com os modais usados por mais de uma página (evita declará-los duas
 * vezes). Também corrige o bug de Detalhes/Excluir-Todos que não estavam
 * declarados em nenhum módulo.
 */
@NgModule({
  declarations: [
    DetalhesProdutoModalComponent,
    ExcluirTodosModalComponent,
    ManageListsModalComponent,
    FavoritosModalComponent,
    PixModalComponent
  ],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, IonicModule],
  exports: [
    DetalhesProdutoModalComponent,
    ExcluirTodosModalComponent,
    ManageListsModalComponent,
    FavoritosModalComponent,
    PixModalComponent
  ]
})
export class SharedComponentsModule {}
