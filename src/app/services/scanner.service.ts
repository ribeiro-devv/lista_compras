import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { BarcodeFormat, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

/**
 * Leitura de código de barras de produto (EAN).
 *
 * O app NÃO consulta base externa de EAN: ele aprende. Na primeira vez que
 * um código é lido, o usuário informa o nome; da segunda em diante o app já
 * sabe. A associação vive no localStorage, igual ao catálogo.
 *
 * Fora de escopo, decidido na spec: QR de nota fiscal (NFC-e). Importar o
 * cupom exigiria raspar o site da SEFAZ, que muda por estado.
 */
@Injectable({
  providedIn: 'root'
})
export class ScannerService {

  private readonly EANS_KEY = 'eanConhecidos';

  disponivel(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('BarcodeScanner');
  }

  /**
   * Em alguns aparelhos o módulo do Google de leitura é baixado sob demanda.
   * Sem isso a primeira leitura falha sem explicação.
   */
  private async garantirModulo(): Promise<void> {
    const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
    if (available) return;

    await BarcodeScanner.installGoogleBarcodeScannerModule();
  }

  async garantirPermissao(): Promise<boolean> {
    if (!this.disponivel()) return false;

    const { camera } = await BarcodeScanner.checkPermissions();
    if (camera === 'granted' || camera === 'limited') return true;

    const pedido = await BarcodeScanner.requestPermissions();
    return pedido.camera === 'granted' || pedido.camera === 'limited';
  }

  /** Abre a câmera e devolve o código lido, ou null se o usuário cancelar. */
  async ler(): Promise<string | null> {
    if (!(await this.garantirPermissao())) {
      throw new Error('Permissão de câmera negada');
    }

    await this.garantirModulo();

    const { barcodes } = await BarcodeScanner.scan({
      formats: [BarcodeFormat.Ean13, BarcodeFormat.Ean8, BarcodeFormat.UpcA, BarcodeFormat.UpcE]
    });

    const codigo = barcodes[0]?.rawValue?.trim();
    return codigo || null;
  }

  // ---- base local de códigos aprendidos ----

  nomeConhecido(codigo: string): string | null {
    return this.lerBase()[codigo] ?? null;
  }

  aprender(codigo: string, nome: string): void {
    const nomeLimpo = (nome || '').trim();
    if (!codigo || !nomeLimpo) return;

    const base = this.lerBase();
    base[codigo] = nomeLimpo;
    localStorage.setItem(this.EANS_KEY, JSON.stringify(base));
  }

  esquecer(codigo: string): void {
    const base = this.lerBase();
    delete base[codigo];
    localStorage.setItem(this.EANS_KEY, JSON.stringify(base));
  }

  private lerBase(): { [codigo: string]: string } {
    try {
      const bruto = localStorage.getItem(this.EANS_KEY);
      const dados = bruto ? JSON.parse(bruto) : {};
      return dados && typeof dados === 'object' ? dados : {};
    } catch {
      return {};
    }
  }
}
