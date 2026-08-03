import { abreviarUnidade, normalizarUnidade, UNIDADES, UNIDADE_PADRAO } from './unidades';

describe('unidades', () => {

  it('todas as unidades da lista se normalizam para elas mesmas', () => {
    UNIDADES.forEach(unidade => {
      expect(normalizarUnidade(unidade.valor)).toBe(unidade.valor);
    });
  });

  it('converte o texto livre que vem do catálogo', () => {
    expect(normalizarUnidade('unidade')).toBe('un');
    expect(normalizarUnidade('litro')).toBe('L');
    expect(normalizarUnidade('quilo')).toBe('kg');
    expect(normalizarUnidade('dúzia')).toBe('duzia');
  });

  it('ignora caixa e espaços', () => {
    expect(normalizarUnidade('  KG ')).toBe('kg');
  });

  it('cai no padrão para vazio ou desconhecido', () => {
    expect(normalizarUnidade(null)).toBe(UNIDADE_PADRAO);
    expect(normalizarUnidade('')).toBe(UNIDADE_PADRAO);
    expect(normalizarUnidade('galão')).toBe(UNIDADE_PADRAO);
  });

  it('não exibe rótulo para unidade avulsa', () => {
    expect(abreviarUnidade('un')).toBe('');
    expect(abreviarUnidade('unidade')).toBe('');
  });

  it('abrevia as demais', () => {
    expect(abreviarUnidade('kg')).toBe('kg');
    expect(abreviarUnidade('duzia')).toBe('dz');
    expect(abreviarUnidade('litro')).toBe('L');
  });
});
