import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { TourService, TourStep } from '../../services/tour.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tour-overlay',
  templateUrl: './tour-overlay.component.html',
  styleUrls: ['./tour-overlay.component.scss']
})
export class TourOverlayComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('tooltip', { static: false }) tooltipRef!: ElementRef;

  currentStep: TourStep | null = null;
  isActive = false;
  isCompleted = false;
  progress = 0;
  isMobile = false;

  private subscriptions: Subscription[] = [];

  constructor(
    public tourService: TourService
  ) {
    this.isMobile = window.innerWidth <= 768;
  }

  ngOnInit() {
    // Subscrever às mudanças do tour
    this.subscriptions.push(
      this.tourService.currentStep$.subscribe(() => {
        this.updateCurrentStep();
      })
    );

    this.subscriptions.push(
      this.tourService.isActive$.subscribe(active => {
        this.isActive = active;
        if (active) {
          setTimeout(() => this.positionTooltip(), 100);
        }
      })
    );

    this.subscriptions.push(
      this.tourService.isCompleted$.subscribe(completed => {
        this.isCompleted = completed;
      })
    );

    // Listener para redimensionamento da tela
    window.addEventListener('resize', () => {
      this.isMobile = window.innerWidth <= 768;
      if (this.isActive) {
        setTimeout(() => this.positionTooltip(), 100);
      }
    });
  }

  ngAfterViewInit() {
    // Aguardar a view estar pronta antes de posicionar
    if (this.isActive) {
      setTimeout(() => this.positionTooltip(), 200);
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private updateCurrentStep() {
    this.currentStep = this.tourService.getCurrentStep();
    this.progress = this.tourService.getProgress();
    
    if (this.isActive && this.currentStep) {
      setTimeout(() => this.positionTooltip(), 100);
    }
  }

  private positionTooltip() {
    if (!this.currentStep || !this.tooltipRef) return;

    const targetElement = document.querySelector(this.currentStep.target);
    if (!targetElement) return;

    const targetRect = targetElement.getBoundingClientRect();
    const tooltipElement = this.tooltipRef.nativeElement;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    // Aguardar o tooltip ser renderizado para obter suas dimensões
    setTimeout(() => {
      const tooltipRect = tooltipElement.getBoundingClientRect();
      
      let top = 0;
      let left = 0;
      let position = this.currentStep!.position;

      // Para mobile, sempre posicionar no centro da tela
      if (this.isMobile) {
        top = Math.max(20, (windowHeight - tooltipRect.height) / 2);
        left = Math.max(16, (windowWidth - tooltipRect.width) / 2);
        
        // Ajustar se não couber
        if (top + tooltipRect.height > windowHeight - 20) {
          top = windowHeight - tooltipRect.height - 20;
        }
        if (left + tooltipRect.width > windowWidth - 32) {
          left = 16;
        }
      } else {
        // Lógica para desktop
        switch (position) {
          case 'top':
            top = targetRect.top - tooltipRect.height - 20;
            left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
            
            // Se não couber em cima, colocar embaixo
            if (top < 20) {
              top = targetRect.bottom + 20;
              position = 'bottom';
            }
            break;
            
          case 'bottom':
            top = targetRect.bottom + 20;
            left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
            
            // Se não couber embaixo, colocar em cima
            if (top + tooltipRect.height > windowHeight - 20) {
              top = targetRect.top - tooltipRect.height - 20;
              position = 'top';
            }
            break;
            
          case 'left':
            top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
            left = targetRect.left - tooltipRect.width - 20;
            
            // Se não couber à esquerda, colocar à direita
            if (left < 20) {
              left = targetRect.right + 20;
              position = 'right';
            }
            break;
            
          case 'right':
            top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
            left = targetRect.right + 20;
            
            // Se não couber à direita, colocar à esquerda
            if (left + tooltipRect.width > windowWidth - 20) {
              left = targetRect.left - tooltipRect.width - 20;
              position = 'left';
            }
            break;
        }

        if (left < 20) left = 20;
        if (left + tooltipRect.width > windowWidth - 20) {
          left = windowWidth - tooltipRect.width - 20;
        }
        if (top < 20) top = 20;
        if (top + tooltipRect.height > windowHeight - 20) {
          top = windowHeight - tooltipRect.height - 20;
        }
      }

      // Aplicar posicionamento
      tooltipElement.style.position = 'fixed';
      tooltipElement.style.top = `${top}px`;
      tooltipElement.style.left = `${left}px`;
      tooltipElement.style.zIndex = '10001';
      
      // Atualizar classe da posição da seta se mudou
      tooltipElement.className = tooltipElement.className.replace(/tooltip-\w+/g, '');
      tooltipElement.classList.add(`tooltip-${position}`);
      
    }, 10);
  }

  nextStep() {
    this.tourService.nextStep();
  }

  previousStep() {
    this.tourService.previousStep();
  }

  skipTour() {
    this.tourService.skipTour();
  }

  isFirstStep(): boolean {
    return this.tourService.isFirstStep();
  }

  isLastStep(): boolean {
    return this.tourService.isLastStep();
  }

  executeStepAction() {
    if (!this.currentStep || !this.currentStep.action) return;

    const targetElement = document.querySelector(this.currentStep.target);
    if (!targetElement) return;

    switch (this.currentStep.action) {
      case 'click':
        (targetElement as HTMLElement).click();
        break;
      case 'focus':
        if ('focus' in targetElement) {
          (targetElement as HTMLElement).focus();
        }
        break;
    }
  }

  // Método para obter estilo do highlight
  getHighlightStyle(): string {
    if (!this.currentStep) return '';

    const targetElement = document.querySelector(this.currentStep.target);
    if (!targetElement) return '';

    const rect = targetElement.getBoundingClientRect();
    
    return `
      top: ${rect.top - 8}px;
      left: ${rect.left - 8}px;
      width: ${rect.width + 16}px;
      height: ${rect.height + 16}px;
    `;
  }
}