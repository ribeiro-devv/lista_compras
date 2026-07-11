import { Component, OnInit } from '@angular/core';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {

  // Injetar o ThemeService no boot garante que o tema seja aplicado cedo.
  constructor(private authService: AuthService, private themeService: ThemeService) {}

  ngOnInit() {
    // Garante a inicialização do AuthService (verifica a sessão persistida).
    this.authService.currentUser$.subscribe();
  }
}
