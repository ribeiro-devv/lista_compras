import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { configurarTestBedDeTela } from 'src/app/testing/configurar-teste';
import { CategoriasPage } from './categorias.page';

describe('CategoriasPage', () => {
  let component: CategoriasPage;
  let fixture: ComponentFixture<CategoriasPage>;

  beforeEach(waitForAsync(() => configurarTestBedDeTela(CategoriasPage)));

  beforeEach(() => {
    fixture = TestBed.createComponent(CategoriasPage);
    component = fixture.componentInstance;
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });

  it('protege a categoria "Outros" contra edição destrutiva', () => {
    expect(component.ehPadrao({ id: '1', nome: 'Outros', icone: 'x', cor: '#000', ordem: 0 })).toBe(true);
    expect(component.ehPadrao({ id: '2', nome: 'Bebidas', icone: 'x', cor: '#000', ordem: 1 })).toBe(false);
  });
});
