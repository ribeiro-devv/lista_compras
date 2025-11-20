import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  loginForm: FormGroup;
  showPassword = false;
  isLoading = false;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit() {
    // Verificar se há returnUrl nos query params
    const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/home';
    if (returnUrl) {
      // Guardar para usar após login
      sessionStorage.setItem('returnUrl', returnUrl);
    }
  }

  async login() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Entrando...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      const { email, password } = this.loginForm.value;
      await this.authService.login(email, password);
      
      // Redirecionar para returnUrl ou home
      const returnUrl = sessionStorage.getItem('returnUrl') || '/home';
      sessionStorage.removeItem('returnUrl');
      
      await loading.dismiss();
      this.router.navigateByUrl(returnUrl, { replaceUrl: true });
    } catch (error: any) {
      await loading.dismiss();
      this.isLoading = false;
      await this.showToast(error.message, 'danger');
    }
  }

  async loginWithGoogle() {
    this.isLoading = true;
    const loading = await this.loadingController.create({
      message: 'Entrando com Google...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await this.authService.loginWithGoogle();
      
      const returnUrl = sessionStorage.getItem('returnUrl') || '/home';
      sessionStorage.removeItem('returnUrl');
      
      await loading.dismiss();
      this.router.navigateByUrl(returnUrl, { replaceUrl: true });
    } catch (error: any) {
      await loading.dismiss();
      this.isLoading = false;
      await this.showToast(error.message, 'danger');
    }
  }

  async resetPassword() {
    const email = this.loginForm.get('email')?.value;
    
    if (!email) {
      await this.showToast('Digite seu email primeiro', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Enviando email...',
      spinner: 'crescent'
    });
    await loading.present();

    try {
      await this.authService.resetPassword(email);
      await loading.dismiss();
      await this.showToast('Email de redefinição enviado! Verifique sua caixa de entrada.', 'success');
    } catch (error: any) {
      await loading.dismiss();
      await this.showToast(error.message, 'danger');
    }
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  private async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'top',
      color
    });
    await toast.present();
  }

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }
}

