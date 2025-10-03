import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActionSheetController, AlertController, ToastController, ModalController } from '@ionic/angular';
import { HistoricoService, ResumoMensal, ListaCompra } from '../../services/historico.service';
import { ThemeService } from '../../services/theme.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-historico',
  templateUrl: './historico.page.html',
  styleUrls: ['./historico.page.scss'],
})
export class HistoricoPage implements OnInit {

  @ViewChild('graficoCanvas', { static: false }) graficoCanvas!: ElementRef<HTMLCanvasElement>;

  mesesDisponiveis: Array<{mes: number, ano: number, resumo: ResumoMensal}> = [];
  estatisticasGerais: any = null;
  filtroAtivo: string = 'recentes';
  mesExpandido: any = null;
  dadosGrafico: any[] = [];
  categoriasOrdenadas: any[] = [];
  listasRecentesAgrupadas: any[] = [];
  private resizeTimeout: any;

  constructor(
    private historicoService: HistoricoService,
    private themeService: ThemeService,
    private actionSheetCtrl: ActionSheetController,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private modalCtrl: ModalController,
    private router: Router,
  ) { }

  ngOnInit() {
    this.carregarDados();
  }

  ionViewDidEnter() {
    this.carregarDados();
    setTimeout(() => {
      if (this.dadosGrafico.length > 0) {
        this.criarGrafico();
      }
    }, 500);
  }
  
  carregarDados() {
    this.mesesDisponiveis = this.historicoService.obterMesesDisponiveis();
    this.estatisticasGerais = this.historicoService.obterEstatisticasGerais();
    this.prepararDadosGrafico();
    this.prepararCategorias();
    this.prepararListasRecentes();
  }

  prepararDadosGrafico() {
    this.dadosGrafico = this.mesesDisponiveis.slice(0, 6).reverse().map(m => ({
      label: `${m.resumo.mes.substring(0, 3)}/${m.ano.toString().substring(2)}`,
      valor: m.resumo.totalGasto,
      listas: m.resumo.totalListas
    }));
  }

  prepararCategorias() {
    if (!this.estatisticasGerais.totalCategorias) {
      this.categoriasOrdenadas = [];
      return;
    }

    const categorias = this.estatisticasGerais.totalCategorias;
      const categoriasObj: Record<string, number> = categorias as Record<string, number>;
    const total: number = Object.values(categoriasObj).reduce((sum, val) => sum + (typeof val === 'number' ? val : Number(val) || 0), 0);

    this.categoriasOrdenadas = Object.entries(categoriasObj)
      .map(([nome, valor]) => {
        const valorNum = typeof valor === 'number' ? valor : Number(valor) || 0;
        return {
          nome,
          valor: valorNum,
          percentual: total > 0 ? Math.round((valorNum / total) * 100) : 0
        };
      })
      .sort((a, b) => b.valor - a.valor);
  }

  prepararListasRecentes() {
    const todasListas: Array<{lista: ListaCompra, dataFormatada: string}> = [];
    
    this.mesesDisponiveis.forEach(m => {
      m.resumo.listas.forEach(lista => {
        todasListas.push({
          lista,
          dataFormatada: this.formatarDataParaAgrupamento(lista.dataFinalizacao)
        });
      });
    });

    // Ordenar por data mais recente
    todasListas.sort((a, b) => 
      new Date(b.lista.dataFinalizacao).getTime() - new Date(a.lista.dataFinalizacao).getTime()
    );

    // Agrupar por data
    const grupos = new Map<string, ListaCompra[]>();
    todasListas.slice(0, 20).forEach(item => {
      if (!grupos.has(item.dataFormatada)) {
        grupos.set(item.dataFormatada, []);
      }
      grupos.get(item.dataFormatada)!.push(item.lista);
    });

    this.listasRecentesAgrupadas = Array.from(grupos.entries()).map(([data, listas]) => ({
      data,
      listas
    }));
  }

  criarGrafico() {
    if (!this.graficoCanvas || this.dadosGrafico.length === 0) return;
  
    const canvas = this.graficoCanvas.nativeElement;
    const ctx = canvas.getContext('2d')!;
    
    // Configuração responsiva do canvas
    const containerWidth = canvas.parentElement?.clientWidth || 350;
    const dpr = window.devicePixelRatio || 1;
    
    // Define dimensões lógicas
    const logicalWidth = containerWidth - 32; // Margem de 16px de cada lado
    const logicalHeight = 220;
    
    // Define dimensões físicas (para telas de alta resolução)
    canvas.width = logicalWidth * dpr;
    canvas.height = logicalHeight * dpr;
    
    // Define dimensões CSS
    canvas.style.width = logicalWidth + 'px';
    canvas.style.height = logicalHeight + 'px';
    
    // Escala o contexto para corresponder ao device pixel ratio
    ctx.scale(dpr, dpr);
    
    // Configurações do gráfico
    const padding = {
      top: 20,
      right: 15,
      bottom: 40,
      left: 50
    };
    
    const chartWidth = logicalWidth - (padding.left + padding.right);
    const chartHeight = logicalHeight - (padding.top + padding.bottom);
  
    // Limpar canvas com anti-aliasing
    ctx.clearRect(0, 0, logicalWidth, logicalHeight);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  
    // Configurar cores baseado no tema
    const isDark = this.themeService.isDarkMode();
    const textColor = isDark ? '#ffffff' : '#333333';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const barColor = '#3880ff';
    const barGradientEnd = '#10dc60';
  
    // Encontrar valor máximo com margem
    const maxValue = Math.max(...this.dadosGrafico.map(d => d.valor));
    const maxValueRounded = Math.ceil(maxValue * 1.1 / 100) * 100; // Adiciona 10% de margem
  
    // Desenhar linhas de grade horizontais
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + (chartHeight * i / 5);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(logicalWidth - padding.right, y);
      ctx.stroke();
    }
    ctx.setLineDash([]); // Reset dash
  
    // Calcular largura das barras
    const totalBars = this.dadosGrafico.length;
    const barSpacing = chartWidth / totalBars;
    const barWidth = Math.min(barSpacing * 0.7, 60); // Máximo de 60px de largura
    const actualBarSpacing = chartWidth / totalBars;
  
    // Desenhar barras com gradiente
    this.dadosGrafico.forEach((data, index) => {
      const barHeight = (data.valor / maxValueRounded) * chartHeight;
      const x = padding.left + (index * actualBarSpacing) + (actualBarSpacing - barWidth) / 2;
      const y = padding.top + chartHeight - barHeight;
  
      // Criar gradiente para a barra
      const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
      gradient.addColorStop(0, barColor);
      gradient.addColorStop(1, barGradientEnd);
      
      // Desenhar barra com bordas arredondadas (simulado)
      ctx.fillStyle = gradient;
      const radius = 4;
      
      // Barra com topo arredondado
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + barWidth - radius, y);
      ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
      ctx.lineTo(x + barWidth, y + barHeight);
      ctx.lineTo(x, y + barHeight);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
  
      // Sombra suave
      ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      ctx.fill();
      ctx.shadowColor = 'transparent';
  
      // Label do mês (eixo X)
      ctx.fillStyle = textColor;
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(
        data.label, 
        x + barWidth / 2, 
        padding.top + chartHeight + 8
      );
  
      // Valor no topo da barra (apenas se houver espaço)
      if (barHeight > 20) {
        ctx.fillStyle = isDark ? '#ffffff' : '#333333';
        ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(
          this.formatarMoedaSimples(data.valor),
          x + barWidth / 2,
          y - 4
        );
      }
    });
  
    // Labels do eixo Y com formatação melhorada
    ctx.fillStyle = textColor;
    ctx.font = '10px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i <= 5; i++) {
      const valor = maxValueRounded - (maxValueRounded * i / 5);
      const y = padding.top + (chartHeight * i / 5);
      ctx.fillText(
        this.formatarMoedaSimples(valor), 
        padding.left - 8, 
        y
      );
    }
  
    // Linha base do eixo X (mais forte)
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(logicalWidth - padding.right, padding.top + chartHeight);
    ctx.stroke();
  
    // Linha do eixo Y
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.stroke();
  }

  formatarMoedaSimples(valor: number): string {
    if (valor >= 1000000) {
      return `R$ ${(valor / 1000000).toFixed(1)}M`;
    }
    if (valor >= 1000) {
      return `R$ ${(valor / 1000).toFixed(1)}k`;
    }
    return `R$ ${valor.toFixed(0)}`;
  }

  aplicarFiltro() {
    if (this.filtroAtivo === 'categorias') {
      this.prepararCategorias();
    } else if (this.filtroAtivo === 'recentes') {
      this.prepararListasRecentes();
    }
  }

  toggleMesDetalhes(mes: any) {
    this.mesExpandido = this.mesExpandido === mes ? null : mes;
  }

  async verDetalhesLista(lista: ListaCompra) {
    const alert = await this.alertCtrl.create({
      header: lista.nome,
      subHeader: `Finalizada em ${this.formatarDataCompleta(lista.dataFinalizacao)}`,
      message: this.construirDetalhesList(lista),
      buttons: [
        {
          text: 'Ver Itens',
          handler: () => {
            this.mostrarItensLista(lista);
          }
        },
        {
          text: 'Fechar',
          role: 'cancel'
        }
      ]
    });
    await alert.present();
  }

  async mostrarItensLista(lista: ListaCompra) {
    let mensagem = '<div style="max-height: 300px; overflow-y: auto;">';
    
    lista.itens.forEach(item => {
      const subtotal = (item.quantidade || 0) * (item.valorUnitario || 0);
      const status = item.feito ? '✅' : '❌';
      mensagem += `
        <p style="margin: 8px 0; padding: 8px; border-left: 3px solid ${item.feito ? '#2dd36f' : '#ffc409'};">
          <strong>${item.tarefa}</strong><br>
          ${status} Qtd: ${item.quantidade} • R$ ${item.valorUnitario?.toFixed(2)} • Total: R$ ${subtotal.toFixed(2)}<br>
          <small style="color: #666;">${item.categoria}</small>
        </p>
      `;
    });
    
    mensagem += '</div>';

    const alert = await this.alertCtrl.create({
      header: `Itens - ${lista.nome}`,
      message: mensagem,
      buttons: ['Fechar']
    });
    await alert.present();
  }

  async exportarDados() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Exportar Dados',
      buttons: [
        {
          text: 'Exportar JSON',
          icon: 'code-outline',
          handler: () => {
            this.realizarExportacao('json');
          }
        },
        {
          text: 'Exportar CSV',
          icon: 'grid-outline',
          handler: () => {
            this.realizarExportacao('csv');
          }
        },
        {
          text: 'Compartilhar Resumo',
          icon: 'share-outline',
          handler: () => {
            this.compartilharResumo();
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

  realizarExportacao(formato: 'json' | 'csv') {
    const dados = this.historicoService.exportarDados(formato);
    const blob = new Blob([dados], { 
      type: formato === 'json' ? 'application/json' : 'text/csv' 
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `historico-compras-${new Date().toISOString().split('T')[0]}.${formato}`;
    link.click();
    URL.revokeObjectURL(url);

    this.mostrarToast(`Dados exportados em ${formato.toUpperCase()}!`);
  }

  async compartilharResumo() {
    const resumo = this.construirResumoTextual();
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Meu Histórico de Compras',
          text: resumo
        });
      } catch (err) {
        this.copiarParaClipboard(resumo);
      }
    } else {
      this.copiarParaClipboard(resumo);
    }
  }

  async copiarParaClipboard(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      this.mostrarToast('Resumo copiado para a área de transferência!');
    } catch (err) {
      console.error('Erro ao copiar:', err);
    }
  }

  construirResumoTextual(): string {
    return `
🛒 MEU HISTÓRICO DE COMPRAS

💰 Total Gasto: ${this.formatarMoeda(this.estatisticasGerais.totalGastoGeral)}
📋 Listas Finalizadas: ${this.estatisticasGerais.totalListasGeral}
📊 Média Mensal: ${this.formatarMoeda(this.estatisticasGerais.mediaGastoMensal)}

🏆 Categoria Preferida: ${this.estatisticasGerais.categoriaMaisComprada || 'N/A'}

📅 Últimos meses:
${this.mesesDisponiveis.slice(0, 3).map(m => 
  `${m.resumo.mes}/${m.ano}: ${this.formatarMoeda(m.resumo.totalGasto)} (${m.resumo.totalListas} listas)`
).join('\n')}

Gerado pelo app Lista de Compras 📱
    `.trim();
  }

  construirDetalhesList(lista: ListaCompra): string {
    return `
      <strong>Total:</strong> ${this.formatarMoeda(lista.totalGasto)}<br>
      <strong>Itens:</strong> ${lista.totalItens}<br>
      <strong>Concluído:</strong> ${lista.percentualConcluido}%<br>
      <strong>Período:</strong> ${this.formatarDataSimples(lista.dataInicio)} até ${this.formatarDataSimples(lista.dataFinalizacao)}
    `;
  }

  getCategoriaIcon(categoria: string): string {
    const icons: { [key: string]: string } = {
      'Laticínios & Padaria': 'cafe-outline',
      'Carnes & Proteínas': 'fish-outline',
      'Frutas & Verduras': 'leaf-outline',
      'Grãos & Básicos': 'basket-outline',
      'Higiene & Limpeza': 'sparkles-outline',
      'Bebidas': 'wine-outline',
      'Outros': 'ellipsis-horizontal-outline'
    };
    return icons[categoria] || 'pricetag-outline';
  }

  getCategoriaColor(categoria: string): string {
    const colors: { [key: string]: string } = {
      'Laticínios & Padaria': 'linear-gradient(135deg, #ffc409, #ffca22)',
      'Carnes & Proteínas': 'linear-gradient(135deg, #f04141, #ff6b6b)',
      'Frutas & Verduras': 'linear-gradient(135deg, #10dc60, #2dd36f)',
      'Grãos & Básicos': 'linear-gradient(135deg, #7044ff, #9163ff)',
      'Higiene & Limpeza': 'linear-gradient(135deg, #3880ff, #5598ff)',
      'Bebidas': 'linear-gradient(135deg, #ff6b35, #ff8856)',
      'Outros': 'linear-gradient(135deg, #6c757d, #868e96)'
    };
    return colors[categoria] || 'linear-gradient(135deg, #92949c, #a2a4ab)';
  }

  // Métodos de utilidade
  formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }

  // formatarMoedaSimples(valor: number): string {
  //   if (valor >= 1000) {
  //     return `R$ ${(valor / 1000).toFixed(1)}k`;
  //   }
  //   return `R$ ${valor.toFixed(0)}`;
  // }

  formatarDataCompleta(dataISO: string): string {
    return new Date(dataISO).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatarDataSimples(dataISO: string): string {
    return new Date(dataISO).toLocaleDateString('pt-BR');
  }

  formatarDataParaAgrupamento(dataISO: string): string {
    const data = new Date(dataISO);
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(hoje.getDate() - 1);

    if (data.toDateString() === hoje.toDateString()) {
      return 'Hoje';
    } else if (data.toDateString() === ontem.toDateString()) {
      return 'Ontem';
    } else {
      return data.toLocaleDateString('pt-BR');
    }
  }

  // Métodos de tema
  toggleTheme() {
    this.themeService.toggleTheme();
    setTimeout(() => {
      if (this.dadosGrafico.length > 0) {
        this.criarGrafico();
      }
    }, 100);
  }

  isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }

  getThemeIcon(): string {
    return this.isDarkMode() ? 'sunny-outline' : 'moon-outline';
  }

  // Métodos de track para performance
  trackByMes(index: number, item: any): any {
    return `${item.ano}-${item.mes}`;
  }

  trackByLista(index: number, item: ListaCompra): string {
    return item.id;
  }

  // Toast helper
  private async mostrarToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'top'
    });
    toast.present();
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}