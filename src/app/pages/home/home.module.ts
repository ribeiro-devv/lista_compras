import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HomePage } from './home.page';

import { HomePageRoutingModule } from './home-routing.module';
import { AddProdutoModalComponent } from 'src/app/components/add-produto-modal/add-produto-modal.component';
import { EditProdutoModalComponent } from 'src/app/components/edit-produto-modal/edit-produto-modal.component';
import { ValorUnitarioModalComponent } from 'src/app/components/valor-unitario-modal/valor-unitario-modal.component';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HomePageRoutingModule,
    ReactiveFormsModule,
  ],
  declarations: [HomePage, AddProdutoModalComponent, EditProdutoModalComponent, ValorUnitarioModalComponent]
})
export class HomePageModule {}
