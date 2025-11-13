import { Component, OnInit, AfterViewInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ModalController, IonInput, ToastController } from '@ionic/angular';
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
    private catalogoService: CatalogoService,
    private toastController: ToastController
  ) {
    this.produtoForm = this.fb.group({
      tarefa: ['', Validators.required],
      quantidade: [null, [Validators.min(0)]],
      valorUnitario: [null, [Validators.min(0.00)]],
      feito: [false],
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
      feito: dados.feito ?? false,
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

  toggleCarrinho() {
    const currentValue = this.produtoForm.get('feito')?.value;
    
    // Se está tentando ativar (adicionar ao carrinho), precisa validar
    if (!currentValue) {
      if (!this.validarCamposParaCarrinho()) {
        return; // Não permite adicionar se não passar na validação
      }
    }
    
    this.produtoForm.patchValue({ feito: !currentValue });
  }

  validarCamposParaCarrinho(): boolean {
    const tarefa = this.produtoForm.get('tarefa')?.value;
    const quantidade = this.produtoForm.get('quantidade')?.value;
    const valorUnitario = this.produtoForm.get('valorUnitario')?.value;

    // Marcar campos como touched para mostrar erros
    this.produtoForm.get('tarefa')?.markAsTouched();
    this.produtoForm.get('quantidade')?.markAsTouched();
    this.produtoForm.get('valorUnitario')?.markAsTouched();

    const erros: string[] = [];

    // Validar nome
    if (!tarefa || tarefa.trim() === '') {
      erros.push('Nome do produto é obrigatório');
    }

    // Validar quantidade
    if (quantidade === null || quantidade === undefined || quantidade === '' || Number(quantidade) <= 0) {
      erros.push('Quantidade deve ser maior que zero');
    }

    // Validar valor unitário
    if (valorUnitario === null || valorUnitario === undefined || valorUnitario === '') {
      erros.push('Valor unitário é obrigatório');
    } else {
      // Limpar e converter valor para número
      const valorLimpo = String(valorUnitario).replace(/[^\d,.-]/g, '').replace(',', '.');
      const valorNumerico = Number(valorLimpo);
      
      if (isNaN(valorNumerico) || valorNumerico <= 0) {
        erros.push('Valor unitário deve ser maior que zero');
      }
    }

    // Se houver erros, mostrar toast e retornar false
    if (erros.length > 0) {
      this.mostrarToastErro(erros.join(', '));
      return false;
    }

    return true;
  }

  private async mostrarToastErro(mensagem: string) {
    const toast = await this.toastController.create({
      message: mensagem,
      duration: 3000,
      position: 'top',
      color: 'danger',
      buttons: [
        {
          side: 'end',
          icon: 'close',
          handler: () => {
            toast.dismiss();
          }
        }
      ]
    });
    await toast.present();
  }

  mostrarErroQuantidade(): boolean {
    const quantidade = this.produtoForm.get('quantidade');
    if (!quantidade) return false;
    
    const value = quantidade.value;
    const isInvalid = quantidade.touched && 
      (value === null || value === undefined || value === '' || Number(value) <= 0);
    
    return isInvalid;
  }

  mostrarErroValor(): boolean {
    const valorUnitario = this.produtoForm.get('valorUnitario');
    if (!valorUnitario) return false;
    
    const value = valorUnitario.value;
    if (!valorUnitario.touched) return false;
    
    if (value === null || value === undefined || value === '') {
      return true;
    }
    
    // Limpar e converter valor para número
    const valorLimpo = String(value).replace(/[^\d,.-]/g, '').replace(',', '.');
    const valorNumerico = Number(valorLimpo);
    
    return isNaN(valorNumerico) || valorNumerico <= 0;
  }

  podeAdicionarAoCarrinho(): boolean {
    const tarefa = this.produtoForm.get('tarefa')?.value;
    const quantidade = this.produtoForm.get('quantidade')?.value;
    const valorUnitario = this.produtoForm.get('valorUnitario')?.value;

    // Validar nome
    if (!tarefa || tarefa.trim() === '') {
      return false;
    }

    // Validar quantidade
    if (quantidade === null || quantidade === undefined || quantidade === '' || Number(quantidade) <= 0) {
      return false;
    }

    // Validar valor unitário
    if (valorUnitario === null || valorUnitario === undefined || valorUnitario === '') {
      return false;
    }
    
    // Limpar e converter valor para número
    const valorLimpo = String(valorUnitario).replace(/[^\d,.-]/g, '').replace(',', '.');
    const valorNumerico = Number(valorLimpo);
    
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      return false;
    }

    return true;
  }
}