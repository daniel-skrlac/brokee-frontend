// theme.service.ts
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storageKey = 'user-theme';

  initTheme(): 'light' | 'dark' {
    const saved = localStorage.getItem(this.storageKey) as 'light' | 'dark' | null;
    const theme = saved ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    this.applyTheme(theme);
    return theme;
  }

  setTheme(theme: 'light' | 'dark'): void {
    localStorage.setItem(this.storageKey, theme);
    this.applyTheme(theme);
  }

  previewTheme(theme: 'light' | 'dark'): void {
    this.applyTheme(theme);
  }

  private applyTheme(theme: 'light' | 'dark'): void {
    document.documentElement.setAttribute('data-theme', theme);
  }
}
