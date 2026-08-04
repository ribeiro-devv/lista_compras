import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

/**
 * Ditado de itens. Só funciona no app nativo: no navegador o plugin não
 * existe, e a Web Speech API não vale a pena manter em paralelo.
 *
 * O texto reconhecido NUNCA é gravado direto — quem chama devolve para o
 * usuário confirmar. Reconhecimento erra, e item errado numa lista
 * compartilhada incomoda todo mundo.
 */
@Injectable({
  providedIn: 'root'
})
export class VozService {

  disponivel(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('SpeechRecognition');
  }

  /**
   * Pede a permissão de microfone se ainda não foi concedida.
   * Devolve true se dá para ouvir.
   */
  async garantirPermissao(): Promise<boolean> {
    if (!this.disponivel()) return false;

    const { speechRecognition } = await SpeechRecognition.checkPermissions();
    if (speechRecognition === 'granted') return true;

    const pedido = await SpeechRecognition.requestPermissions();
    return pedido.speechRecognition === 'granted';
  }

  /**
   * Ouve uma frase e devolve o texto reconhecido, ou null se não entendeu.
   * `partialResults: false` porque só interessa o resultado final.
   */
  async ouvir(): Promise<string | null> {
    if (!(await this.garantirPermissao())) {
      throw new Error('Permissão de microfone negada');
    }

    const resultado = await SpeechRecognition.start({
      language: 'pt-BR',
      maxResults: 1,
      partialResults: false,
      popup: false
    });

    const frases = (resultado as { matches?: string[] })?.matches ?? [];
    const frase = (frases[0] || '').trim();
    return frase || null;
  }

  async parar(): Promise<void> {
    if (!this.disponivel()) return;
    await SpeechRecognition.stop();
  }
}
