import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HomePage } from './home.page';

import { HomePageRoutingModule } from './home-routing.module';
import { AddProdutoModalComponent } from 'src/app/components/add-produto-modal/add-produto-modal.component';
import { EditProdutoModalComponent } from 'src/app/components/edit-produto-modal/edit-produto-modal.component';
import { InformacoesModalComponent } from 'src/app/components/informacoes-modal/informacoes-modal.component';
import { TourOverlayComponent } from 'src/app/components/tour-overlay/tour-overlay.component';


@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HomePageRoutingModule,
    ReactiveFormsModule,
  ],
  declarations: [HomePage, AddProdutoModalComponent, EditProdutoModalComponent, InformacoesModalComponent, TourOverlayComponent]
})
export class HomePageModule {}
