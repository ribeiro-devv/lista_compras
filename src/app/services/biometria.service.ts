import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth';

/**
 * Bloqueio de tela por biometria.
 *
 * LIMITE DE SEGURANÇA, que precisa estar claro na interface: isto tranca a
 * TELA do app, não os dados. A sessão do Supabase continua válida no
 * aparelho, e quem tiver acesso root ao dispositivo alcança os dados sem
 * passar por aqui. Por isso o texto em Ajustes diz "bloqueia a tela do app"
 * e nunca "protege seus dados".
 */
@Injectable({
  providedIn: 'root'
})
export class BiometriaService {

  private readonly ATIVA_KEY = 'biometriaAtiva';

  disponivelNaPlataforma(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('BiometricAuth');
  }

  /** O aparelho tem biometria (ou PIN/senha) utilizável? */
  async suportada(): Promise<boolean> {
    if (!this.disponivelNaPlataforma()) return false;

    const info = await BiometricAuth.checkBiometry();
    // `strongReason` cobre o caso de ter hardware mas nada cadastrado.
    return info.isAvailable || info.strongBiometryIsAvailable;
  }

  /** Nome amigável do que o aparelho oferece, para o texto de Ajustes. */
  async descricao(): Promise<string> {
    if (!this.disponivelNaPlataforma()) return 'Indisponível neste dispositivo';

    const info = await BiometricAuth.checkBiometry();

    if (!info.isAvailable && !info.strongBiometryIsAvailable) {
      return info.reason || 'Nenhuma biometria cadastrada no aparelho';
    }

    switch (info.biometryType) {
      case BiometryType.touchId:
      case BiometryType.fingerprintAuthentication:
        return 'Impressão digital';
      case BiometryType.faceId:
      case BiometryType.faceAuthentication:
        return 'Reconhecimento facial';
      case BiometryType.irisAuthentication:
        return 'Leitura de íris';
      default:
        return 'Biometria do aparelho';
    }
  }

  estaAtiva(): boolean {
    return localStorage.getItem(this.ATIVA_KEY) === 'sim';
  }

  definirAtiva(ativa: boolean): void {
    if (ativa) {
      localStorage.setItem(this.ATIVA_KEY, 'sim');
    } else {
      localStorage.removeItem(this.ATIVA_KEY);
    }
  }

  /**
   * Pede a autenticação. `allowDeviceCredential` deixa cair para PIN/senha
   * do aparelho — sem isso, quem apagasse a digital ficaria trancado fora
   * do próprio app, sem saída.
   */
  async autenticar(): Promise<boolean> {
    if (!this.disponivelNaPlataforma()) return true;

    try {
      await BiometricAuth.authenticate({
        reason: 'Desbloqueie para abrir a Lista de Compras',
        cancelTitle: 'Cancelar',
        allowDeviceCredential: true,
        androidTitle: 'Lista de Compras',
        androidSubtitle: 'Confirme que é você',
        androidConfirmationRequired: false
      });
      return true;
    } catch {
      return false;
    }
  }
}
