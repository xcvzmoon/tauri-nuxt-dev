import type { PackageManagerInfo, PackageManagerName } from './types.ts';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const LOCKFILE_TO_PM: readonly (readonly [lockfile: string, pm: PackageManagerName])[] = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['bun.lockb', 'bun'],
  ['bun.lock', 'bun'],
  ['package-lock.json', 'npm'],
];

function readPackageJson(packageJsonPath: string):
  | {
      packageManager?: string;
      scripts?: Record<string, string>;
    }
  | undefined {
  try {
    const raw = readFileSync(packageJsonPath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return undefined;
    }

    const scripts: Record<string, string> = {};
    if (isRecord(parsed.scripts)) {
      for (const [key, value] of Object.entries(parsed.scripts)) {
        if (typeof value === 'string') {
          scripts[key] = value;
        }
      }
    }

    return {
      packageManager: typeof parsed.packageManager === 'string' ? parsed.packageManager : undefined,
      scripts: Object.keys(scripts).length > 0 ? scripts : undefined,
    };
  } catch {
    return undefined;
  }
}

function parsePackageManagerField(value: string | undefined): PackageManagerName | undefined {
  if (!value) {
    return undefined;
  }
  const name = value.split('@')[0];
  if (name === 'npm' || name === 'pnpm' || name === 'yarn' || name === 'bun') {
    return name;
  }
  return undefined;
}

function detectFromLockfiles(cwd: string): PackageManagerName | undefined {
  for (const [lockfile, pm] of LOCKFILE_TO_PM) {
    if (existsSync(path.join(cwd, lockfile))) {
      return pm;
    }
  }
  return undefined;
}

function detectFromUserAgent(userAgent: string | undefined): PackageManagerName | undefined {
  if (!userAgent) {
    return undefined;
  }
  if (userAgent.includes('pnpm')) return 'pnpm';
  if (userAgent.includes('yarn')) return 'yarn';
  if (userAgent.includes('bun')) return 'bun';
  if (userAgent.includes('npm')) return 'npm';
  return undefined;
}

/**
 * Detect the package manager and surface package.json scripts when available.
 * Order: packageManager field → lockfiles → npm_config_user_agent → npm.
 */
export function detectPackageManager(
  cwd = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
): PackageManagerInfo {
  const packageJsonPath = path.join(cwd, 'package.json');
  const pkg = existsSync(packageJsonPath) ? readPackageJson(packageJsonPath) : undefined;

  const fromField = parsePackageManagerField(pkg?.packageManager);
  const fromLockfile = detectFromLockfiles(cwd);
  const fromAgent = detectFromUserAgent(env.npm_config_user_agent);
  const name = fromField ?? fromLockfile ?? fromAgent ?? 'npm';

  return {
    name,
    packageJsonPath: pkg ? packageJsonPath : undefined,
    scripts: pkg?.scripts,
  };
}

/** Resolve the local `nuxt` binary path if present under `cwd`. */
export function resolveLocalNuxtBin(cwd = process.cwd()): string | undefined {
  try {
    const require = createRequire(path.join(cwd, 'noop.js'));
    const entry = require.resolve('nuxt/bin/nuxt.mjs', { paths: [cwd] });
    return entry;
  } catch {
    return undefined;
  }
}
