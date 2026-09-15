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

const POSIX_SAFE = /^[A-Za-z0-9_./:@%+=,-]+$/;
// Windows paths need backslashes; `%` is excluded so `%VAR%` is not expanded.
const CMD_SAFE = /^[A-Za-z0-9_./:\\@+=,-]+$/;

function quoteForPosix(value: string): string {
  if (value.length > 0 && POSIX_SAFE.test(value)) {
    return value;
  }
  return `'${value.replaceAll("'", `'\\''`)}'`;
}

function quoteForCmd(value: string): string {
  if (value.length > 0 && CMD_SAFE.test(value)) {
    return value;
  }
  // cmd.exe: wrap in double quotes; double embedded quotes.
  // Percent is doubled so `%VAR%` is not expanded from beforeDevCommand.
  return `"${value.replaceAll('%', '%%').replaceAll('"', '""')}"`;
}

/**
 * Shell-escape a single argv token for embedding in a command string.
 *
 * Tauri runs `beforeDevCommand` through the platform shell (`sh -c` on Unix,
 * `cmd.exe /C` on Windows), so quoting follows `platform`.
 */
export function shellQuote(value: string, platform: NodeJS.Platform = process.platform): string {
  return platform === 'win32' ? quoteForCmd(value) : quoteForPosix(value);
}

/** Render argv as a shell command string for Tauri's beforeDevCommand. */
export function formatShellCommand(
  args: readonly string[],
  platform: NodeJS.Platform = process.platform,
): string {
  return args.map((arg) => shellQuote(arg, platform)).join(' ');
}
