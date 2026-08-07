import { interpretarDitado } from './ditado';

describe('interpretarDitado', () => {

  it('entende número por extenso + unidade + produto', () => {
    expect(interpretarDitado('dois quilos de arroz')).toEqual({
      nome: 'Arroz', quantidade: 2, unidade: 'kg'
    });
  });

  it('entende número em dígito', () => {
    expect(interpretarDitado('3 caixas de leite')).toEqual({
      nome: 'Leite', quantidade: 3, unidade: 'caixa'
    });
  });

  it('entende fração falada', () => {
    expect(interpretarDitado('meio quilo de queijo')).toEqual({
      nome: 'Queijo', quantidade: 0.5, unidade: 'kg'
    });
  });

  it('aceita decimal com vírgula, como o reconhecedor devolve', () => {
    expect(interpretarDitado('1,5 litros de leite')).toEqual({
      nome: 'Leite', quantidade: 1.5, unidade: 'L'
    });
  });

  it('funciona sem a palavra "de"', () => {
    expect(interpretarDitado('duas caixas ovos')).toEqual({
      nome: 'Ovos', quantidade: 2, unidade: 'caixa'
    });
  });

  it('quantidade sem unidade', () => {
    expect(interpretarDitado('5 bananas')).toEqual({
      nome: 'Bananas', quantidade: 5, unidade: 'un'
    });
  });

  it('só o nome do produto vira item de 1 unidade, começando maiúsculo', () => {
    expect(interpretarDitado('papel higiênico')).toEqual({
      nome: 'Papel higiênico', quantidade: 1, unidade: 'un'
    });
  });

  it('preserva nome com mais de uma palavra', () => {
    expect(interpretarDitado('dois pacotes de café solúvel')).toEqual({
      nome: 'Café solúvel', quantidade: 2, unidade: 'pacote'
    });
  });

  it('devolve null quando não sobra nome', () => {
    expect(interpretarDitado('3 quilos')).toBeNull();
    expect(interpretarDitado('7')).toBeNull();
  });

  it('devolve null para frase vazia', () => {
    expect(interpretarDitado('')).toBeNull();
    expect(interpretarDitado('   ')).toBeNull();
  });

  it('normaliza espaços repetidos', () => {
    expect(interpretarDitado('  dois   quilos   de   arroz ')).toEqual({
      nome: 'Arroz', quantidade: 2, unidade: 'kg'
    });
  });

  it('quantidade zero cai para 1, porque item zerado não faz sentido', () => {
    expect(interpretarDitado('0 pacotes de sal')?.quantidade).toBe(1);
  });
});
