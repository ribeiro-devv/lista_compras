import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';

/**
 * Ponto único de acesso ao Supabase.
 *
 * - Cria um único SupabaseClient para todo o app.
 * - Expõe `isConfigured` para que a UI possa mostrar um aviso amigável
 *   caso as chaves ainda não tenham sido coladas no environment
 *   (evita "tela branca" e erros silenciosos).
 */
@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private readonly _client: SupabaseClient | null;
  public readonly isConfigured: boolean;

  constructor() {
    const url = environment.supabaseUrl?.trim();
    const anonKey = environment.supabaseKey?.trim();

    this.isConfigured = this.validarCredenciais(url, anonKey);

    if (this.isConfigured) {
      this._client = createClient(url as string, anonKey as string, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    } else {
      this._client = null;
      console.warn(
        '⚠️ Supabase não configurado. Cole sua URL e anon key em ' +
        'src/environments/environment.ts. Veja SUPABASE_SETUP_GUIDE.md'
      );
    }
  }

  /**
   * Retorna o client. Lança erro claro se ainda não estiver configurado,
   * para que a origem do problema fique óbvia durante o desenvolvimento.
   */
  get client(): SupabaseClient {
    if (!this._client) {
      throw new Error(
        'Supabase não configurado. Cole URL e anon key em environment.ts (veja SUPABASE_SETUP_GUIDE.md).'
      );
    }
    return this._client;
  }

  private validarCredenciais(url?: string, anonKey?: string): boolean {
    if (!url || !anonKey) return false;
    // Ignora os placeholders padrão que vêm no environment.
    if (url.startsWith('COLE_AQUI') || anonKey.startsWith('COLE_AQUI')) return false;
    return url.startsWith('http');
  }
}
