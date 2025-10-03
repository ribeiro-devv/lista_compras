import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string; // seletor CSS do elemento
  position: 'top' | 'bottom' | 'left' | 'right';
  action?: 'click' | 'focus' | 'none';
}

@Injectable({
  providedIn: 'root'
})
export class TourService {
  private readonly TOUR_COMPLETED_KEY = 'lista_compras_tour_completed';
  private readonly TOUR_STEP_KEY = 'lista_compras_tour_step';
  
  private tourSteps: TourStep[] = [
    {
      id: 'welcome',
      title: 'Bem-vindo ao Lista de Compras! 🛒',
      description: 'Este é um aplicativo para gerenciar sua lista de compras com controle de valores e quantidades.',
      target: 'ion-title',
      position: 'bottom',
      action: 'none'
    },
    {
        id: 'empty-state',
        title: 'Lista Vazia 📝',
        description: 'Quando não há produtos, você verá esta mensagem. Adicione seu primeiro produto para começar!',
        target: '.empty-state',
        position: 'bottom',
        action: 'none'
    },
    {
      id: 'add-button',
      title: 'Adicionar Produtos ➕',
      description: 'Toque aqui para adicionar novos produtos à sua lista. Você pode definir nome, quantidade e valor unitário. Adicione um produto',
      target: 'ion-fab-button[color="primary"]',
      position: 'left',
      action: 'click'
    },
    {
      id: 'product-list',
      title: 'Lista de Produtos 📋',
      description: 'Aqui você verá todos os produtos adicionados. Clicando em um item pode ver as opções disponíveis.',
      target: 'ion-list',
      position: 'bottom',
      action: 'none'
    },
    {
      id: 'product-actions',
      title: 'Ações do Produto ⚙️',
      description: 'Ao tocar em um produto, você pode marcá-lo como comprado, editar ou excluir.',
      target: 'ion-item-sliding',
      position: 'bottom',
      action: 'none'
    },
    {
      id: 'totals-card',
      title: 'Resumo dos Gastos 💰',
      description: 'Aqui você acompanha o total gasto com os produtos já comprados.',
      target: '.totals-card',
      position: 'bottom',
      action: 'none'
    },
    {
      id: 'delete-all',
      title: 'Excluir Tudo 🗑️',
      description: 'Use este botão para limpar toda a lista de uma vez. Cuidado, esta ação não pode ser desfeita!',
      target: 'ion-fab-button[color="danger"]',
      position: 'right',
      action: 'none'
    },
    {
      id: 'pix-button',
      title: 'Apoie o Projeto 💚',
      description: 'Se gostou do app, considere fazer uma doação via PIX para ajudar a manter o projeto!',
      target: 'ion-fab-button[color="success"]',
      position: 'left',
      action: 'none'
    }
  ];

  currentStepIndex = new BehaviorSubject<number>(0);
  isTourActive = new BehaviorSubject<boolean>(false);
  isTourCompleted = new BehaviorSubject<boolean>(false);

  constructor() {
    this.loadTourState();
  }

  // Getters observáveis
  get currentStep$() {
    return this.currentStepIndex.asObservable();
  }

  get isActive$() {
    return this.isTourActive.asObservable();
  }

  get isCompleted$() {
    return this.isTourCompleted.asObservable();
  }

  // Verificar se o tour já foi completado
  isTourCompletedOnce(): boolean {
    return localStorage.getItem(this.TOUR_COMPLETED_KEY) === 'true';
  }

  // Iniciar o tour
  startTour(): void {
    if (this.isTourCompletedOnce()) {
      return;
    }
    
    this.isTourActive.next(true);
    this.currentStepIndex.next(0);
    this.saveTourState();
  }

  // Avançar para o próximo passo
  nextStep(): void {
    const currentIndex = this.currentStepIndex.value;
    if (currentIndex < this.tourSteps.length - 1) {
      this.currentStepIndex.next(currentIndex + 1);
      this.saveTourState();
    } else {
      this.completeTour();
    }
  }

  // Voltar para o passo anterior
  previousStep(): void {
    const currentIndex = this.currentStepIndex.value;
    if (currentIndex > 0) {
      this.currentStepIndex.next(currentIndex - 1);
      this.saveTourState();
    }
  }

  // Pular o tour
  skipTour(): void {
    this.completeTour();
  }

  // Completar o tour
  completeTour(): void {
    this.isTourActive.next(false);
    this.isTourCompleted.next(true);
    localStorage.setItem(this.TOUR_COMPLETED_KEY, 'true');
    localStorage.removeItem(this.TOUR_STEP_KEY);
  }

  // Obter o passo atual
  getCurrentStep(): TourStep | null {
    const currentIndex = this.currentStepIndex.value;
    return this.tourSteps[currentIndex] || null;
  }

  // Obter todos os passos
  getAllSteps(): TourStep[] {
    return [...this.tourSteps];
  }

  // Verificar se é o primeiro passo
  isFirstStep(): boolean {
    return this.currentStepIndex.value === 0;
  }

  // Verificar se é o último passo
  isLastStep(): boolean {
    return this.currentStepIndex.value === this.tourSteps.length - 1;
  }

  // Obter progresso do tour (0-100)
  getProgress(): number {
    return Math.round((this.currentStepIndex.value / (this.tourSteps.length - 1)) * 100);
  }

  // Reiniciar o tour (para testes ou se o usuário quiser refazer)
  resetTour(): void {
    localStorage.removeItem(this.TOUR_COMPLETED_KEY);
    localStorage.removeItem(this.TOUR_STEP_KEY);
    this.isTourCompleted.next(false);
    this.currentStepIndex.next(0);
  }

  // Salvar estado do tour
  private saveTourState(): void {
    localStorage.setItem(this.TOUR_STEP_KEY, this.currentStepIndex.value.toString());
  }

  // Carregar estado do tour
  private loadTourState(): void {
    const savedStep = localStorage.getItem(this.TOUR_STEP_KEY);
    const completed = localStorage.getItem(this.TOUR_COMPLETED_KEY) === 'true';
    
    if (completed) {
      this.isTourCompleted.next(true);
    } else if (savedStep) {
      const stepIndex = parseInt(savedStep, 10);
      if (stepIndex >= 0 && stepIndex < this.tourSteps.length) {
        this.currentStepIndex.next(stepIndex);
      }
    }
  }

  // Verificar se um elemento está visível na tela
  isElementVisible(selector: string): boolean {
    const element = document.querySelector(selector);
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;

    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= windowHeight &&
      rect.right <= windowWidth
    );
  }

  // Aguardar elemento ficar visível
  waitForElement(selector: string, timeout: number = 5000): Promise<Element | null> {
    return new Promise((resolve) => {
      const element = document.querySelector(selector);
      if (element && this.isElementVisible(selector)) {
        resolve(element);
        return;
      }

      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        const element = document.querySelector(selector);
        if (element && this.isElementVisible(selector)) {
          clearInterval(checkInterval);
          resolve(element);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          resolve(null);
        }
      }, 100);
    });
  }
}
