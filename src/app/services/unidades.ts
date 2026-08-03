/** Unidades de medida oferecidas nos formulários de item. */
export const UNIDADES: ReadonlyArray<{ valor: string; rotulo: string }> = [
  { valor: 'un', rotulo: 'Unidade' },
  { valor: 'kg', rotulo: 'Quilo (kg)' },
  { valor: 'g', rotulo: 'Grama (g)' },
  { valor: 'L', rotulo: 'Litro (L)' },
  { valor: 'ml', rotulo: 'Mililitro (ml)' },
  { valor: 'pacote', rotulo: 'Pacote' },
  { valor: 'caixa', rotulo: 'Caixa' },
  { valor: 'duzia', rotulo: 'Dúzia' }
];

export const UNIDADE_PADRAO = 'un';

/**
 * Converte a unidade do catálogo (texto livre: 'unidade', 'litro', 'kg'...)
 * para uma das opções acima. Fora da lista, cai no padrão.
 */
export function normalizarUnidade(unidade: string | undefined | null): string {
  if (!unidade) return UNIDADE_PADRAO;

  const bruta = unidade.trim().toLowerCase();
  const equivalentes: { [chave: string]: string } = {
    'unidade': 'un',
    'un': 'un',
    'kg': 'kg',
    'quilo': 'kg',
    'g': 'g',
    'grama': 'g',
    'l': 'L',
    'litro': 'L',
    'ml': 'ml',
    'mililitro': 'ml',
    'pacote': 'pacote',
    'caixa': 'caixa',
    'duzia': 'duzia',
    'dúzia': 'duzia'
  };

  return equivalentes[bruta] || UNIDADE_PADRAO;
}

/** Rótulo curto para exibir junto da quantidade (ex: "2 kg"). */
export function abreviarUnidade(unidade: string | undefined | null): string {
  const normalizada = normalizarUnidade(unidade);
  return normalizada === 'un' ? '' : (normalizada === 'duzia' ? 'dz' : normalizada);
}
