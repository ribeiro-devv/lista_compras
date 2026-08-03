import { somarSubtotais, subtotalItem, totalDescontos } from './calculo-item';

describe('cálculo de itens', () => {

  describe('subtotalItem', () => {
    it('multiplica quantidade por valor unitário', () => {
      expect(subtotalItem({ quantidade: 2, valorUnitario: 10 })).toBe(20);
    });

    it('desconta o valor informado', () => {
      expect(subtotalItem({ quantidade: 2, valorUnitario: 10, desconto: 3 })).toBe(17);
    });

    it('nunca devolve negativo, mesmo com desconto maior que o subtotal', () => {
      expect(subtotalItem({ quantidade: 1, valorUnitario: 5, desconto: 8 })).toBe(0);
    });

    it('trata campos ausentes como zero', () => {
      expect(subtotalItem({})).toBe(0);
      expect(subtotalItem({ quantidade: 3 })).toBe(0);
    });

    it('aceita número em texto, como vem do formulário', () => {
      expect(subtotalItem({ quantidade: '2', valorUnitario: '10.50' })).toBe(21);
    });

    it('ignora desconto inválido', () => {
      expect(subtotalItem({ quantidade: 1, valorUnitario: 10, desconto: 'abc' })).toBe(10);
    });

    it('funciona com quantidade fracionada (kg)', () => {
      expect(subtotalItem({ quantidade: 0.5, valorUnitario: 30 })).toBe(15);
    });
  });

  describe('somarSubtotais', () => {
    const itens = [
      { quantidade: 2, valorUnitario: 10, desconto: 3, feito: true },
      { quantidade: 1, valorUnitario: 5, feito: false }
    ];

    it('soma todos os itens', () => {
      expect(somarSubtotais(itens)).toBe(22);
    });

    it('soma só os comprados quando pedido', () => {
      expect(somarSubtotais(itens, item => item.feito)).toBe(17);
    });

    it('devolve zero para lista vazia', () => {
      expect(somarSubtotais([])).toBe(0);
    });
  });

  describe('totalDescontos', () => {
    it('soma os descontos efetivamente aplicados', () => {
      expect(totalDescontos([
        { quantidade: 2, valorUnitario: 10, desconto: 3 },
        { quantidade: 1, valorUnitario: 5 }
      ])).toBe(3);
    });

    it('limita o desconto ao subtotal do item', () => {
      // Desconto de 8 num item de 5: só 5 foram de fato economizados.
      expect(totalDescontos([{ quantidade: 1, valorUnitario: 5, desconto: 8 }])).toBe(5);
    });

    it('devolve zero quando ninguém tem desconto', () => {
      expect(totalDescontos([{ quantidade: 1, valorUnitario: 5 }])).toBe(0);
    });
  });
});
