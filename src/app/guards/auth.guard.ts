import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, timer, race } from 'rxjs';
import { map, first, timeout, catchError, skip, tap } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    // Aguardar o Firebase verificar a sessão persistida
    // O Firebase Auth mantém a sessão automaticamente via persistência LOCAL (padrão)
    // O onAuthStateChanged é chamado assim que o Auth inicializa
    
    // Estratégia: Aguardar até que o Firebase tenha verificado a sessão
    // O Firebase verifica a sessão persistida quando o Auth inicializa
    // Aguardamos um tempo suficiente OU pegamos o valor após o onAuthStateChanged
    return race(
      // Opção 1: Aguarda um delay (1 segundo) para dar tempo ao Firebase verificar
      timer(1000).pipe(
        map(() => {
          // Verifica novamente após o delay
          return this.authService.getCurrentUser();
        })
      ),
      // Opção 2: Pega o valor após o onAuthStateChanged (segundo valor do Observable)
      this.authService.currentUser$.pipe(
        skip(1), // Pula o valor inicial null do BehaviorSubject
        first() // Pega o primeiro valor após o skip (vem do onAuthStateChanged)
      )
    ).pipe(
      // Timeout de segurança (3 segundos)
      timeout(3000),
      catchError(() => {
        // Se timeout, verifica se há usuário como fallback
        const user = this.authService.getCurrentUser();
        return of(user);
      }),
      map(user => {
        if (user) {
          // Usuário está autenticado - permite acesso
          return true;
        } else {
          // Usuário não está autenticado - redireciona para login
          this.router.navigate(['/login'], {
            queryParams: { returnUrl: state.url }
          });
          return false;
        }
      })
    );
  }
}

