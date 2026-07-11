import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Impede acesso às páginas de autenticação (login/cadastro)
 * quando o usuário já está autenticado.
 */
@Injectable({
  providedIn: 'root'
})
export class NoAuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async canActivate(): Promise<boolean> {
    await this.authService.authReady;

    if (this.authService.getCurrentUser()) {
      this.router.navigate(['/home']);
      return false;
    }
    return true;
  }
}
