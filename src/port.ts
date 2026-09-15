import type { ResolvePortOptions } from './types.ts';
import { getPort } from 'get-port-please';

const DEFAULT_PORT = 3000;
const DEFAULT_RANGE_SIZE = 100;

/** Parse a decimal port string into a safe integer in `1..65535`. */
export function parsePort(value: string | number | undefined | null): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const raw = typeof value === 'number' ? String(value) : value.trim();
  if (!/^\d+$/.test(raw)) {
    return undefined;
  }

  const port = Number(raw);
  if (!Number.isSafeInteger(port) || port < 1 || port > 65_535) {
    return undefined;
  }

  return port;
}

function resolvePreferredPort(options: ResolvePortOptions, env: NodeJS.ProcessEnv): number {
  const fromOptions = parsePort(options.port);
  if (fromOptions !== undefined) {
    return fromOptions;
  }

  const fromEnv = parsePort(env.NUXT_PORT) ?? parsePort(env.PORT);
  return fromEnv ?? DEFAULT_PORT;
}

function resolveRange(preferred: number, range: ResolvePortOptions['portRange']): [number, number] {
  if (range) {
    const [from, to] = range;
    if (
      !Number.isSafeInteger(from) ||
      !Number.isSafeInteger(to) ||
      from < 1 ||
      to > 65_535 ||
      from > to
    ) {
      throw new Error(`Invalid port range: [${from}, ${to}]`);
    }
    return [from, to];
  }

  const to = Math.min(preferred + DEFAULT_RANGE_SIZE - 1, 65_535);
  return [preferred, to];
}

/**
 * Resolve an available TCP port, preferring `NUXT_PORT` / `PORT` / `options.port`.
 * Uses get-port-please for multi-host availability checks.
 */
export async function resolveDevPort(
  options: ResolvePortOptions = {},
  env: NodeJS.ProcessEnv = process.env,
): Promise<number> {
  const preferred = resolvePreferredPort(options, env);
  const [from, to] = resolveRange(preferred, options.portRange);
  const host = options.host ?? env.HOST ?? undefined;

  return getPort({
    name: options.name ?? 'tauri-nuxt-dev',
    port: preferred,
    portRange: [from, to],
    host,
  });
}
