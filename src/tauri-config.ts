import type { BuildTauriConfigOptions, TauriDevConfig } from './types.ts';
import { parsePort } from './port.ts';

const HOSTNAME_LIKE = /^[A-Za-z0-9._~%-]+$/;
const IPV6_LIKE = /^\[[0-9a-fA-F:.%]+\]$/;

/**
 * Map a bind host to a browser-reachable host for Tauri's `devUrl`.
 *
 * Wildcard binds become `localhost`. Bare IPv6 is bracketed. Hosts that would
 * produce a malformed URL are rejected.
 */
export function toBrowserHost(host: string): string {
  if (host === '0.0.0.0' || host === '::' || host === '[::]') {
    return 'localhost';
  }
  if (IPV6_LIKE.test(host)) {
    return host;
  }
  // Bare IPv6 (`::1`) needs brackets in a URL authority.
  if (host.includes(':') && /^[0-9a-fA-F:.%]+$/.test(host)) {
    return `[${host}]`;
  }
  if (!HOSTNAME_LIKE.test(host)) {
    throw new Error(`Invalid host for devUrl: ${host}`);
  }
  return host;
}

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

  const browserHost = toBrowserHost(options.host ?? 'localhost');

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
