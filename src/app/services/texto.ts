/**
 * Deixa a primeira letra maiúscula e **preserva o resto como está**.
 *
 * De propósito não usa `toLowerCase()` no restante: nomes como "Leite UHT",
 * "TV a cabo" ou uma marca em caixa alta continuariam corretos, e quem digita
 * tudo maiúsculo de propósito não é corrigido contra a vontade.
 */
export function capitalizarInicio(texto: string): string {
  if (!texto) return texto;

  // Pula espaços iniciais para não "capitalizar" um espaço em branco.
  const indice = texto.search(/\S/);
  if (indice === -1) return texto;

  const letra = texto.charAt(indice);
  const maiuscula = letra.toLocaleUpperCase('pt-BR');
  if (letra === maiuscula) return texto;

  return texto.slice(0, indice) + maiuscula + texto.slice(indice + 1);
}
