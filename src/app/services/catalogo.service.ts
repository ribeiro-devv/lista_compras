import { Injectable } from '@angular/core';

export interface ProdutoCatalogo {
  id: string;
  nome: string;
  categoria: string;
  unidade: string; // unidade, kg, litro, etc.
  precoMedio?: number; // preço médio de referência
  favorito: boolean;
  vezesUsado: number;
  dataUltimoUso?: string;
}

export interface CategoriaProduto {
  id: string;
  nome: string;
  icone: string;
  cor: string;
}

@Injectable({
  providedIn: 'root'
})
export class CatalogoService {
  private readonly CATALOGO_KEY = 'catalogoProdutos';
  private readonly FAVORITOS_KEY = 'produtosFavoritos';

  // Categorias pré-definidas
  private categorias: CategoriaProduto[] = [
    { id: 'higiene-pessoal', nome: 'Higiene Pessoal', icone: 'sparkles-outline', cor: '#3880ff' },
    { id: 'limpeza-domestica', nome: 'Limpeza Doméstica', icone: 'home-outline', cor: '#2dd36f' },
    { id: 'laticinios-padaria', nome: 'Laticínios & Padaria', icone: 'cafe-outline', cor: '#ffc409' },
    { id: 'carnes-proteinas', nome: 'Carnes & Proteínas', icone: 'fish-outline', cor: '#f04141' },
    { id: 'frutas-verduras', nome: 'Frutas & Verduras', icone: 'leaf-outline', cor: '#10dc60' },
    { id: 'graos-basicos', nome: 'Grãos & Básicos', icone: 'basket-outline', cor: '#7044ff' },
    { id: 'bebidas', nome: 'Bebidas', icone: 'wine-outline', cor: '#ff6b35' },
    { id: 'doces-salgadinhos', nome: 'Doces & Salgadinhos', icone: 'happy-outline', cor: '#ffce00' },
    { id: 'congelados', nome: 'Congelados', icone: 'snow-outline', cor: '#00d4ff' },
    { id: 'outros', nome: 'Outros', icone: 'ellipsis-horizontal-outline', cor: '#6c757d' }
  ];

  // Produtos pré-cadastrados
  private produtosIniciais: ProdutoCatalogo[] = [
    // Higiene Pessoal
    { id: 'papel-higienico', nome: 'Papel Higiênico', categoria: 'higiene-pessoal', unidade: 'unidade', precoMedio: 8.50, favorito: false, vezesUsado: 0 },
    { id: 'sabonete', nome: 'Sabonete', categoria: 'higiene-pessoal', unidade: 'unidade', precoMedio: 3.20, favorito: false, vezesUsado: 0 },
    { id: 'shampoo', nome: 'Shampoo', categoria: 'higiene-pessoal', unidade: 'unidade', precoMedio: 12.90, favorito: false, vezesUsado: 0 },
    { id: 'condicionador', nome: 'Condicionador', categoria: 'higiene-pessoal', unidade: 'unidade', precoMedio: 11.50, favorito: false, vezesUsado: 0 },
    { id: 'pasta-dente', nome: 'Pasta de Dente', categoria: 'higiene-pessoal', unidade: 'unidade', precoMedio: 4.80, favorito: false, vezesUsado: 0 },
    { id: 'escova-dente', nome: 'Escova de Dente', categoria: 'higiene-pessoal', unidade: 'unidade', precoMedio: 6.90, favorito: false, vezesUsado: 0 },
    { id: 'desodorante', nome: 'Desodorante', categoria: 'higiene-pessoal', unidade: 'unidade', precoMedio: 9.90, favorito: false, vezesUsado: 0 },
    { id: 'absorvente', nome: 'Absorvente', categoria: 'higiene-pessoal', unidade: 'unidade', precoMedio: 7.50, favorito: false, vezesUsado: 0 },

    // Limpeza Doméstica
    { id: 'amaciante', nome: 'Amaciante', categoria: 'limpeza-domestica', unidade: 'litro', precoMedio: 8.90, favorito: false, vezesUsado: 0 },
    { id: 'detergente', nome: 'Detergente', categoria: 'limpeza-domestica', unidade: 'unidade', precoMedio: 2.50, favorito: false, vezesUsado: 0 },
    { id: 'agua-sanitaria', nome: 'Água Sanitária', categoria: 'limpeza-domestica', unidade: 'litro', precoMedio: 3.20, favorito: false, vezesUsado: 0 },
    { id: 'desinfetante', nome: 'Desinfetante', categoria: 'limpeza-domestica', unidade: 'litro', precoMedio: 5.90, favorito: false, vezesUsado: 0 },
    { id: 'sabao-po', nome: 'Sabão em Pó', categoria: 'limpeza-domestica', unidade: 'kg', precoMedio: 12.90, favorito: false, vezesUsado: 0 },
    { id: 'esponja', nome: 'Esponja', categoria: 'limpeza-domestica', unidade: 'unidade', precoMedio: 1.50, favorito: false, vezesUsado: 0 },
    { id: 'papel-toalha', nome: 'Papel Toalha', categoria: 'limpeza-domestica', unidade: 'unidade', precoMedio: 6.90, favorito: false, vezesUsado: 0 },
    { id: 'multiuso', nome: 'Limpa Vidros/Multiuso', categoria: 'limpeza-domestica', unidade: 'unidade', precoMedio: 4.50, favorito: false, vezesUsado: 0 },

    // Laticínios & Padaria
    { id: 'leite', nome: 'Leite', categoria: 'laticinios-padaria', unidade: 'litro', precoMedio: 4.20, favorito: false, vezesUsado: 0 },
    { id: 'pao', nome: 'Pão', categoria: 'laticinios-padaria', unidade: 'unidade', precoMedio: 2.50, favorito: false, vezesUsado: 0 },
    { id: 'manteiga', nome: 'Manteiga', categoria: 'laticinios-padaria', unidade: 'unidade', precoMedio: 5.90, favorito: false, vezesUsado: 0 },
    { id: 'queijo', nome: 'Queijo', categoria: 'laticinios-padaria', unidade: 'kg', precoMedio: 18.90, favorito: false, vezesUsado: 0 },
    { id: 'iogurte', nome: 'Iogurte', categoria: 'laticinios-padaria', unidade: 'unidade', precoMedio: 1.80, favorito: false, vezesUsado: 0 },
    { id: 'requeijao', nome: 'Requeijão', categoria: 'laticinios-padaria', unidade: 'unidade', precoMedio: 4.50, favorito: false, vezesUsado: 0 },
    { id: 'ovo', nome: 'Ovos', categoria: 'laticinios-padaria', unidade: 'dúzia', precoMedio: 8.90, favorito: false, vezesUsado: 0 },

    // Carnes & Proteínas
    { id: 'frango', nome: 'Frango', categoria: 'carnes-proteinas', unidade: 'kg', precoMedio: 12.90, favorito: false, vezesUsado: 0 },
    { id: 'carne-bovina', nome: 'Carne Bovina', categoria: 'carnes-proteinas', unidade: 'kg', precoMedio: 25.90, favorito: false, vezesUsado: 0 },
    { id: 'peixe', nome: 'Peixe', categoria: 'carnes-proteinas', unidade: 'kg', precoMedio: 18.90, favorito: false, vezesUsado: 0 },
    { id: 'linguica', nome: 'Linguiça', categoria: 'carnes-proteinas', unidade: 'kg', precoMedio: 15.90, favorito: false, vezesUsado: 0 },
    { id: 'presunto', nome: 'Presunto', categoria: 'carnes-proteinas', unidade: 'kg', precoMedio: 22.90, favorito: false, vezesUsado: 0 },
    { id: 'mortadela', nome: 'Mortadela', categoria: 'carnes-proteinas', unidade: 'kg', precoMedio: 19.90, favorito: false, vezesUsado: 0 },

    // Frutas & Verduras
    { id: 'banana', nome: 'Banana', categoria: 'frutas-verduras', unidade: 'kg', precoMedio: 4.90, favorito: false, vezesUsado: 0 },
    { id: 'maca', nome: 'Maçã', categoria: 'frutas-verduras', unidade: 'kg', precoMedio: 6.90, favorito: false, vezesUsado: 0 },
    { id: 'laranja', nome: 'Laranja', categoria: 'frutas-verduras', unidade: 'kg', precoMedio: 3.90, favorito: false, vezesUsado: 0 },
    { id: 'tomate', nome: 'Tomate', categoria: 'frutas-verduras', unidade: 'kg', precoMedio: 5.90, favorito: false, vezesUsado: 0 },
    { id: 'alface', nome: 'Alface', categoria: 'frutas-verduras', unidade: 'unidade', precoMedio: 1.50, favorito: false, vezesUsado: 0 },
    { id: 'cebola', nome: 'Cebola', categoria: 'frutas-verduras', unidade: 'kg', precoMedio: 4.50, favorito: false, vezesUsado: 0 },
    { id: 'batata', nome: 'Batata', categoria: 'frutas-verduras', unidade: 'kg', precoMedio: 3.90, favorito: false, vezesUsado: 0 },
    { id: 'cenoura', nome: 'Cenoura', categoria: 'frutas-verduras', unidade: 'kg', precoMedio: 4.20, favorito: false, vezesUsado: 0 },

    // Grãos & Básicos
    { id: 'arroz', nome: 'Arroz', categoria: 'graos-basicos', unidade: 'kg', precoMedio: 4.90, favorito: false, vezesUsado: 0 },
    { id: 'feijao', nome: 'Feijão', categoria: 'graos-basicos', unidade: 'kg', precoMedio: 6.90, favorito: false, vezesUsado: 0 },
    { id: 'macarrao', nome: 'Macarrão', categoria: 'graos-basicos', unidade: 'unidade', precoMedio: 2.90, favorito: false, vezesUsado: 0 },
    { id: 'acucar', nome: 'Açúcar', categoria: 'graos-basicos', unidade: 'kg', precoMedio: 3.90, favorito: false, vezesUsado: 0 },
    { id: 'sal', nome: 'Sal', categoria: 'graos-basicos', unidade: 'unidade', precoMedio: 1.50, favorito: false, vezesUsado: 0 },
    { id: 'oleo', nome: 'Óleo', categoria: 'graos-basicos', unidade: 'litro', precoMedio: 4.50, favorito: false, vezesUsado: 0 },
    { id: 'farinha-trigo', nome: 'Farinha de Trigo', categoria: 'graos-basicos', unidade: 'kg', precoMedio: 3.50, favorito: false, vezesUsado: 0 },

    // Bebidas
    { id: 'agua', nome: 'Água', categoria: 'bebidas', unidade: 'litro', precoMedio: 2.50, favorito: false, vezesUsado: 0 },
    { id: 'refrigerante', nome: 'Refrigerante', categoria: 'bebidas', unidade: 'litro', precoMedio: 4.90, favorito: false, vezesUsado: 0 },
    { id: 'suco', nome: 'Suco', categoria: 'bebidas', unidade: 'litro', precoMedio: 3.90, favorito: false, vezesUsado: 0 },
    { id: 'cafe', nome: 'Café', categoria: 'bebidas', unidade: 'kg', precoMedio: 8.90, favorito: false, vezesUsado: 0 },
    { id: 'cerveja', nome: 'Cerveja', categoria: 'bebidas', unidade: 'unidade', precoMedio: 2.90, favorito: false, vezesUsado: 0 },

    // Doces & Salgadinhos
    { id: 'chocolate', nome: 'Chocolate', categoria: 'doces-salgadinhos', unidade: 'unidade', precoMedio: 4.50, favorito: false, vezesUsado: 0 },
    { id: 'biscoito', nome: 'Biscoito', categoria: 'doces-salgadinhos', unidade: 'unidade', precoMedio: 3.90, favorito: false, vezesUsado: 0 },
    { id: 'salgadinho', nome: 'Salgadinho', categoria: 'doces-salgadinhos', unidade: 'unidade', precoMedio: 2.90, favorito: false, vezesUsado: 0 },
    { id: 'balas', nome: 'Balas', categoria: 'doces-salgadinhos', unidade: 'unidade', precoMedio: 1.50, favorito: false, vezesUsado: 0 },

    // Congelados
    { id: 'sorvete', nome: 'Sorvete', categoria: 'congelados', unidade: 'unidade', precoMedio: 8.90, favorito: false, vezesUsado: 0 },
    { id: 'pizza', nome: 'Pizza Congelada', categoria: 'congelados', unidade: 'unidade', precoMedio: 12.90, favorito: false, vezesUsado: 0 },
    { id: 'hamburguer', nome: 'Hambúrguer', categoria: 'congelados', unidade: 'unidade', precoMedio: 15.90, favorito: false, vezesUsado: 0 }
  ];

  constructor() {
    this.inicializarCatalogo();
  }

  // Obter todas as categorias
  obterCategorias(): CategoriaProduto[] {
    return this.categorias;
  }

  // Obter categoria por ID
  obterCategoriaPorId(id: string): CategoriaProduto | undefined {
    return this.categorias.find(cat => cat.id === id);
  }

  // Buscar produtos por nome
  buscarProdutos(termo: string): ProdutoCatalogo[] {
    const catalogo = this.obterCatalogo();
    const termoLower = termo.toLowerCase();
    
    return catalogo.filter(produto => 
      produto.nome.toLowerCase().includes(termoLower) ||
      produto.categoria.toLowerCase().includes(termoLower)
    ).sort((a, b) => {
      // Priorizar favoritos e mais usados
      if (a.favorito && !b.favorito) return -1;
      if (!a.favorito && b.favorito) return 1;
      if (a.vezesUsado !== b.vezesUsado) return b.vezesUsado - a.vezesUsado;
      return a.nome.localeCompare(b.nome);
    });
  }

  // Obter produtos por categoria
  obterProdutosPorCategoria(categoriaId: string): ProdutoCatalogo[] {
    const catalogo = this.obterCatalogo();
    return catalogo
      .filter(produto => produto.categoria === categoriaId)
      .sort((a, b) => {
        if (a.favorito && !b.favorito) return -1;
        if (!a.favorito && b.favorito) return 1;
        return b.vezesUsado - a.vezesUsado;
      });
  }

  // Obter produtos favoritos
  obterFavoritos(): ProdutoCatalogo[] {
    const catalogo = this.obterCatalogo();
    return catalogo
      .filter(produto => produto.favorito)
      .sort((a, b) => b.vezesUsado - a.vezesUsado);
  }

  // Obter produtos mais usados
  obterMaisUsados(limite: number = 10): ProdutoCatalogo[] {
    const catalogo = this.obterCatalogo();
    return catalogo
      .filter(produto => produto.vezesUsado > 0)
      .sort((a, b) => b.vezesUsado - a.vezesUsado)
      .slice(0, limite);
  }

  // Adicionar produto ao catálogo
  adicionarProduto(produto: Omit<ProdutoCatalogo, 'id' | 'favorito' | 'vezesUsado'>): ProdutoCatalogo {
    const catalogo = this.obterCatalogo();
    const novoProduto: ProdutoCatalogo = {
      ...produto,
      id: this.gerarId(),
      favorito: false,
      vezesUsado: 0
    };
    
    catalogo.push(novoProduto);
    this.salvarCatalogo(catalogo);
    return novoProduto;
  }

  // Marcar produto como favorito
  alternarFavorito(produtoId: string): boolean {
    const catalogo = this.obterCatalogo();
    const produto = catalogo.find(p => p.id === produtoId);
    
    if (produto) {
      produto.favorito = !produto.favorito;
      this.salvarCatalogo(catalogo);
      return produto.favorito;
    }
    
    return false;
  }

  // Registrar uso do produto
  registrarUso(produtoId: string): void {
    const catalogo = this.obterCatalogo();
    const produto = catalogo.find(p => p.id === produtoId);
    
    if (produto) {
      produto.vezesUsado++;
      produto.dataUltimoUso = new Date().toISOString();
      this.salvarCatalogo(catalogo);
    }
  }

  // Obter produto por ID
  obterProdutoPorId(id: string): ProdutoCatalogo | undefined {
    const catalogo = this.obterCatalogo();
    return catalogo.find(p => p.id === id);
  }

  // Obter catálogo completo
  obterCatalogo(): ProdutoCatalogo[] {
    const dados = localStorage.getItem(this.CATALOGO_KEY);
    return dados ? JSON.parse(dados) : [];
  }

  // Inicializar catálogo com produtos padrão
  private inicializarCatalogo(): void {
    const catalogoAtual = this.obterCatalogo();
    
    if (catalogoAtual.length === 0) {
      this.salvarCatalogo(this.produtosIniciais);
    } else {
      // Adicionar novos produtos que não existem no catálogo atual
      const novosProdutos = this.produtosIniciais.filter(
        produtoInicial => !catalogoAtual.some(produtoAtual => produtoAtual.id === produtoInicial.id)
      );
      
      if (novosProdutos.length > 0) {
        const catalogoAtualizado = [...catalogoAtual, ...novosProdutos];
        this.salvarCatalogo(catalogoAtualizado);
      }
    }
  }

  // Salvar catálogo no localStorage
  private salvarCatalogo(catalogo: ProdutoCatalogo[]): void {
    localStorage.setItem(this.CATALOGO_KEY, JSON.stringify(catalogo));
  }

  // Gerar ID único
  private gerarId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Obter estatísticas do catálogo
  obterEstatisticas(): any {
    const catalogo = this.obterCatalogo();
    const favoritos = catalogo.filter(p => p.favorito).length;
    const maisUsados = catalogo.filter(p => p.vezesUsado > 0).length;
    
    const produtosPorCategoria = this.categorias.map(categoria => ({
      categoria: categoria.nome,
      quantidade: catalogo.filter(p => p.categoria === categoria.id).length
    }));

    return {
      totalProdutos: catalogo.length,
      totalFavoritos: favoritos,
      totalMaisUsados: maisUsados,
      produtosPorCategoria
    };
  }
}
