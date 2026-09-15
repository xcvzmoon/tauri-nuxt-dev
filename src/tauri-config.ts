import type { BuildTauriConfigOptions, TauriDevConfig } from './types.ts';
import { parsePort } from './port.ts';

/**
 * Build a Tauri `--config` override that points the webview and beforeDevCommand
 * at the resolved Nuxt port.
 *
 * `devUrl` always uses a browser-reachable host (`localhost` by default).
 * Binding a broader host is handled by the Nuxt `--host` flag, not by Tauri.
 */
export function buildTauriDevConfig(options: BuildTauriConfigOptions): TauriDevConfig {
  const port = parsePort(options.port);
  if (port === undefined) {
    throw new Error(`Invalid dev port: ${String(options.port)}`);
  }

  const beforeDevCommand = options.beforeDevCommand.trim();
  if (beforeDevCommand.length === 0) {
    throw new Error('beforeDevCommand must not be empty');
  }

  const urlHost = options.host ?? 'localhost';
  // Map wildcard binds to a concrete loopback address for the webview.
  const browserHost = urlHost === '0.0.0.0' || urlHost === '::' ? 'localhost' : urlHost;

  return {
    build: {
      devUrl: `http://${browserHost}:${port}`,
      beforeDevCommand,
    },
  };
}

/** Serialize a Tauri config override for `--config`. */
export function serializeTauriDevConfig(config: TauriDevConfig): string {
  return JSON.stringify(config);
}
