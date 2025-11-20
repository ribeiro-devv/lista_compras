import { Component, OnInit } from '@angular/core';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent implements OnInit {
  
  constructor(private authService: AuthService) {}

  ngOnInit() {
    // Garantir que o AuthService seja inicializado
    // Isso força o onAuthStateChanged a ser chamado antes das rotas
    // Não precisa fazer nada, apenas garante a inicialização
    this.authService.currentUser$.subscribe(); // Apenas para garantir inicialização
  }
}
