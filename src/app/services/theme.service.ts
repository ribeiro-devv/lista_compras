import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private isDark = false;
  private explicit = false; // true quando o usuário escolheu manualmente

  constructor() {
    this.loadTheme();
  }

  toggleTheme() {
    this.setDark(!this.isDark);
  }

  setDark(isDark: boolean) {
    this.isDark = isDark;
    this.explicit = true;
    this.applyTheme();
    this.saveTheme();
  }

  isDarkMode(): boolean {
    return this.isDark;
  }

  private loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      this.isDark = savedTheme === 'dark';
      this.explicit = true;
    } else {
      this.isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.explicit = false;
    }
    this.applyTheme();
  }

  private applyTheme() {
    // Só marca classes quando há escolha explícita; caso contrário deixa o
    // @media (prefers-color-scheme) do variables.scss cuidar do padrão.
    if (this.explicit) {
      document.body.classList.toggle('dark', this.isDark);
      document.body.classList.toggle('light', !this.isDark);
    } else {
      document.body.classList.remove('dark', 'light');
    }
  }

  private saveTheme() {
    localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
  }
}
