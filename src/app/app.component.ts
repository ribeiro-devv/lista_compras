import { Component, OnInit } from '@angular/core';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';
import { ColorService } from './services/color.service';
import { CategoriaService } from './services/categoria.service';

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
    private colorService: ColorService,
    private categoriaService: CategoriaService
  ) {
    this.colorService.init();
  }

  ngOnInit() {
    // Garante a inicialização do AuthService (verifica a sessão persistida).
    this.authService.currentUser$.subscribe(user => {
      // As categorias são por usuário: recarrega a cada login e semeia as
      // padrão se for o primeiro acesso.
      if (user) this.categoriaService.carregar();
    });
  }
}
