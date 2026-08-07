import { capitalizarInicio } from './texto';

describe('capitalizarInicio', () => {

  it('deixa a primeira letra maiúscula', () => {
    expect(capitalizarInicio('arroz')).toBe('Arroz');
  });

  it('não mexe no resto do texto', () => {
    expect(capitalizarInicio('arroz branco tipo 1')).toBe('Arroz branco tipo 1');
  });

  it('preserva caixa alta que o usuário digitou de propósito', () => {
    expect(capitalizarInicio('leite UHT')).toBe('Leite UHT');
    expect(capitalizarInicio('ARROZ')).toBe('ARROZ');
  });

  it('não muda nada quando já começa maiúsculo', () => {
    const texto = 'Feijão preto';
    expect(capitalizarInicio(texto)).toBe(texto);
  });

  it('funciona com acento na primeira letra', () => {
    expect(capitalizarInicio('água mineral')).toBe('Água mineral');
    expect(capitalizarInicio('óleo de soja')).toBe('Óleo de soja');
  });

  it('ignora espaços à esquerda em vez de tentar capitalizá-los', () => {
    expect(capitalizarInicio('  arroz')).toBe('  Arroz');
  });

  it('devolve string vazia ou só espaços sem quebrar', () => {
    expect(capitalizarInicio('')).toBe('');
    expect(capitalizarInicio('   ')).toBe('   ');
  });

  it('não quebra quando começa com número ou símbolo', () => {
    expect(capitalizarInicio('5 pães')).toBe('5 pães');
    expect(capitalizarInicio('@marca')).toBe('@marca');
  });
});
