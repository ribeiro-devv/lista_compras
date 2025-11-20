import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';

/**
 * Guard que impede acesso a páginas de autenticação (login/cadastro) 
 * se o usuário já estiver autenticado
 */
@Injectable({
  providedIn: 'root'
})
export class NoAuthGuard implements CanActivate {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> | Promise<boolean> | boolean {
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        if (user) {
          // Se já está autenticado, redireciona para home
          this.router.navigate(['/home']);
          return false;
        } else {
          // Permite acesso se não estiver autenticado
          return true;
        }
      })
    );
  }
}

