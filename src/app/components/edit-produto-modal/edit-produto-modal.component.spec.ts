import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { configurarTestBedDeTela } from 'src/app/testing/configurar-teste';
import { EditProdutoModalComponent } from './edit-produto-modal.component';

describe('EditProdutoModalComponent', () => {
  let component: EditProdutoModalComponent;
  let fixture: ComponentFixture<EditProdutoModalComponent>;

  beforeEach(waitForAsync(() => configurarTestBedDeTela(EditProdutoModalComponent)));

  beforeEach(() => {
    fixture = TestBed.createComponent(EditProdutoModalComponent);
    component = fixture.componentInstance;
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });
});
