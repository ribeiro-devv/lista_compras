import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private isDark = false;

  constructor() {
    this.loadTheme();
  }

  toggleTheme() {
    this.isDark = !this.isDark;
    this.applyTheme();
    this.saveTheme();
  }

  isDarkMode(): boolean {
    return this.isDark;
  }

  private loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      this.isDark = savedTheme === 'dark';
    } else {
      // Verificar preferência do sistema
      this.isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    this.applyTheme();
  }

  private applyTheme() {
    document.body.classList.toggle('dark', this.isDark);
  }

  private saveTheme() {
    localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
  }
}
