import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { configurarTestBedDeTela } from 'src/app/testing/configurar-teste';
import { InformacoesModalComponent } from './informacoes-modal.component';

describe('InformacoesModalComponent', () => {
  let component: InformacoesModalComponent;
  let fixture: ComponentFixture<InformacoesModalComponent>;

  beforeEach(waitForAsync(() => configurarTestBedDeTela(InformacoesModalComponent)));

  beforeEach(() => {
    fixture = TestBed.createComponent(InformacoesModalComponent);
    component = fixture.componentInstance;
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });
});
