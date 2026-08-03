import { CUSTOM_ELEMENTS_SCHEMA, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterTestingModule } from '@angular/router/testing';
import { IonicModule } from '@ionic/angular';

/**
 * TestBed padrão de telas e modais: Ionic + formulários + rotas falsas.
 * CUSTOM_ELEMENTS_SCHEMA evita ter que declarar cada componente filho
 * (app-tour-overlay e afins) só para o smoke test compilar o template.
 *
 * Quem usa deve criar o componente FORA do waitForAsync: instanciar as
 * páginas puxa TarefaService -> SupabaseService, e os timers do GoTrue
 * deixam a zona async sem estabilizar, estourando o timeout do Jasmine.
 */
export function configurarTestBedDeTela(componente: Type<unknown>): void {
  TestBed.configureTestingModule({
    declarations: [componente],
    imports: [IonicModule.forRoot(), FormsModule, ReactiveFormsModule, RouterTestingModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
  }).compileComponents();
}
