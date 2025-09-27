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

  private subscriptions: Subscription[] = [];

  constructor(
    public tourService: TourService
  ) {}

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
    const tooltipRect = tooltipElement.getBoundingClientRect();
    
    // Calcular posição baseada na posição especificada
    let top = 0;
    let left = 0;

    switch (this.currentStep.position) {
      case 'top':
        top = targetRect.top - tooltipRect.height - 20;
        left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'bottom':
        top = targetRect.bottom + 30;
        left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);
        break;
      case 'left':
        top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
        left = targetRect.left - tooltipRect.width - 20;
        break;
      case 'right':
        top = targetRect.top + (targetRect.height / 2) - (tooltipRect.height / 2);
        left = targetRect.right + 20;
        break;
    }

    // Ajustar para não sair da tela
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    if (left < 10) left = 10;
    if (left + tooltipRect.width > windowWidth - 10) {
      left = windowWidth - tooltipRect.width - 10;
    }
    if (top < 10) top = 10;
    if (top + tooltipRect.height > windowHeight - 10) {
      top = windowHeight - tooltipRect.height - 10;
    }

    tooltipElement.style.position = 'fixed';
    tooltipElement.style.top = `${top}px`;
    tooltipElement.style.left = `${left}px`;
    tooltipElement.style.zIndex = '10000';
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