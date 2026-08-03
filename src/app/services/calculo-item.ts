/**
 * Aritmética de item de lista, isolada dos serviços para poder ser testada
 * sem Supabase. Todo mundo que soma preço deve passar por aqui.
 */

function numero(valor: any): number {
  const n = parseFloat(valor);
  return isNaN(n) ? 0 : n;
}

/** Subtotal do item: quantidade x valor unitário, menos o desconto. Nunca negativo. */
export function subtotalItem(item: any): number {
  const bruto = numero(item?.quantidade) * numero(item?.valorUnitario);
  return Math.max(0, bruto - numero(item?.desconto));
}

/** Soma os subtotais, opcionalmente filtrando quais itens entram na conta. */
export function somarSubtotais(itens: any[], filtro?: (item: any) => boolean): number {
  return (itens || [])
    .filter(item => (filtro ? filtro(item) : true))
    .reduce((total, item) => total + subtotalItem(item), 0);
}

/**
 * Quanto foi de fato economizado. Desconto maior que o subtotal do item conta
 * só até zerar o item — senão a economia exibida seria maior que o gasto.
 */
export function totalDescontos(itens: any[]): number {
  return (itens || []).reduce((total, item) => {
    const bruto = numero(item?.quantidade) * numero(item?.valorUnitario);
    return total + Math.min(numero(item?.desconto), bruto);
  }, 0);
}
