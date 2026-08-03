import { TestBed } from '@angular/core/testing';

import { OrdenacaoService, ModoOrdenacao, MODOS_ORDENACAO } from './ordenacao.service';

describe('OrdenacaoService', () => {
  let service: OrdenacaoService;

  const item = (tarefa: string, categoria: string, feito: boolean) => ({ tarefa, categoria, feito });

  beforeEach(() => {
    localStorage.removeItem('ordenacaoLista');
    TestBed.configureTestingModule({});
    service = TestBed.inject(OrdenacaoService);
  });

  afterEach(() => localStorage.removeItem('ordenacaoLista'));

  it('usa "categoria" como modo padrão', () => {
    expect(service.obterModo()).toBe('categoria');
  });

  it('persiste o modo escolhido', () => {
    service.definirModo('nome');
    expect(localStorage.getItem('ordenacaoLista')).toBe('nome');
    expect(TestBed.inject(OrdenacaoService).obterModo()).toBe('nome');
  });

  it('ignora modo inválido guardado no localStorage', () => {
    localStorage.setItem('ordenacaoLista', 'inventado');
    expect(service.obterModo()).toBe('categoria');
  });

  it('tem rótulo para todos os modos', () => {
    MODOS_ORDENACAO.forEach(modo => {
      expect(service.rotulo(modo.valor)).toBe(modo.rotulo);
    });
  });

  describe('agrupar', () => {
    const itens = [
      item('Uva', 'Frutas & Verduras', true),
      item('Arroz', 'Grãos & Básicos', false),
      item('Banana', 'Frutas & Verduras', false),
      item('Café', 'Bebidas', true)
    ];

    it('no modo categoria, agrupa por categoria em ordem alfabética', () => {
      const grupos = service.agrupar(itens, 'categoria');
      expect(grupos.map(g => g.categoria)).toEqual(['Bebidas', 'Frutas & Verduras', 'Grãos & Básicos']);
    });

    it('no modo categoria, põe os pendentes antes dos comprados dentro do grupo', () => {
      const grupos = service.agrupar(itens, 'categoria');
      const frutas = grupos.find(g => g.categoria === 'Frutas & Verduras')!;
      expect(frutas.itens.map(i => i.tarefa)).toEqual(['Banana', 'Uva']);
    });

    it('no modo nome, devolve um único grupo sem rótulo, ordenado A-Z', () => {
      const grupos = service.agrupar(itens, 'nome');
      expect(grupos.length).toBe(1);
      expect(grupos[0].categoria).toBe('');
      expect(grupos[0].itens.map(i => i.tarefa)).toEqual(['Arroz', 'Banana', 'Café', 'Uva']);
    });

    it('no modo pendentes, os que faltam vêm primeiro', () => {
      const grupos = service.agrupar(itens, 'pendentes');
      expect(grupos[0].itens.map(i => i.tarefa)).toEqual(['Arroz', 'Banana', 'Café', 'Uva']);
      expect(grupos[0].itens.slice(0, 2).every(i => !i.feito)).toBe(true);
    });

    it('no modo comprados, os do carrinho vêm primeiro', () => {
      const grupos = service.agrupar(itens, 'comprados');
      expect(grupos[0].itens.map(i => i.tarefa)).toEqual(['Café', 'Uva', 'Arroz', 'Banana']);
    });

    it('trata item sem categoria como "Outros"', () => {
      const grupos = service.agrupar([{ tarefa: 'Pilha', categoria: null, feito: false }], 'categoria');
      expect(grupos[0].categoria).toBe('Outros');
    });

    it('não modifica o array recebido', () => {
      const original = [...itens];
      service.agrupar(itens, 'nome');
      expect(itens).toEqual(original);
    });

    it('devolve lista vazia sem grupos', () => {
      expect(service.agrupar([], 'nome')).toEqual([]);
      expect(service.agrupar([], 'categoria')).toEqual([]);
    });
  });
});
