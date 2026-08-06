import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { CatalogoService, ProdutoCatalogo } from '../../services/catalogo.service';
import { PrecoService } from '../../services/preco.service';
import { normalizarUnidade, UNIDADES, UNIDADE_PADRAO } from '../../services/unidades';

/**
 * Adicionar produto.
 *
 * Um campo só para o nome: ele busca no catálogo E aceita texto livre. A
 * versão anterior tinha dois modos ("Buscar" e "Digitar") num botão de
 * alternância, e no modo Buscar o campo de nome ficava escondido — quem
 * quisesse um produto fora do catálogo digitava, não achava nada, e o botão
 * Salvar ficava desabilitado sem dizer por quê.
 */
@Component({
  selector: 'app-add-produto-modal',
  templateUrl: './add-produto-modal.component.html',
  styleUrls: ['./add-produto-modal.component.scss'],
})
export class AddProdutoModalComponent implements OnInit, AfterViewInit {

  @ViewChild('nomeProdutoInput', { static: false }) nomeProdutoInput!: ElementRef<HTMLInputElement>;

  nome = '';
  quantidade: number | null = 1;
  unidade = UNIDADE_PADRAO;
  precoTexto = '';
  feito = false;

  unidades = UNIDADES;
  sugestoes: ProdutoCatalogo[] = [];
  mostrarSugestoes = false;
  atalhos: ProdutoCatalogo[] = [];

  /** Produto do catálogo escolhido, se houver — só para registrar o uso. */
  private produtoEscolhido: ProdutoCatalogo | null = null;

  constructor(
    private modalCtrl: ModalController,
    private catalogoService: CatalogoService,
    private precoService: PrecoService
  ) {}

  ngOnInit() {
    this.carregarAtalhos();
  }

  ngAfterViewInit() {
    setTimeout(() => this.nomeProdutoInput?.nativeElement?.focus(), 250);
  }

  private carregarAtalhos() {
    const frequentes = this.catalogoService.obterMaisUsados(8);
    this.atalhos = frequentes.length > 0
      ? frequentes
      : this.catalogoService.obterFavoritos().slice(0, 8);
  }

  // ---- nome / sugestões ----

  onNomeChange() {
    this.produtoEscolhido = null;
    const termo = this.nome.trim();

    if (termo.length < 1) {
      this.sugestoes = [];
      this.mostrarSugestoes = false;
      return;
    }

    // Sugestão idêntica ao que já está escrito não ajuda em nada.
    this.sugestoes = this.catalogoService
      .buscarProdutos(termo)
      .filter(produto => produto.nome.toLowerCase() !== termo.toLowerCase())
      .slice(0, 6);

    this.mostrarSugestoes = this.sugestoes.length > 0;
  }

  onNomeFoco() {
    if (this.nome.trim()) this.onNomeChange();
  }

  limparNome() {
    this.nome = '';
    this.sugestoes = [];
    this.mostrarSugestoes = false;
    this.produtoEscolhido = null;
    this.nomeProdutoInput?.nativeElement?.focus();
  }

  /** Escolher do catálogo preenche nome, unidade e preço — tudo editável depois. */
  escolherProduto(produto: ProdutoCatalogo) {
    this.nome = produto.nome;
    this.unidade = normalizarUnidade(produto.unidade);
    this.produtoEscolhido = produto;

    const preco = this.precoSugerido(produto);
    if (preco && !this.precoTexto) {
      this.precoTexto = this.formatarMoedaSimples(preco);
    }

    this.sugestoes = [];
    this.mostrarSugestoes = false;
  }

  /** Preço que a pessoa pagou da última vez; cai no médio do catálogo. */
  precoSugerido(produto: ProdutoCatalogo): number | null {
    return this.precoService.obterPreco(produto.nome) ?? produto.precoMedio ?? null;
  }

  // ---- quantidade ----

  alterarQuantidade(delta: number) {
    const atual = Number(this.quantidade) || 0;
    this.quantidade = Math.max(0, Math.round((atual + delta) * 100) / 100);
  }

  normalizarQuantidade() {
    if (this.quantidade === null) return;
    const numero = Number(this.quantidade);
    this.quantidade = isNaN(numero) || numero < 0 ? 0 : numero;
  }

  // ---- preço ----

  /**
   * Digitação estilo caixa registradora: só dígitos entram e o valor cresce
   * da direita para a esquerda, sem o usuário precisar acertar vírgula.
   */
  onPrecoChange(valor: string) {
    const digitos = (valor || '').replace(/\D/g, '');

    if (!digitos) {
      this.precoTexto = '';
      return;
    }

    this.precoTexto = this.formatarMoedaSimples(Number(digitos) / 100);
  }

  get preco(): number {
    const limpo = this.precoTexto.replace(/[^\d,]/g, '').replace(',', '.');
    const numero = parseFloat(limpo);
    return isNaN(numero) ? 0 : numero;
  }

  get subtotal(): number {
    return (Number(this.quantidade) || 0) * this.preco;
  }

  formatarMoedaSimples(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor || 0);
  }

  // ---- salvar ----

  /** Só o nome é obrigatório: preço e quantidade têm padrão utilizável. */
  podeSalvar(): boolean {
    return this.nome.trim().length > 0;
  }

  salvar() {
    if (!this.podeSalvar()) return;

    if (this.produtoEscolhido) {
      this.catalogoService.registrarUso(this.produtoEscolhido.id);
    }

    this.modalCtrl.dismiss({
      tarefa: this.nome.trim(),
      quantidade: Number(this.quantidade) || 1,
      unidade: this.unidade,
      valorUnitario: this.preco,
      feito: this.feito
    }, 'confirm');
  }

  dismiss() {
    this.modalCtrl.dismiss(null, 'cancel');
  }
}
