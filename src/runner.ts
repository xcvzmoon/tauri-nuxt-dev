import type { Logger, TauriNuxtDevOptions } from './types.ts';
import { consola } from 'consola';
import { spawn } from 'node:child_process';
import process from 'node:process';
import { loadTauriNuxtDevConfig, toConfigOverrides } from './config.ts';
import { formatShellCommand, resolveNuxtDevCommandArgs } from './nuxt-command.ts';
import { parsePort, resolveDevPort } from './port.ts';
import { resolveTauriCli } from './tauri-cli.ts';
import { buildTauriDevConfig, serializeTauriDevConfig } from './tauri-config.ts';

function createDefaultLogger(): Logger {
  return {
    info: (message) => {
      consola.info(message);
    },
    warn: (message) => {
      consola.warn(message);
    },
    error: (message) => {
      consola.error(message);
    },
  };
}

function normalizeNuxtOverride(nuxt: TauriNuxtDevOptions['nuxt']): readonly string[] | undefined {
  if (nuxt === undefined) {
    return undefined;
  }
  if (typeof nuxt === 'string') {
    return [nuxt];
  }
  return nuxt;
}

function preferredPortFromOptions(port: number | undefined, env: NodeJS.ProcessEnv): number {
  // Same acceptance rules as resolveDevPort (parsePort), for the busy-port log line.
  return parsePort(port) ?? parsePort(env.NUXT_PORT) ?? parsePort(env.PORT) ?? 3000;
}

/**
 * Resolve a free port, spawn `tauri dev` with a config override, and resolve
 * with the child exit code (0 when signalled cleanly).
 *
 * Loads c12 config (`tauri-nuxt-dev.config.*` / `package.json#tauri-nuxt-dev`)
 * and merges runtime options on top as the highest priority.
 *
 * Never uses `shell: true` — the Nuxt command is embedded as a string only
 * because Tauri's `beforeDevCommand` is a shell string by design; argv values
 * are shell-quoted before embedding.
 */
export async function tauriNuxtDev(options: TauriNuxtDevOptions = {}): Promise<number> {
  const cwd = options.cwd ?? process.cwd();
  const env: NodeJS.ProcessEnv = { ...process.env, ...options.env };
  const logger = options.logger ?? createDefaultLogger();

  const config = await loadTauriNuxtDevConfig(cwd, options.configFile, toConfigOverrides(options));

  const preferred = preferredPortFromOptions(config.port, env);
  const port = await resolveDevPort(
    {
      port: config.port,
      portRange: config.portRange,
      host: config.host,
      name: 'tauri-nuxt-dev',
    },
    env,
  );

  if (port !== preferred) {
    logger.info(`Port ${preferred} is busy, using port ${port}`);
  }

  const nuxtArgs = resolveNuxtDevCommandArgs({
    command: normalizeNuxtOverride(config.nuxt),
    cwd,
    port,
    host: config.host,
  });
  const beforeDevCommand = formatShellCommand(nuxtArgs);

  const tauriConfig = buildTauriDevConfig({
    port,
    host: config.host,
    beforeDevCommand,
  });

  const tauriCli = resolveTauriCli(cwd);
  const args = [
    ...tauriCli.prefixArgs,
    'dev',
    '--config',
    serializeTauriDevConfig(tauriConfig),
    ...(config.tauriArgs ?? []),
  ];

  if (tauriCli.source === 'path') {
    logger.info('Using `tauri` from PATH (local @tauri-apps/cli not found)');
  }

  const child = spawn(tauriCli.command, args, {
    cwd,
    env,
    stdio: 'inherit',
    shell: false,
  });

  const killChild = (signal: NodeJS.Signals) => {
    if (!child.killed) {
      child.kill(signal);
    }
  };

  const onSigint = () => {
    killChild('SIGINT');
  };
  const onSigterm = () => {
    killChild('SIGTERM');
  };
  process.on('SIGINT', onSigint);
  process.on('SIGTERM', onSigterm);

  const onAbort = () => {
    killChild('SIGTERM');
  };
  if (options.signal) {
    if (options.signal.aborted) {
      onAbort();
    } else {
      options.signal.addEventListener('abort', onAbort, { once: true });
    }
  }

  try {
    return await new Promise<number>((resolve, reject) => {
      child.once('error', (error: Error) => {
        logger.error(error.message);
        reject(error);
      });

      child.once('exit', (code, signal) => {
        if (signal === 'SIGINT' || signal === 'SIGTERM') {
          resolve(0);
          return;
        }
        resolve(code ?? 0);
      });
    });
  } finally {
    process.off('SIGINT', onSigint);
    process.off('SIGTERM', onSigterm);
    options.signal?.removeEventListener('abort', onAbort);
  }
}
