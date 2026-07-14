import { Injectable } from '@angular/core';

/**
 * Personalização da cor principal do app. Define a cor primary (e derivados)
 * como variáveis CSS no <body>, sobrepondo o tema padrão. Persiste no
 * localStorage e reaplica no boot.
 */
@Injectable({
  providedIn: 'root'
})
export class ColorService {
  private readonly KEY = 'appPrimaryColor';
  private readonly DEFAULT = '#6366f1';

  // Paleta de presets oferecida na tela de configurações.
  readonly presets = [
    { nome: 'Índigo', hex: '#6366f1' },
    { nome: 'Violeta', hex: '#8b5cf6' },
    { nome: 'Azul', hex: '#3b82f6' },
    { nome: 'Esmeralda', hex: '#10b981' },
    { nome: 'Turquesa', hex: '#14b8a6' },
    { nome: 'Rosa', hex: '#ec4899' },
    { nome: 'Laranja', hex: '#f59e0b' },
    { nome: 'Vermelho', hex: '#ef4444' }
  ];

  private current = this.DEFAULT;

  init() {
    const saved = localStorage.getItem(this.KEY);
    this.aplicar(saved || this.DEFAULT, false);
  }

  getCor(): string {
    return this.current;
  }

  ehAtual(hex: string): boolean {
    return hex.toLowerCase() === this.current.toLowerCase();
  }

  setCor(hex: string) {
    this.aplicar(hex, true);
  }

  private aplicar(hex: string, salvar: boolean) {
    if (!/^#([0-9a-f]{6})$/i.test(hex)) return;
    this.current = hex;

    const rgb = this.hexToRgb(hex);
    const shade = this.mix(hex, '#000000', 0.14);
    const tint = this.mix(hex, '#ffffff', 0.16);
    const softEnd = this.mix(hex, '#ffffff', 0.22);
    const contrast = this.luminancia(rgb) > 0.55 ? '#1e1b2e' : '#ffffff';
    const rgbStr = `${rgb.r}, ${rgb.g}, ${rgb.b}`;

    const s = document.body.style;
    s.setProperty('--ion-color-primary', hex);
    s.setProperty('--ion-color-primary-rgb', rgbStr);
    s.setProperty('--ion-color-primary-shade', shade);
    s.setProperty('--ion-color-primary-tint', tint);
    s.setProperty('--ion-color-primary-contrast', contrast);
    s.setProperty('--ion-color-primary-contrast-rgb', contrast === '#ffffff' ? '255, 255, 255' : '30, 27, 46');

    // Tokens próprios do app derivados da cor.
    s.setProperty('--app-gradient', `linear-gradient(135deg, ${hex} 0%, ${softEnd} 100%)`);
    s.setProperty('--app-gradient-soft', `linear-gradient(135deg, rgba(${rgbStr}, 0.12) 0%, rgba(${rgbStr}, 0.12) 100%)`);
    s.setProperty('--app-shadow', `0 8px 24px rgba(${rgbStr}, 0.16)`);
    s.setProperty('--app-shadow-lg', `0 16px 40px rgba(${rgbStr}, 0.22)`);

    if (salvar) localStorage.setItem(this.KEY, hex);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const n = parseInt(hex.slice(1), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  /** Mistura duas cores (peso do segundo). */
  private mix(a: string, b: string, w: number): string {
    const ca = this.hexToRgb(a);
    const cb = this.hexToRgb(b);
    const r = Math.round(ca.r + (cb.r - ca.r) * w);
    const g = Math.round(ca.g + (cb.g - ca.g) * w);
    const bl = Math.round(ca.b + (cb.b - ca.b) * w);
    return '#' + [r, g, bl].map(v => v.toString(16).padStart(2, '0')).join('');
  }

  private luminancia({ r, g, b }: { r: number; g: number; b: number }): number {
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }
}
