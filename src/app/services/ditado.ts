import { normalizarUnidade, UNIDADE_PADRAO } from './unidades';
import { capitalizarInicio } from './texto';

export interface ItemDitado {
  nome: string;
  quantidade: number;
  unidade: string;
}

const NUMEROS_POR_EXTENSO: { [palavra: string]: number } = {
  'um': 1, 'uma': 1, 'dois': 2, 'duas': 2, 'tres': 3, 'três': 3,
  'quatro': 4, 'cinco': 5, 'seis': 6, 'sete': 7, 'oito': 8,
  'nove': 9, 'dez': 10, 'onze': 11, 'doze': 12, 'meio': 0.5, 'meia': 0.5
};

/** Palavras faladas que apontam para uma unidade de medida. */
const UNIDADES_FALADAS: { [palavra: string]: string } = {
  'quilo': 'kg', 'quilos': 'kg', 'kg': 'kg', 'quilograma': 'kg', 'quilogramas': 'kg',
  'grama': 'g', 'gramas': 'g', 'g': 'g',
  'litro': 'L', 'litros': 'L', 'l': 'L',
  'mililitro': 'ml', 'mililitros': 'ml', 'ml': 'ml',
  'pacote': 'pacote', 'pacotes': 'pacote',
  'caixa': 'caixa', 'caixas': 'caixa',
  'duzia': 'duzia', 'dúzia': 'duzia', 'duzias': 'duzia', 'dúzias': 'duzia',
  'unidade': 'un', 'unidades': 'un'
};

function paraNumero(palavra: string): number | null {
  const porExtenso = NUMEROS_POR_EXTENSO[palavra];
  if (porExtenso !== undefined) return porExtenso;

  const numerico = parseFloat(palavra.replace(',', '.'));
  return isNaN(numerico) ? null : numerico;
}

/**
 * Interpreta uma frase ditada. Reconhece "dois quilos de arroz",
 * "3 caixas de leite", "meio quilo de queijo" e também o caso simples
 * em que a pessoa fala só o nome do produto.
 *
 * Quando a frase não casa com nenhum padrão, a frase inteira vira o nome
 * do item — melhor um item com nome estranho do que perder o ditado.
 */
export function interpretarDitado(frase: string): ItemDitado | null {
  const limpa = (frase || '').trim().replace(/\s+/g, ' ');
  if (!limpa) return null;

  const palavras = limpa.split(' ');
  const quantidade = paraNumero(palavras[0].toLowerCase());

  // Sem número na frente: a frase toda é o nome.
  if (quantidade === null) {
    return { nome: capitalizarInicio(limpa), quantidade: 1, unidade: UNIDADE_PADRAO };
  }

  let indice = 1;
  let unidade = UNIDADE_PADRAO;

  const possivelUnidade = UNIDADES_FALADAS[(palavras[1] || '').toLowerCase()];
  if (possivelUnidade) {
    unidade = possivelUnidade;
    indice = 2;
  }

  // O "de" de "dois quilos DE arroz" não faz parte do nome.
  if ((palavras[indice] || '').toLowerCase() === 'de') indice++;

  const nome = palavras.slice(indice).join(' ').trim();

  // "2" sozinho, ou "3 quilos" sem produto: não dá para criar item.
  if (!nome) return null;

  return {
    nome: capitalizarInicio(nome),
    quantidade: quantidade > 0 ? quantidade : 1,
    unidade: normalizarUnidade(unidade)
  };
}
