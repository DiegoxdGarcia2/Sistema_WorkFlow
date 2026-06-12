import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { ChatbotComponent } from './components/chatbot.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, ChatbotComponent],
  templateUrl: './app.html',
})
export class App implements OnInit {
  showThemePanel = false;
  isDark = true;
  primaryColor = '#6366f1';
  secondaryColor = '#0ea5e9';

  presetPrimary = [
    { name: 'Indigo (Default)', hex: '#6366f1' },
    { name: 'Esmeralda', hex: '#10b981' },
    { name: 'Sky', hex: '#0ea5e9' },
    { name: 'Violeta', hex: '#8b5cf6' },
    { name: 'Rosa', hex: '#f43f5e' },
    { name: 'Ámbar', hex: '#f59e0b' },
  ];

  presetSecondary = [
    { name: 'Sky (Default)', hex: '#0ea5e9' },
    { name: 'Teal', hex: '#14b8a6' },
    { name: 'Esmeralda', hex: '#10b981' },
    { name: 'Fucsia', hex: '#d946ef' },
    { name: 'Naranja', hex: '#f97316' },
    { name: 'Pizarra', hex: '#64748b' },
  ];

  constructor(public auth: AuthService) {}

  ngOnInit() {
    const storedDark = localStorage.getItem('bpm-theme-dark');
    if (storedDark !== null) {
      this.isDark = JSON.parse(storedDark);
    }
    const storedPrimary = localStorage.getItem('bpm-theme-primary');
    if (storedPrimary !== null) {
      this.primaryColor = storedPrimary;
    }
    const storedSecondary = localStorage.getItem('bpm-theme-secondary');
    if (storedSecondary !== null) {
      this.secondaryColor = storedSecondary;
    }
    this.applyTheme();
  }

  toggleThemePanel() {
    this.showThemePanel = !this.showThemePanel;
  }

  setMode(dark: boolean) {
    this.isDark = dark;
    this.applyTheme();
  }

  setPrimary(hex: string) {
    this.primaryColor = hex;
    this.applyTheme();
  }

  setSecondary(hex: string) {
    this.secondaryColor = hex;
    this.applyTheme();
  }

  onCustomPrimaryChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target) {
      this.primaryColor = target.value;
      this.applyTheme();
    }
  }

  onCustomSecondaryChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target) {
      this.secondaryColor = target.value;
      this.applyTheme();
    }
  }

  applyTheme() {
    const html = document.documentElement;
    if (this.isDark) {
      html.classList.remove('theme-light');
    } else {
      html.classList.add('theme-light');
    }

    const root = document.documentElement;
    root.style.setProperty('--primary-color', this.primaryColor);
    root.style.setProperty('--secondary-color', this.secondaryColor);

    localStorage.setItem('bpm-theme-dark', JSON.stringify(this.isDark));
    localStorage.setItem('bpm-theme-primary', this.primaryColor);
    localStorage.setItem('bpm-theme-secondary', this.secondaryColor);
  }
}
