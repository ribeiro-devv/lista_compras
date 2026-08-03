import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { configurarTestBedDeTela } from 'src/app/testing/configurar-teste';
import { DetalhesProdutoModalComponent } from './detalhes-produto-modal.component';

describe('DetalhesProdutoModalComponent', () => {
  let component: DetalhesProdutoModalComponent;
  let fixture: ComponentFixture<DetalhesProdutoModalComponent>;

  beforeEach(waitForAsync(() => configurarTestBedDeTela(DetalhesProdutoModalComponent)));

  beforeEach(() => {
    fixture = TestBed.createComponent(DetalhesProdutoModalComponent);
    component = fixture.componentInstance;
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });
});
