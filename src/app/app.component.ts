import { Component, OnInit } from '@angular/core';
import { App } from '@capacitor/app';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';
import { ColorService } from './services/color.service';
import { CategoriaService } from './services/categoria.service';
import { BiometriaService } from './services/biometria.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {

  bloqueado = false;

  // Injetar Theme/Color no boot garante que tema e cor sejam aplicados cedo.
  constructor(
    private authService: AuthService,
    private themeService: ThemeService,
    private colorService: ColorService,
    private categoriaService: CategoriaService,
    private biometriaService: BiometriaService
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

    this.iniciarBloqueio();
  }

  private async iniciarBloqueio() {
    if (!this.biometriaService.estaAtiva()) return;

    this.bloqueado = true;
    await this.desbloquear();

    // Retranca ao voltar do background, não ao sair: assim a tela já está
    // coberta quando o app aparece no seletor de apps recentes.
    App.addListener('appStateChange', ({ isActive }) => {
      if (!this.biometriaService.estaAtiva()) return;

      if (!isActive) {
        this.bloqueado = true;
      } else if (this.bloqueado) {
        this.desbloquear();
      }
    });
  }

  async desbloquear() {
    const liberado = await this.biometriaService.autenticar();
    if (liberado) this.bloqueado = false;
  }
}
