import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { configurarTestBedDeTela } from 'src/app/testing/configurar-teste';
import { LojasPage } from './lojas.page';

describe('LojasPage', () => {
  let component: LojasPage;
  let fixture: ComponentFixture<LojasPage>;

  beforeEach(waitForAsync(() => configurarTestBedDeTela(LojasPage)));

  beforeEach(() => {
    fixture = TestBed.createComponent(LojasPage);
    component = fixture.componentInstance;
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });
});
