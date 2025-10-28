import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, IonInput } from '@ionic/angular';
import { CatalogoService, ProdutoCatalogo, CategoriaProduto } from '../../services/catalogo.service';

@Component({
  selector: 'app-add-produto-modal',
  templateUrl: './add-produto-modal.component.html',
  styleUrls: ['./add-produto-modal.component.scss'],
})
export class AddProdutoModalComponent implements OnInit, AfterViewInit {

  produtoForm: FormGroup;
  produtosEncontrados: ProdutoCatalogo[] = [];
  categorias: CategoriaProduto[] = [];
  termoBusca: string = '';
  mostrarCatalogo: boolean = false;
  produtoSelecionado: ProdutoCatalogo | null = null;
  modoBusca: boolean = false;

  @ViewChild('nomeProdutoInput', { static: false }) nomeProdutoInput!: IonInput;

  constructor(
    private fb: FormBuilder, 
    private modalCtrl: ModalController,
    private catalogoService: CatalogoService
  ) {
    this.produtoForm = this.fb.group({
      tarefa: ['', Validators.required],
      quantidade: [null, [Validators.min(0)]],
      valorUnitario: [null, [Validators.min(0.00)]],
    });
  }

  ngOnInit() {
    this.categorias = this.catalogoService.obterCategorias();
    this.carregarProdutosIniciais();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.nomeProdutoInput?.setFocus();
    }, 300);
  }

  formatarMoeda(event: any) {
    const input = event.target;
    let value = input.value.replace(/\D/g, '');
    
    if (value) {
      const numero = Number(value) / 100;
      const valorFormatado = numero.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
      input.value = valorFormatado;
      this.produtoForm.get('valorUnitario')?.setValue(valorFormatado, { emitEvent: false });
    } else {
      input.value = '';
      this.produtoForm.get('valorUnitario')?.setValue(null, { emitEvent: false });
    }
  }
  
  salvar() {
    if (this.produtoForm.invalid) {
      this.produtoForm.markAllAsTouched();
      return;
    }

    const dados = this.produtoForm.value;
    const valorLimpo = String(dados.valorUnitario).replace(/[^\d,.-]/g, '').replace(',', '.');

    const retorno = {
      tarefa: dados.tarefa,
      quantidade: dados.quantidade ?? 0,
      valorUnitario: Number(valorLimpo),
      feito: false,
    };
    this.modalCtrl.dismiss(retorno, 'confirm');
  }

  dismiss() {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  // Métodos do catálogo
  carregarProdutosIniciais() {
    this.produtosEncontrados = this.catalogoService.obterMaisUsados(10);
    this.mostrarCatalogo = true; // Mostrar catálogo inicial
  }

  buscarProdutos() {
    if (this.termoBusca.trim().length >= 2) {
      this.produtosEncontrados = this.catalogoService.buscarProdutos(this.termoBusca);
      this.mostrarCatalogo = true;
    } else if (this.termoBusca.trim().length === 0) {
      this.carregarProdutosIniciais();
      this.mostrarCatalogo = true;
    } else {
      this.mostrarCatalogo = false;
    }
  }

  selecionarProduto(produto: ProdutoCatalogo) {
    this.produtoSelecionado = produto;
    
    // Atualizar o formControl
    this.produtoForm.patchValue({
      tarefa: produto.nome,
      quantidade: 1,
      valorUnitario: produto.precoMedio ? this.formatarPrecoMedio(produto.precoMedio) : null
    });
    
    // Atualizar o termo de busca
    this.termoBusca = produto.nome;
    
    // Esconder o catálogo
    this.mostrarCatalogo = false;
    
    // Registrar uso do produto
    this.catalogoService.registrarUso(produto.id);
    
    // Focar no campo de quantidade
    setTimeout(() => {
      const quantidadeInput = document.querySelector('ion-input[formControlName="quantidade"]') as any;
      if (quantidadeInput) {
        quantidadeInput.setFocus();
      }
    }, 100);
  }

  alternarModo() {
    this.modoBusca = !this.modoBusca;
    
    if (this.modoBusca) {
      // Voltando para modo busca
      this.produtoSelecionado = null;
      this.termoBusca = '';
      this.produtoForm.patchValue({
        tarefa: '',
        quantidade: null,
        valorUnitario: null
      });
      this.carregarProdutosIniciais();
    } else {
      // Modo digitação manual
      this.mostrarCatalogo = false;
      this.produtoForm.patchValue({
        tarefa: '',
        quantidade: null,
        valorUnitario: null
      });
      
      // Focar no input de nome
      setTimeout(() => {
        this.nomeProdutoInput?.setFocus();
      }, 100);
    }
  }

  obterProdutosPorCategoria(categoriaId: string) {
    return this.catalogoService.obterProdutosPorCategoria(categoriaId);
  }

  obterCategoriaPorId(categoriaId: string): CategoriaProduto | undefined {
    return this.catalogoService.obterCategoriaPorId(categoriaId);
  }

  obterFavoritos() {
    return this.catalogoService.obterFavoritos();
  }

  alternarFavorito(produto: ProdutoCatalogo) {
    this.catalogoService.alternarFavorito(produto.id);
    produto.favorito = !produto.favorito;
  }

  formatarMoedaSimples(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  // Método auxiliar para formatar preço médio como string monetária
  private formatarPrecoMedio(valor: number): string {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }
}