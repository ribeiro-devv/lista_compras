import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { LojasPageRoutingModule } from './lojas-routing.module';
import { LojasPage } from './lojas.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    LojasPageRoutingModule
  ],
  declarations: [LojasPage]
})
export class LojasPageModule {}
