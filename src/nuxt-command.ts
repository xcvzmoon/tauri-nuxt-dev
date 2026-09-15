import type { NuxtDevCommandOptions, PackageManagerName } from './types.ts';
import { detectPackageManager, resolveLocalNuxtBin } from './package-manager.ts';

function scriptRunnerArgs(
  pm: PackageManagerName,
  script: string,
  forwarded: readonly string[],
): string[] {
  switch (pm) {
    case 'npm': {
      return ['run', script, '--', ...forwarded];
    }
    case 'pnpm': {
      return ['run', script, '--', ...forwarded];
    }
    case 'yarn': {
      return ['run', script, ...forwarded];
    }
    case 'bun': {
      return ['run', script, ...forwarded];
    }
    default: {
      const exhaustive: never = pm;
      throw new Error(`Unsupported package manager: ${String(exhaustive)}`);
    }
  }
}

/**
 * Build the argv used as Tauri's `beforeDevCommand` (minus quoting).
 * Prefer an explicit override, then the `nuxt:dev` script via the detected
 * package manager, then a local/global `nuxt` binary.
 */
export function resolveNuxtDevCommandArgs(options: NuxtDevCommandOptions): string[] {
  const portFlag = ['--port', String(options.port)];
  const hostFlag = options.host ? ['--host', options.host] : [];

  if (options.command) {
    return [...options.command, ...portFlag, ...hostFlag];
  }

  const cwd = options.cwd ?? process.cwd();
  const detected = detectPackageManager(cwd);
  const pm = options.packageManager ?? detected.name;
  const hasNuxtDevScript = detected.scripts?.['nuxt:dev'] !== undefined;

  if (hasNuxtDevScript) {
    return [pm, ...scriptRunnerArgs(pm, 'nuxt:dev', [...portFlag, ...hostFlag])];
  }

  const localNuxt = resolveLocalNuxtBin(cwd);
  if (localNuxt) {
    return [process.execPath, localNuxt, 'dev', ...portFlag, ...hostFlag];
  }

  return ['nuxt', 'dev', ...portFlag, ...hostFlag];
}

/** Shell-escape a single argv token for embedding in a command string. */
export function shellQuote(value: string): string {
  if (value.length > 0 && /^[A-Za-z0-9_./:@%+=,-]+$/.test(value)) {
    return value;
  }
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

/** Render argv as a shell command string for Tauri's beforeDevCommand. */
export function formatShellCommand(args: readonly string[]): string {
  return args.map((arg) => shellQuote(arg)).join(' ');
}
