import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { LojasPage } from './lojas.page';

const routes: Routes = [
  {
    path: '',
    component: LojasPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LojasPageRoutingModule {}
