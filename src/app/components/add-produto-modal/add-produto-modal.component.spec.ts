import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { configurarTestBedDeTela } from 'src/app/testing/configurar-teste';
import { AddProdutoModalComponent } from './add-produto-modal.component';

describe('AddProdutoModalComponent', () => {
  let component: AddProdutoModalComponent;
  let fixture: ComponentFixture<AddProdutoModalComponent>;

  beforeEach(waitForAsync(() => configurarTestBedDeTela(AddProdutoModalComponent)));

  beforeEach(() => {
    fixture = TestBed.createComponent(AddProdutoModalComponent);
    component = fixture.componentInstance;
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });
});
