import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { configurarTestBedDeTela } from 'src/app/testing/configurar-teste';
import { HomePage } from './home.page';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(waitForAsync(() => configurarTestBedDeTela(HomePage)));

  beforeEach(() => {
    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
  });

  it('deve criar o componente', () => {
    expect(component).toBeTruthy();
  });
});
