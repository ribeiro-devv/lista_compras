import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActionSheetController, AlertController, ToastController } from '@ionic/angular';
import { TarefaService } from 'src/app/services/tarefa.service';
import { AddProdutoModalComponent } from 'src/app/components/add-produto-modal/add-produto-modal.component';
import { ModalController } from '@ionic/angular';
import { EditProdutoModalComponent } from 'src/app/components/edit-produto-modal/edit-produto-modal.component';
import { InformacoesModalComponent } from 'src/app/components/informacoes-modal/informacoes-modal.component';
import { TourService } from 'src/app/services/tour.service';
import { Router } from '@angular/router';
import { DetalhesProdutoModalComponent } from 'src/app/components/detalhes-produto-modal/detalhes-produto-modal.component';
import { UtilsService } from 'src/app/services/utils/utils.service';
import { ExcluirTodosModalComponent } from 'src/app/components/excluir-todos-modal/excluir-todos-modal.component';
import { FavoritosModalComponent } from 'src/app/components/favoritos-modal/favoritos-modal.component';
import { ManageListsModalComponent } from 'src/app/components/manage-lists-modal/manage-lists-modal.component';
import { SharedListService, SharedList } from 'src/app/services/shared-list.service';
import { CatalogoService, ProdutoCatalogo } from 'src/app/services/catalogo.service';
import { PrecoService } from 'src/app/services/preco.service';
import { OrdenacaoService, ModoOrdenacao, MODOS_ORDENACAO } from 'src/app/services/ordenacao.service';
import { subtotalItem } from 'src/app/services/calculo-item';
import { LojaService } from 'src/app/services/loja.service';
import { CompararPrecosModalComponent } from 'src/app/components/comparar-precos-modal/comparar-precos-modal.component';
import { CategoriaService } from 'src/app/services/categoria.service';
import { abreviarUnidade } from 'src/app/services/unidades';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit, OnDestroy {

  tarefaCollection: any[] = [];
  currentList: SharedList | null = null;

  // Adição rápida com autocomplete
  novoItem = '';
  sugestoes: ProdutoCatalogo[] = [];
  mostrarSugestoes = false;

  // Derivados memoizados (recalculados só quando a lista muda) — evita flicker
  itensAgrupados: Array<{ categoria: string; itens: any[] }> = [];
  progresso = { comprados: 0, total: 0, percent: 0 };

  // Ordenação da lista (só visualização — não reescreve `codigo`)
  modoOrdenacao: ModoOrdenacao = 'categoria';

  // Atalhos "mais comprados" (tela vazia)
  sugeridos: ProdutoCatalogo[] = [];

  private listaSubscription?: Subscription;
  private currentListSubscription?: Subscription;

  constructor(
    private alertCtrl: AlertController,
    private tarefaService: TarefaService,
    private actionSheetCtrl: ActionSheetController,
    private modalCtrl: ModalController,
    private router: Router,
    public tourService: TourService,
    private utilsService: UtilsService,
    private sharedListService: SharedListService,
    private catalogoService: CatalogoService,
    private precoService: PrecoService,
    private toastCtrl: ToastController,
    private ordenacaoService: OrdenacaoService,
    private lojaService: LojaService,
    private categoriaService: CategoriaService
  ) { }

  ngOnInit() {
    this.modoOrdenacao = this.ordenacaoService.obterModo();
    this.lojaService.carregar();

    this.listaSubscription = this.tarefaService.lista$.subscribe(lista => {
      this.tarefaCollection = lista;
      this.recomputar();
    });

    // 🔧 FIX: Observar mudanças na lista atual
    this.currentListSubscription = this.sharedListService.currentList$.subscribe(list => {
      this.currentList = list;
    });
  }

  ngOnDestroy() {
    if (this.listaSubscription) {
      this.listaSubscription.unsubscribe();
    }
    if (this.currentListSubscription) {
      this.currentListSubscription.unsubscribe();
    }
  }

  ionViewDidEnter() {
    this.listarTarefa();
    this.checkFirstAccess();
    this.carregarSugeridos();
  }

  carregarSugeridos() {
    let lista = this.catalogoService.obterMaisUsados(12);
    if (lista.length === 0) lista = this.catalogoService.obterFavoritos().slice(0, 12);
    this.sugeridos = lista;
  }

  openSettings() {
    this.router.navigate(['/settings']);
  }

  openHistorico() {
    this.router.navigate(['/historico']);
  }

  openEstatisticas() {
    // A tela de Histórico já é o dashboard de estatísticas.
    this.router.navigate(['/historico']);
  }

  async openFavoritos() {
    const modal = await this.modalCtrl.create({
      component: FavoritosModalComponent,
      cssClass: 'manage-lists-modal'
    });
    await modal.present();
  }

  async openCompartilhar() {
    const modal = await this.modalCtrl.create({
      component: ManageListsModalComponent,
      cssClass: 'manage-lists-modal',
      backdropDismiss: true
    });
    await modal.present();
  }

  checkFirstAccess() {
    if (!this.tourService.isTourCompletedOnce()) {
      setTimeout(() => {
        this.tourService.startTour();
      }, 1000);
    }
  }

  listarTarefa() {
    this.tarefaCollection = this.tarefaService.listar();
    this.recomputar();
  }

  trackByFn(index: number, item: any) {
    return item.codigo ? item.codigo : index;
  }

  trackByCategoria(index: number, grupo: { categoria: string }) {
    return grupo.categoria;
  }

  /** Recalcula agrupamento + progresso só quando a lista muda (evita flicker). */
  private recomputar() {
    this.itensAgrupados = this.ordenacaoService.agrupar(this.tarefaCollection, this.modoOrdenacao);

    const total = this.tarefaCollection.length;
    const comprados = this.tarefaCollection.filter(i => i.feito).length;
    this.progresso = { comprados, total, percent: total > 0 ? comprados / total : 0 };
  }

  // ---------- Ordenação ----------
  rotuloOrdenacao(): string {
    return this.ordenacaoService.rotulo(this.modoOrdenacao);
  }

  async abrirSeletorOrdenacao() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Ordenar lista por',
      mode: 'ios',
      buttons: [
        ...MODOS_ORDENACAO.map(modo => ({
          text: modo.rotulo + (modo.valor === this.modoOrdenacao ? '  ✓' : ''),
          icon: modo.icone,
          handler: () => this.definirOrdenacao(modo.valor)
        })),
        { text: 'Cancelar', icon: 'close', role: 'cancel' }
      ]
    });

    await actionSheet.present();
  }

  private definirOrdenacao(modo: ModoOrdenacao) {
    this.modoOrdenacao = modo;
    this.ordenacaoService.definirModo(modo);
    this.recomputar();
  }

  // ---------- Comparação de preços ----------
  async compararPrecos(tarefa: any) {
    const modal = await this.modalCtrl.create({
      component: CompararPrecosModalComponent,
      componentProps: { nomeProduto: tarefa.tarefa },
      cssClass: 'manage-lists-modal'
    });
    await modal.present();
  }

  // ---------- Categoria do item ----------
  async abrirSeletorCategoria(tarefa: any) {
    const atual = tarefa.categoria || 'Outros';

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Mover para a categoria',
      mode: 'ios',
      buttons: [
        ...this.catalogoService.obterCategorias().map(categoria => ({
          text: categoria.nome + (categoria.nome === atual ? '  ✓' : ''),
          icon: categoria.icone,
          handler: () => this.moverParaCategoria(tarefa, categoria.nome)
        })),
        { text: 'Cancelar', icon: 'close', role: 'cancel' }
      ]
    });

    await actionSheet.present();
  }

  private async moverParaCategoria(tarefa: any, categoria: string) {
    if ((tarefa.categoria || 'Outros') === categoria) return;

    try {
      await this.tarefaService.mudarCategoria(tarefa, categoria);
      await this.utilsService.showToast(`"${tarefa.tarefa}" movido para ${categoria}`, 'success');
    } catch {
      await this.utilsService.showToast('Não foi possível mudar a categoria', 'danger');
    }
  }

  // ---------- Adição rápida + autocomplete ----------
  onQuickInput() {
    const termo = this.novoItem.trim();
    if (termo.length < 1) {
      this.sugestoes = [];
      this.mostrarSugestoes = false;
      return;
    }
    this.sugestoes = this.catalogoService.buscarProdutos(termo).slice(0, 6);
    this.mostrarSugestoes = this.sugestoes.length > 0;
  }

  fecharSugestoes() {
    // pequeno atraso para permitir o clique na sugestão
    setTimeout(() => (this.mostrarSugestoes = false), 150);
  }

  async adicionarRapido(produto?: ProdutoCatalogo) {
    const nome = produto ? produto.nome : this.novoItem.trim();
    if (!nome) return;

    if (produto) {
      this.catalogoService.registrarUso(produto.id);
    }

    // Preço sugerido: prefere o SEU último preço; senão o estimado do catálogo.
    const valor = this.precoService.obterPreco(nome) ?? (produto?.precoMedio || 0);

    await this.tarefaService.salvar({
      tarefa: nome,
      quantidade: 1,
      valorUnitario: valor,
      feito: false
    });

    this.novoItem = '';
    this.sugestoes = [];
    this.mostrarSugestoes = false;
  }

  /** Preço a exibir na sugestão: o seu último preço, ou o estimado do catálogo. */
  precoSugestao(produto: ProdutoCatalogo): number {
    return this.precoService.obterPreco(produto.nome) ?? (produto.precoMedio || 0);
  }

  /** True quando o preço mostrado é o do próprio usuário (não o estimado). */
  ehMeuPreco(produto: ProdutoCatalogo): boolean {
    return this.precoService.obterPreco(produto.nome) != null;
  }

  // ---------- Marcar comprado com 1 toque ----------
  async toggleComprado(item: any, ev: Event) {
    ev.stopPropagation();

    // Já no carrinho: apenas remove (direto).
    if (item.feito) {
      item.feito = false;
      this.tarefaService.atualizar(item);
      try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
      return;
    }

    // Marcar: regra do app exige quantidade E valor. Se faltar, pede antes.
    const qtd = parseFloat(item.quantidade) || 0;
    const valor = parseFloat(item.valorUnitario) || 0;
    if (qtd > 0 && valor > 0) {
      item.feito = true;
      this.tarefaService.atualizar(item);
      try { await Haptics.impact({ style: ImpactStyle.Light }); } catch {}
    } else {
      this.solicitarValorUnitario(item);
    }
  }

  // ---------- Stepper de quantidade ----------
  alterarQuantidade(item: any, delta: number, ev: Event) {
    ev.stopPropagation();
    const atual = parseFloat(item.quantidade) || 0;
    const nova = Math.max(1, atual + delta);
    if (nova === atual) return;
    item.quantidade = nova;
    this.tarefaService.atualizar(item);
  }

  // ---------- Excluir com desfazer ----------
  async excluirComUndo(item: any, ev?: Event) {
    if (ev) ev.stopPropagation();
    const backup = { ...item };
    this.tarefaService.excluir(item);

    const toast = await this.toastCtrl.create({
      message: `"${backup.tarefa}" removido`,
      duration: 4000,
      position: 'bottom',
      color: 'dark',
      buttons: [{
        text: 'Desfazer',
        role: 'cancel',
        handler: () => {
          this.tarefaService.salvar({
            tarefa: backup.tarefa,
            quantidade: backup.quantidade,
            valorUnitario: backup.valorUnitario,
            feito: backup.feito
          });
        }
      }]
    });
    await toast.present();
  }

  getCategoriaIcon(categoria: string): string {
    const encontrada = this.catalogoService.obterCategorias()
      .find(c => c.nome === categoria);
    return encontrada?.icone || 'pricetag-outline';
  }

  getCategoriaCor(categoria: string): string {
    const encontrada = this.catalogoService.obterCategorias()
      .find(c => c.nome === categoria);
    return encontrada?.cor || 'var(--ion-color-medium)';
  }

  /** Slug da ilustração; null nas categorias criadas pelo usuário (usam ionicon). */
  getCategoriaArte(categoria: string): string | null {
    return this.categoriaService.slugIlustracao(categoria);
  }

  // 🔧 FIX: Métodos para gerenciar listas
  getNomeLista(): string {
    return this.currentList?.name || 'Minha Lista';
  }

  isListaPersonal(): boolean {
    return this.sharedListService.isPersonalList(this.currentList);
  }

  async abrirSeletorLista() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Selecionar Lista',
      mode: 'ios',
      buttons: [
        {
          text: '📝 Minha Lista',
          icon: 'person',
          handler: async () => {
            const listaPersonal = await this.sharedListService.ensurePersonalList();
            if (listaPersonal) {
              this.sharedListService.setCurrentList(listaPersonal);
              await this.utilsService.showToast('Lista pessoal selecionada', 'success');
            }
          }
        },
        {
          text: '☁️ Gerenciar Listas Compartilhadas',
          icon: 'cloud',
          handler: () => {
            this.router.navigate(['/settings']);
            // Pode abrir direto o modal se preferir
          }
        },
        {
          text: 'Cancelar',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  async showAdd() {
    const modal = await this.modalCtrl.create({
      component: AddProdutoModalComponent,
      componentProps: {},
      cssClass: 'add-produto-modal',
      backdropDismiss: false
    });
  
    modal.onDidDismiss().then(async (result) => {
      if (result.role === 'confirm') {
        const dados = result.data;

        if (!dados.tarefa || dados.tarefa.trim() === '') {
          this.showSimpleAlert('O nome do produto não pode estar vazio');
          return;
        }
  
        if (!dados.quantidade || dados.quantidade <= 0) {
          dados.quantidade = 0;
        }
  
        if (!dados.valorUnitario || dados.valorUnitario < 0) {
          dados.valorUnitario = 0;
        }

        dados.feito = dados.feito ?? false;

        if (dados.feito) {
          const loading = await this.utilsService.showCartLoading('Adicionando ao carrinho...');
          setTimeout(() => {
            this.tarefaService.salvar(dados, () => {
              this.utilsService.showToast(`Produto ${dados.tarefa} adicionado na lista com sucesso`, 'success');
              if (loading) loading.dismiss();
            });
          }, 1000);
        } else {
          this.tarefaService.salvar(dados, () => {
            this.utilsService.showToast(`Produto ${dados.tarefa} adicionado na lista com sucesso`, 'success');
          });
        }
      }
    });
    await modal.present();
  }

  async delete(item: any) {
    const alert = await this.alertCtrl.create({
      header: 'Confirmar Exclusão',
      message: `Deseja excluir "${item.tarefa}" da lista?`,
      mode: 'ios',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary'
        },
        {
          text: 'Excluir',
          cssClass: 'danger',
          handler: () => {
            this.tarefaService.excluir(item, () => {
              this.utilsService.showToast(`Produto ${item.tarefa} removido na lista com sucesso`, 'success');
            });
          }
        }
      ]
    });
    await alert.present();
  }

  async editar(tarefa: any) {
    const modal = await this.modalCtrl.create({
      component: EditProdutoModalComponent,
      componentProps: { tarefa },
      cssClass: 'add-produto-modal',
      backdropDismiss: false
    });

    modal.onDidDismiss().then((result) => {
      if (result.role === 'confirm') {
        const dadosEditados = result.data;
        if (!dadosEditados.tarefa || dadosEditados.tarefa.trim() === '') {
          this.utilsService.showToast(`O nome do produto não pode estar vazio`, 'danger');
          return;
        }
        dadosEditados.codigo = tarefa.codigo;
        this.tarefaService.edicao(dadosEditados, () => {
          this.utilsService.showToast(`Produto ${dadosEditados.tarefa} editada com sucesso`, 'success');
        });
      }
    });

    await modal.present();
  }

  async solicitarValorUnitario(tarefa: any) {
    const modal = await this.modalCtrl.create({
      component: InformacoesModalComponent,
      componentProps: { tarefa },
      cssClass: 'add-produto-modal',
      backdropDismiss: false
    });
  
    modal.onDidDismiss().then(async (result) => {
      if (result.role === 'confirm') {
        const dados = result.data;
        if (dados.valorUnitario !== undefined && dados.valorUnitario !== null && !isNaN(dados.valorUnitario)) {
          const loading = await this.utilsService.showCartLoading('Adicionando ao carrinho...');
          tarefa.feito = true;
          tarefa.valorUnitario = dados.valorUnitario;
          tarefa.quantidade = dados.quantidade
          setTimeout(() => {
            this.tarefaService.atualizar(tarefa, () => {
              this.utilsService.showToast(`Produto ${tarefa.tarefa} adicionado ao carrinho!`, 'success');
              if (loading) loading.dismiss();
            });
          }, 1000);
        }
      }
    });
    await modal.present();
  }

  async showExclusion() {
    const modal = await this.modalCtrl.create({
      component: ExcluirTodosModalComponent,
      componentProps: {},
      cssClass: 'add-produto-modal',
      backdropDismiss: false
    });   

    modal.onDidDismiss().then(async (result)  => {
      if (result.role === 'confirm') {
        const loading = await this.utilsService.showLoading('Excluindo todos...');
        
        setTimeout(() => {
          this.tarefaService.excluirTodos(() => {
            this.utilsService.showToast(`Todos os produtos foram excluídos com sucesso`, 'success');
            if (loading) loading.dismiss();
          });
        }, 1000);
      }
    });

    await modal.present();
  }

  getTotalGeral(): number {
    return this.tarefaService.calcularTotalGeral();
  }

  getTotalComprado(): number {
    return this.tarefaService.calcularTotalComprado();
  }

  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  calcularSubtotal(item: any): number {
    return subtotalItem(item);
  }

  /** Subtotal antes do desconto — usado no preço riscado. */
  calcularSubtotalCheio(item: any): number {
    return (parseFloat(item.quantidade) || 0) * (parseFloat(item.valorUnitario) || 0);
  }

  temDesconto(item: any): boolean {
    return (parseFloat(item.desconto) || 0) > 0;
  }

  /** Ex: "2 kg". Unidade avulsa não ganha rótulo. */
  rotuloQuantidade(item: any): string {
    const abreviacao = abreviarUnidade(item.unidade);
    return abreviacao ? `${item.quantidade} ${abreviacao}` : `${item.quantidade}`;
  }

  getTotalDesconto(): number {
    return this.tarefaService.calcularTotalDesconto();
  }

  restartTour() {
    this.tourService.resetTour();
    setTimeout(() => {
      this.tourService.startTour();
    }, 500);
  }

  async openActions(tarefa: any) {
    const actionSheet = await this.actionSheetCtrl.create({
      header: `Ações para "${tarefa.tarefa}"`,
      subHeader: tarefa.feito ? 'Item já adicionado ao carrinho' : 'Item não adicionado no carrinho',
      cssClass: 'custom-action-sheet',
      mode: 'ios',
      buttons: [
        {
          text: tarefa.feito ? 'Remover do Carrinho' : 'Adicionar ao Carrinho',
          icon: tarefa.feito ? 'remove-circle' : 'checkmark-circle',
          cssClass: tarefa.feito ? 'action-remove' : 'action-add',
          handler: () => {
            if (!tarefa.feito) {
              this.adicionarAoCarrinho(tarefa);
            } else {
              this.removerDoCarrinho(tarefa);
            }
          }
        },
        
        ...(tarefa.feito ? [] : [{
          text: 'Editar Produto',
          icon: 'pencil',
          cssClass: 'action-edit',
          handler: () => {
            this.editar(tarefa);
          }
        }]),

        {
          text: 'Ver Detalhes',
          icon: 'information-circle',
          cssClass: 'action-info',
          handler: () => {
            this.mostrarDetalhes(tarefa);
          }
        },
        {
          text: 'Duplicar Produto',
          icon: 'copy-outline',
          cssClass: 'action-duplicate',
          handler: () => {
            this.duplicarProduto(tarefa);
          }
        },
        {
          text: 'Mudar Categoria',
          icon: 'pricetags-outline',
          cssClass: 'action-edit',
          handler: () => {
            this.abrirSeletorCategoria(tarefa);
          }
        },
        {
          text: 'Comparar Preços',
          icon: 'storefront-outline',
          cssClass: 'action-info',
          handler: () => {
            this.compararPrecos(tarefa);
          }
        },

        {
          text: '',
          icon: '',
          cssClass: 'action-separator',
          handler: () => false
        },

        {
          text: 'Excluir Produto',
          icon: 'trash',
          cssClass: 'action-delete',
          handler: () => {
            this.delete(tarefa);
          }
        },

        {
          text: 'Cancelar',
          icon: 'close',
          role: 'cancel',
          cssClass: 'action-cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  private adicionarAoCarrinho(tarefa: any) {
    this.solicitarValorUnitario(tarefa);
  }

  async removerDoCarrinho(tarefa: any) {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Remover do Carrinho',
      subHeader: `Deseja remover "${tarefa.tarefa}" do carrinho?`,
      mode: 'ios',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Remover',
          cssClass: 'danger',
          handler: () => {
            tarefa.feito = false;
            this.tarefaService.atualizar(tarefa, () => {
              this.utilsService.showToast(`Produto ${tarefa.tarefa} removido do carrinho`, 'warning');
            });
          }
        }
      ]
    });
    await actionSheet.present();
  }

  async mostrarDetalhes(tarefa: any) {
    const modal = await this.modalCtrl.create({
      component: DetalhesProdutoModalComponent,
      componentProps: { tarefa },
      cssClass: 'add-produto-modal',
      backdropDismiss: false
    });
  
    modal.onDidDismiss().then(result => {
      if (result.role === 'editar') {
        this.editar(result.data);
      }
    });
  
    await modal.present();
  }

  async duplicarProduto(produto: any) {
    produto.feito = false;
    this.tarefaService.salvar(produto, () => {
      this.utilsService.showToast(`Produto ${produto.tarefa} adicionado na lista com sucesso`, 'success');
    });
  }

  private async showSimpleAlert(message: string) {
    const alert = await this.alertCtrl.create({
      header: 'Atenção',
      message: message,
      mode: 'ios',
      buttons: ['OK']
    });
    await alert.present();
  }

  isListaCompleta(): boolean {
    return this.tarefaService.isListaCompleta();
  }

  async arquivarLista() {
    const lojas = this.lojaService.listarSync();

    // Sem lojas cadastradas não faz sentido perguntar — vai direto.
    if (lojas.length === 0) {
      await this.confirmarArquivamento(null);
      return;
    }

    const atual = this.lojaService.lojaAtualId();

    const alert = await this.alertCtrl.create({
      header: 'Onde foi essa compra?',
      mode: 'ios',
      inputs: [
        ...lojas.map(loja => ({
          type: 'radio' as const,
          label: loja.nome,
          value: loja.id,
          checked: loja.id === atual
        })),
        {
          type: 'radio' as const,
          label: 'Não informar',
          value: '',
          checked: !atual
        }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Continuar',
          handler: (lojaId: string) => {
            this.confirmarArquivamento(lojaId || null);
          }
        }
      ]
    });

    await alert.present();
  }

  private async confirmarArquivamento(lojaId: string | null) {
    const alert = await this.alertCtrl.create({
      header: 'Arquivar Lista',
      message: 'Deseja arquivar esta lista no histórico? Ela será salva e a lista atual será limpa.',
      mode: 'ios',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Arquivar',
          handler: async () => {
            try {
              const loading = await this.utilsService.showLoading('Arquivando lista...');

              const listaArquivada = await this.tarefaService.arquivarListaAtual(undefined, lojaId);

              if (loading) await loading.dismiss();
              this.utilsService.showToast(`Lista "${listaArquivada.nome}" arquivada com sucesso!`, 'success');
            } catch (error) {
              this.utilsService.showToast(`Erro ao arquivar a lista. Tente novamente.`, 'danger');
            }
          }
        }
      ]
    });
    await alert.present();
  }
}