import type { ResolveTauriCliResult } from './types.ts';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readCliBinEntry(pkg: Record<string, unknown>): string | undefined {
  const bin = pkg.bin;
  if (typeof bin === 'string') {
    return bin;
  }
  if (isRecord(bin) && typeof bin.tauri === 'string') {
    return bin.tauri;
  }
  return undefined;
}

/**
 * Resolve how to invoke Tauri CLI.
 *
 * Preference order:
 * 1. Local `@tauri-apps/cli` package (spawn via `node` — no shell, cross-platform)
 * 2. `tauri` on PATH
 */
export function resolveTauriCli(cwd = process.cwd()): ResolveTauriCliResult {
  try {
    const require = createRequire(path.join(cwd, 'noop.js'));
    const pkgPath = require.resolve('@tauri-apps/cli/package.json', { paths: [cwd] });
    const pkgRaw = readFileSync(pkgPath, 'utf8');
    const pkg: unknown = JSON.parse(pkgRaw);
    if (isRecord(pkg)) {
      const binRel = readCliBinEntry(pkg);
      if (binRel) {
        const entry = path.join(path.dirname(pkgPath), binRel);
        if (existsSync(entry)) {
          return {
            command: process.execPath,
            prefixArgs: [entry],
            source: 'local',
          };
        }
      }
    }
  } catch {
    // fall through to PATH
  }

  return {
    command: 'tauri',
    prefixArgs: [],
    source: 'path',
  };
}
