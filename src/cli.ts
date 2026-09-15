#!/usr/bin/env node
import { consola } from 'consola';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { parsePort } from './port.ts';
import { tauriNuxtDev } from './runner.ts';

function printHelp(): void {
  consola.log(`tauri-nuxt-dev — run Tauri + Nuxt with automatic port resolution

Usage:
  tauri-nuxt-dev [options]

Options:
  --config <file>     Explicit C12 config file path
  --port <n>          Preferred port (default: NUXT_PORT or 3000)
  --host <host>       Bind/check host (also passed to Nuxt --host)
  --nuxt <bin>        Nuxt starter binary (default: package-manager aware)
  --cwd <dir>         Working directory (default: process.cwd())
  -h, --help          Show help
  -v, --version       Show version

Config:
  Loads tauri-nuxt-dev.config.{ts,js,mjs,cjs,json} or the "tauri-nuxt-dev"
  key in package.json via c12. CLI flags win over the file.

Pass-through:
  All other args are forwarded to \`tauri dev\`.

Examples:
  tauri-nuxt-dev
  tauri-nuxt-dev --port 4000
  tauri-nuxt-dev --config ./tauri-nuxt-dev.config.ts
  tauri-nuxt-dev --nuxt vpr -- --features foo
`);
}

interface ParsedCli {
  help: boolean;
  version: boolean;
  configFile?: string | undefined;
  port?: number | undefined;
  host?: string | undefined;
  nuxt?: string | undefined;
  cwd?: string | undefined;
  passthrough: string[];
}

export function parseCliArgs(argv: readonly string[]): ParsedCli {
  const result: ParsedCli = {
    help: false,
    version: false,
    passthrough: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--') {
      result.passthrough.push(...argv.slice(i + 1));
      break;
    }

    if (arg === '-h' || arg === '--help') {
      result.help = true;
      continue;
    }

    if (arg === '-v' || arg === '--version') {
      result.version = true;
      continue;
    }

    if (arg === '--config') {
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) {
        throw new Error('--config requires a value');
      }
      result.configFile = value;
      i += 1;
      continue;
    }

    if (arg.startsWith('--config=')) {
      const value = arg.slice('--config='.length);
      if (!value) {
        throw new Error('--config requires a value');
      }
      result.configFile = value;
      continue;
    }

    if (arg === '--port') {
      const value = argv[i + 1];
      const port = parsePort(value);
      if (port === undefined) {
        throw new Error(`Invalid --port value: ${value ?? ''}`);
      }
      result.port = port;
      i += 1;
      continue;
    }

    if (arg.startsWith('--port=')) {
      const port = parsePort(arg.slice('--port='.length));
      if (port === undefined) {
        throw new Error(`Invalid --port value: ${arg}`);
      }
      result.port = port;
      continue;
    }

    if (arg === '--host') {
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) {
        throw new Error('--host requires a value');
      }
      result.host = value;
      i += 1;
      continue;
    }

    if (arg.startsWith('--host=')) {
      const value = arg.slice('--host='.length);
      if (!value) {
        throw new Error('--host requires a value');
      }
      result.host = value;
      continue;
    }

    if (arg === '--nuxt') {
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) {
        throw new Error('--nuxt requires a value');
      }
      result.nuxt = value;
      i += 1;
      continue;
    }

    if (arg.startsWith('--nuxt=')) {
      const value = arg.slice('--nuxt='.length);
      if (!value) {
        throw new Error('--nuxt requires a value');
      }
      result.nuxt = value;
      continue;
    }

    if (arg === '--cwd') {
      const value = argv[i + 1];
      if (!value || value.startsWith('-')) {
        throw new Error('--cwd requires a value');
      }
      result.cwd = value;
      i += 1;
      continue;
    }

    if (arg.startsWith('--cwd=')) {
      const value = arg.slice('--cwd='.length);
      if (!value) {
        throw new Error('--cwd requires a value');
      }
      result.cwd = value;
      continue;
    }

    result.passthrough.push(arg);
  }

  return result;
}

function isPackageWithVersion(value: unknown): value is { version: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    typeof value.version === 'string'
  );
}

async function readVersion(): Promise<string> {
  try {
    const { readFile } = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    const pkgUrl = new URL('../package.json', import.meta.url);
    const raw = await readFile(fileURLToPath(pkgUrl), 'utf8');
    const pkg: unknown = JSON.parse(raw);
    if (isPackageWithVersion(pkg)) {
      return pkg.version;
    }
    return '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export async function runCli(argv: readonly string[] = process.argv.slice(2)): Promise<number> {
  let parsed: ParsedCli;
  try {
    parsed = parseCliArgs(argv);
  } catch (error) {
    consola.error(error instanceof Error ? error.message : String(error));
    return 1;
  }

  if (parsed.help) {
    printHelp();
    return 0;
  }

  if (parsed.version) {
    consola.log(await readVersion());
    return 0;
  }

  try {
    return await tauriNuxtDev({
      configFile: parsed.configFile,
      port: parsed.port,
      host: parsed.host,
      nuxt: parsed.nuxt,
      cwd: parsed.cwd,
      tauriArgs: parsed.passthrough,
    });
  } catch (error) {
    consola.error(error instanceof Error ? error : String(error));
    return 1;
  }
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  try {
    return import.meta.url === pathToFileURL(entry).href;
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  runCli().then(
    (code) => {
      process.exitCode = code;
    },
    (error: unknown) => {
      consola.error(error);
      process.exitCode = 1;
    },
  );
}
