import { Injectable } from '@angular/core';

export type ThemeMode = 'dark' | 'light' | 'system';
export type Density = 'comfortable' | 'compact';

/**
 * Centraliza aparência: modo de tema (claro/escuro/sistema), densidade e
 * escala de fonte. A cor de destaque fica no ColorService.
 */
@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private mode: ThemeMode = 'system';
  private density: Density = 'comfortable';
  private fontScale = 1;

  constructor() {
    this.load();
  }

  // ---- modo ----
  getMode(): ThemeMode {
    return this.mode;
  }

  setMode(mode: ThemeMode) {
    this.mode = mode;
    localStorage.setItem('themeMode', mode);
    this.applyMode();
  }

  /** Compat: alterna claro/escuro (usado no botão do histórico). */
  toggleTheme() {
    this.setMode(this.isDarkMode() ? 'light' : 'dark');
  }

  isDarkMode(): boolean {
    if (this.mode === 'dark') return true;
    if (this.mode === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  // ---- densidade ----
  getDensity(): Density {
    return this.density;
  }

  setDensity(density: Density) {
    this.density = density;
    localStorage.setItem('appDensity', density);
    document.body.classList.toggle('compact', density === 'compact');
  }

  // ---- escala de fonte ----
  getFontScale(): number {
    return this.fontScale;
  }

  setFontScale(scale: number) {
    this.fontScale = scale;
    localStorage.setItem('appFontScale', String(scale));
    document.documentElement.style.fontSize = `${16 * scale}px`;
  }

  // ---- init ----
  private load() {
    const savedMode = localStorage.getItem('themeMode') as ThemeMode | null;
    // Migra a chave antiga 'theme' (dark/light) se existir.
    const legacy = localStorage.getItem('theme');
    this.mode = savedMode || (legacy === 'dark' ? 'dark' : legacy === 'light' ? 'light' : 'system');

    this.density = (localStorage.getItem('appDensity') as Density) || 'comfortable';
    this.fontScale = parseFloat(localStorage.getItem('appFontScale') || '1') || 1;

    this.applyMode();
    document.body.classList.toggle('compact', this.density === 'compact');
    document.documentElement.style.fontSize = `${16 * this.fontScale}px`;
  }

  private applyMode() {
    const b = document.body.classList;
    b.toggle('dark', this.mode === 'dark');
    b.toggle('light', this.mode === 'light');
    // 'system' => sem classe, @media governa.
    if (this.mode === 'system') {
      b.remove('dark');
      b.remove('light');
    }
  }
}
