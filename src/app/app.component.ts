import { Component, OnInit } from '@angular/core';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';
import { ColorService } from './services/color.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {

  // Injetar Theme/Color no boot garante que tema e cor sejam aplicados cedo.
  constructor(
    private authService: AuthService,
    private themeService: ThemeService,
    private colorService: ColorService
  ) {
    this.colorService.init();
  }

  ngOnInit() {
    // Garante a inicialização do AuthService (verifica a sessão persistida).
    this.authService.currentUser$.subscribe();
  }
}
