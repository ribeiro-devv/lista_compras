# Sistema de Tour - Lista de Compras

## Visão Geral

Este projeto implementa um sistema completo de tour guiado para primeiro acesso ao aplicativo de Lista de Compras. O tour ajuda novos usuários a entenderem todas as funcionalidades disponíveis de forma interativa e visual.

## Funcionalidades Implementadas

### 🎯 TourService (`src/app/services/tour.service.ts`)
- **Gerenciamento de Estado**: Controla o progresso do tour e persistência no localStorage
- **Passos Definidos**: 8 passos cobrindo todas as funcionalidades principais
- **Navegação**: Próximo, anterior, pular e finalizar
- **Persistência**: Lembra se o tour já foi completado
- **Reset**: Permite reiniciar o tour para testes ou usuários que queiram refazer

### 🎨 TourOverlayComponent (`src/app/components/tour-overlay/`)
- **Overlay Escuro**: Destaque visual dos elementos com animação pulsante
- **Tooltip Interativo**: Informações contextuais com progresso visual
- **Posicionamento Inteligente**: Adapta-se automaticamente à posição dos elementos
- **Responsivo**: Funciona em diferentes tamanhos de tela
- **Modo Escuro**: Suporte automático ao tema escuro

### 🔧 Integração na HomePage
- **Detecção Automática**: Inicia automaticamente no primeiro acesso
- **Botão de Reinício**: Permite refazer o tour a qualquer momento
- **Sincronização**: Aguarda elementos estarem visíveis antes de destacar

## Passos do Tour

1. **Bem-vindo** - Apresentação do aplicativo
2. **Botão Adicionar** - Como adicionar novos produtos
3. **Estado Vazio** - Explicação da tela inicial
4. **Lista de Produtos** - Como interagir com os itens
5. **Ações do Produto** - Opções disponíveis para cada item
6. **Resumo dos Gastos** - Acompanhamento financeiro
7. **Excluir Tudo** - Limpeza da lista
8. **Apoio ao Projeto** - Informações sobre doação

## Como Usar

### Para Usuários
- O tour inicia automaticamente no primeiro acesso
- Use os botões "Próximo" e "Anterior" para navegar
- Clique em "Pular Tour" para sair a qualquer momento
- Use o botão de ajuda (ícone de interrogação) para reiniciar o tour

### Para Desenvolvedores

#### Iniciar o Tour Programaticamente
```typescript
// No seu componente
constructor(private tourService: TourService) {}

startTour() {
  this.tourService.startTour();
}
```

#### Verificar se o Tour foi Completado
```typescript
if (this.tourService.isTourCompletedOnce()) {
  // Tour já foi feito
}
```

#### Reiniciar o Tour
```typescript
this.tourService.resetTour();
this.tourService.startTour();
```

#### Personalizar Passos do Tour
Edite o array `tourSteps` no `TourService`:

```typescript
private tourSteps: TourStep[] = [
  {
    id: 'meu-passo',
    title: 'Título do Passo',
    description: 'Descrição detalhada',
    target: '.meu-elemento', // Seletor CSS
    position: 'top', // top, bottom, left, right
    action: 'click' // click, focus, none
  }
];
```

## Estrutura de Arquivos

```
src/app/
├── services/
│   └── tour.service.ts              # Lógica principal do tour
├── components/
│   └── tour-overlay/
│       ├── tour-overlay.component.ts    # Componente do overlay
│       ├── tour-overlay.component.html  # Template do tooltip
│       ├── tour-overlay.component.scss  # Estilos e animações
│       └── tour-overlay.component.spec.ts
└── pages/
    └── home/
        ├── home.page.ts             # Integração do tour
        ├── home.page.html           # Template com componente
        └── home.module.ts           # Declaração do componente
```

## Características Técnicas

### Responsividade
- Adapta-se automaticamente a diferentes tamanhos de tela
- Tooltip reposiciona-se para não sair da viewport
- Funciona tanto em desktop quanto mobile

### Acessibilidade
- Suporte a modo escuro automático
- Contraste adequado para leitura
- Navegação por teclado (através dos botões)

### Performance
- Lazy loading dos elementos
- Animações CSS otimizadas
- Verificação de visibilidade antes de destacar

### Persistência
- Estado salvo no localStorage
- Não reinicia automaticamente após completado
- Permite reset manual para testes

## Personalização

### Cores e Temas
As cores seguem o sistema de cores do Ionic:
- `--ion-color-primary` para highlights
- `--ion-color-light` para tooltip
- `--ion-color-dark` para texto

### Animações
- `highlightPulse`: Animação pulsante no highlight
- `tooltipSlideIn`: Entrada suave do tooltip
- Transições CSS para mudanças de estado

### Posicionamento
O sistema calcula automaticamente a melhor posição para o tooltip baseado em:
- Posição do elemento alvo
- Tamanho da viewport
- Espaço disponível
- Preferência definida no passo

## Troubleshooting

### Elemento não encontrado
Se um elemento não for encontrado, verifique:
1. Se o seletor CSS está correto
2. Se o elemento existe no DOM
3. Se o elemento está visível

### Posicionamento incorreto
Para ajustar posicionamento:
1. Modifique a propriedade `position` no passo
2. Ajuste os valores de offset no CSS
3. Verifique se há conflitos de z-index

### Tour não inicia
Verifique:
1. Se o `TourService` está sendo injetado
2. Se o componente está declarado no módulo
3. Se não há erros no console

## Futuras Melhorias

- [ ] Suporte a múltiplos idiomas
- [ ] Tour contextual baseado em ações do usuário
- [ ] Métricas de engajamento do tour
- [ ] Tour específico para diferentes tipos de usuário
- [ ] Integração com analytics para otimização
