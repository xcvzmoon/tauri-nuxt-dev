# tauri-nuxt-dev

[![CI](https://github.com/xcvzmoon/tauri-nuxt-dev/actions/workflows/ci.yaml/badge.svg)](https://github.com/xcvzmoon/tauri-nuxt-dev/actions/workflows/ci.yaml)
[![npm version](https://img.shields.io/npm/v/tauri-nuxt-dev?style=flat&colorA=18181B&colorB=F0DB4F)](https://npmjs.com/package/tauri-nuxt-dev)
[![npm downloads](https://img.shields.io/npm/dm/tauri-nuxt-dev?style=flat&colorA=18181B&colorB=F0DB4F)](https://npmjs.com/package/tauri-nuxt-dev)
[![license](https://img.shields.io/github/license/xcvzmoon/tauri-nuxt-dev?style=flat&colorA=18181B&colorB=F0DB4F)](https://github.com/xcvzmoon/tauri-nuxt-dev/blob/main/LICENSE)

**One command to run Tauri + Nuxt in development**, with automatic free-port resolution.

Replaces the usual copy-pasted `scripts/dev.ts`: pick a free port, start Nuxt there, point Tauri at the same URL.

```bash
pnpm add -D tauri-nuxt-dev @tauri-apps/cli
# package.json → "dev": "tauri-nuxt-dev"
pnpm dev
```

## Contents

- [Why this exists](#why-this-exists)
- [Features](#features)
- [Install](#install)
- [Quick start](#quick-start)
- [Configuration (c12)](#configuration-c12)
- [CLI](#cli)
- [Recipes](#recipes)
- [How it works](#how-it-works)
- [Programmatic API](#programmatic-api)
- [Environment variables](#environment-variables)
- [Security](#security)
- [Migrating from `scripts/dev.ts`](#migrating-from-scriptsdevts)
- [Related](#related)
- [Development](#development)
- [License](#license)

## Why this exists

Tauri’s dev flow needs both sides to agree on a URL:

1. Nuxt binds a free port.
2. Tauri loads that exact `devUrl`.
3. `beforeDevCommand` starts Nuxt on the same port.

If `3000` is busy, a naive script either crashes or leaves Tauri pointing at the wrong port. This library resolves a free port once, then builds a Tauri `--config` override so both stay in sync.

```text
preferred port (config / NUXT_PORT / --port / 3000)
        │
        ▼
  get-port-please  ──►  free port
        │
        ├─► beforeDevCommand  (package-manager aware `nuxt:dev`)
        └─► build.devUrl      (http://localhost:<port>)
                │
                ▼
           tauri dev --config <json>
```

Your on-disk `src-tauri/tauri.conf.json` is never modified.

## Features

- **Auto free port** via [`get-port-please`](https://github.com/unjs/get-port-please)
- **c12 project config** — `tauri-nuxt-dev.config.ts` or `package.json#tauri-nuxt-dev`
- **Package-manager aware** — pnpm / npm / yarn / bun `nuxt:dev` scripts
- **Local Tauri CLI first** — resolves `@tauri-apps/cli`, falls back to `PATH`
- **CLI + library** — `tauri-nuxt-dev` bin, or `tauriNuxtDev()` in a script
- **Safe spawn** — no `shell: true`; shell-quoted `beforeDevCommand` only

## Install

```bash
# pnpm
pnpm add -D tauri-nuxt-dev @tauri-apps/cli

# npm
npm i -D tauri-nuxt-dev @tauri-apps/cli

# yarn
yarn add -D tauri-nuxt-dev @tauri-apps/cli

# bun
bun add -d tauri-nuxt-dev @tauri-apps/cli
```

**Requirements**

|          |                                                                                                              |
| -------- | ------------------------------------------------------------------------------------------------------------ |
| Node.js  | `^20.19` / `^22.12` / `>=24` (ESM only)                                                                      |
| Frontend | Nuxt app with a `nuxt:dev` or `dev` script (or a local `nuxt` binary)                                        |
| Tauri    | [`@tauri-apps/cli`](https://www.npmjs.com/package/@tauri-apps/cli) locally (preferred), or `tauri` on `PATH` |

## Quick start

### 1. Add the script

```json
{
  "scripts": {
    "nuxt:dev": "nuxt dev",
    "dev": "tauri-nuxt-dev"
  }
}
```

### 2. Run

```bash
pnpm dev
```

If `3000` is free you get `http://localhost:3000`. If not:

```text
Port 3000 is busy, using port 3001
```

### 3. Optional config

```ts
// tauri-nuxt-dev.config.ts
import { defineConfig } from 'tauri-nuxt-dev';

export default defineConfig({
  port: 3000,
  nuxt: 'vpr', // or omit to auto-detect `nuxt:dev`
});
```

### Programmatic (same runner)

```ts
import { tauriNuxtDev } from 'tauri-nuxt-dev';

process.exitCode = await tauriNuxtDev({ port: 3000 });
```

## Configuration (c12)

Project settings load with [c12](https://github.com/unjs/c12) — same pattern as `genbumppush`.

### Where config lives

| Source         | Example                                                        |
| -------------- | -------------------------------------------------------------- |
| Config file    | `tauri-nuxt-dev.config.ts` / `.js` / `.mjs` / `.cjs` / `.json` |
| `package.json` | `"tauri-nuxt-dev": { … }`                                      |
| Explicit path  | `--config ./custom.config.ts`                                  |

Discovery is rooted at `cwd` (`--cwd` / `options.cwd`).

> **TypeScript configs:** `.ts` config files load through native ESM when possible, then fall back to the optional peer [`jiti`](https://github.com/unjs/jiti). Install it if your runtime cannot import the file directly:
>
> ```bash
> pnpm add -D jiti
> ```
>
> JSON and `package.json#tauri-nuxt-dev` configs need no extra dependency.

### Resolution order (later wins)

1. Built-in `defaults` (empty; ports still honor `NUXT_PORT` / `PORT`)
2. `"tauri-nuxt-dev"` key in `package.json`
3. C12 config file (or the `configFile` you pass)
4. **CLI flags / programmatic options** (highest priority)

`loadTauriNuxtDevConfig` also loads `.env` via `setupDotenv({ cwd })` without overwriting existing env vars. Secrets belong in the environment — not in config files.

### `TauriNuxtDevConfig` fields

| Field       | Type                 | Default                       | Description                          |
| ----------- | -------------------- | ----------------------------- | ------------------------------------ |
| `port`      | `number`             | `NUXT_PORT` / `PORT` / `3000` | Preferred port                       |
| `portRange` | `[from, to]`         | `[port, port + 99]`           | Inclusive fallback scan              |
| `host`      | `string`             | unset / `HOST`                | Port checks, Nuxt `--host`, `devUrl` |
| `nuxt`      | `string \| string[]` | auto                          | Nuxt starter binary or full argv     |
| `tauriArgs` | `string[]`           | `[]`                          | Extra args for `tauri dev`           |

Runtime-only options on `tauriNuxtDev` (`cwd`, `configFile`, `env`, `logger`, `signal`) are **never** read from a config file.

### `defineConfig`

```ts
import { defineConfig } from 'tauri-nuxt-dev';

export default defineConfig({
  port: 3000,
  portRange: [3000, 3100],
  host: '0.0.0.0',
  nuxt: 'vpr',
  tauriArgs: ['--features', 'debug'],
});
```

Same object in `package.json`:

```json
{
  "tauri-nuxt-dev": {
    "port": 3000,
    "nuxt": "vpr",
    "tauriArgs": ["--features", "debug"]
  }
}
```

The return type is the package’s own `TauriNuxtDevConfig` — not c12 internals — so consumer `declaration` emit stays portable under pnpm (see [genbumppush#6](https://github.com/xcvzmoon/genbumppush/issues/6)).

### `loadTauriNuxtDevConfig`

```ts
import { loadTauriNuxtDevConfig } from 'tauri-nuxt-dev';

const config = await loadTauriNuxtDevConfig(process.cwd());

const forced = await loadTauriNuxtDevConfig(process.cwd(), './custom.config.ts', {
  port: 4000,
});
```

## CLI

```text
tauri-nuxt-dev [options] [-- <tauri dev args>]
```

| Flag              | Description                                          |
| ----------------- | ---------------------------------------------------- |
| `--config <file>` | Explicit C12 config file                             |
| `--port <n>`      | Preferred port                                       |
| `--host <host>`   | Port check + Nuxt `--host` + `devUrl` host           |
| `--nuxt <bin>`    | Nuxt starter binary (default: package-manager aware) |
| `--cwd <dir>`     | Config discovery + spawn directory                   |
| `-h`, `--help`    | Help                                                 |
| `-v`, `--version` | Version                                              |

- Unrecognized flags and everything after `--` go to `tauri dev`.
- CLI flags always win over the config file.

```bash
tauri-nuxt-dev
tauri-nuxt-dev --port 4000
tauri-nuxt-dev --config ./tauri-nuxt-dev.config.ts
tauri-nuxt-dev --host 0.0.0.0
tauri-nuxt-dev --nuxt vpr
tauri-nuxt-dev -- --features debug
tauri-nuxt-dev --port 4000 -- --target aarch64-apple-darwin
```

## Recipes

### Vite+ / `vpr` template

```ts
// tauri-nuxt-dev.config.ts
import { defineConfig } from 'tauri-nuxt-dev';

export default defineConfig({ nuxt: 'vpr' });
```

or

```bash
tauri-nuxt-dev --nuxt vpr
```

```ts
await tauriNuxtDev({ nuxt: ['vpr', 'nuxt:dev'] });
```

### Device / mobile testing (bind all interfaces)

```bash
tauri-nuxt-dev --host 0.0.0.0
```

Nuxt gets `--host 0.0.0.0`. Tauri’s `devUrl` still uses `localhost` so the webview can connect (`0.0.0.0` / `::` are mapped automatically).

### Force a port or range

```ts
import { defineConfig } from 'tauri-nuxt-dev';

export default defineConfig({
  port: 4000,
  portRange: [4000, 4100],
});
```

### Programmatic runner with abort + custom logger

```ts
import { tauriNuxtDev } from 'tauri-nuxt-dev';

const code = await tauriNuxtDev({
  cwd: process.cwd(),
  configFile: './tauri-nuxt-dev.config.ts',
  port: 3000,
  host: '0.0.0.0',
  nuxt: 'vpr',
  tauriArgs: ['--features', 'debug'],
  env: { FOO: 'bar' },
  logger: {
    info: (m) => console.info(m),
    warn: (m) => console.warn(m),
    error: (m) => console.error(m),
  },
  signal: AbortSignal.timeout(60_000),
});

process.exitCode = code;
```

## How it works

1. **Load c12 config** (file / `package.json` + CLI/API overrides).
2. **Resolve a free port** with `get-port-please`  
   preferred → fallback range `[port, port+99]`.
3. **Build the Nuxt command** (package-manager aware — see below).
4. **Build a one-off Tauri config override**:
   ```json
   {
     "build": {
       "devUrl": "http://localhost:<port>",
       "beforeDevCommand": "<nuxt command> --port <port>"
     }
   }
   ```
5. **Spawn** `tauri dev --config <json>` with `shell: false`.
6. **Forward signals** (`SIGINT` / `SIGTERM` / `AbortSignal`) and resolve with the child exit code (`0` on clean signal exit).

```bash
# equivalent shape of what the runner passes to Tauri
tauri dev --config '{"build":{"devUrl":"http://localhost:3001","beforeDevCommand":"pnpm run nuxt:dev -- --port 3001"}}'
```

### Package-manager aware Nuxt command

With `"nuxt:dev": "nuxt dev"` in `package.json`:

| PM   | `beforeDevCommand`                   |
| ---- | ------------------------------------ |
| pnpm | `pnpm run nuxt:dev -- --port <port>` |
| npm  | `npm run nuxt:dev -- --port <port>`  |
| yarn | `yarn run nuxt:dev --port <port>`    |
| bun  | `bun run nuxt:dev --port <port>`     |

Fallbacks when there is no `nuxt:dev` script:

1. Local `nuxt` package → `node <nuxt-bin> dev …`
2. `nuxt dev` on `PATH`

**Package-manager detection order:** `packageManager` field → lockfile (`pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`/`bun.lock`, `package-lock.json`) → `npm_config_user_agent` → `npm`.

## Programmatic API

```ts
import {
  // runner + config
  tauriNuxtDev,
  defineConfig,
  loadTauriNuxtDevConfig,
  toConfigOverrides,
  defaults,
  // ports
  resolveDevPort,
  parsePort,
  // Tauri config payload
  buildTauriDevConfig,
  serializeTauriDevConfig,
  toBrowserHost,
  // Nuxt command
  resolveNuxtDevCommandArgs,
  formatShellCommand,
  shellQuote,
  // resolution helpers
  detectPackageManager,
  resolveLocalNuxtBin,
  resolveTauriCli,
} from 'tauri-nuxt-dev';
```

### `tauriNuxtDev(options?): Promise<number>`

End-to-end: load config → free port → spawn `tauri dev` → return exit code.

| Option       | Type                 | Default           | Notes                        |
| ------------ | -------------------- | ----------------- | ---------------------------- |
| `port`       | `number`             | env / `3000`      | Overrides config file        |
| `portRange`  | `[from, to]`         | `[port, port+99]` |                              |
| `host`       | `string`             | —                 | Port check + Nuxt + `devUrl` |
| `nuxt`       | `string \| string[]` | auto              | Binary or full argv          |
| `tauriArgs`  | `string[]`           | `[]`              | Forwarded to `tauri dev`     |
| `cwd`        | `string`             | `process.cwd()`   | Runtime-only                 |
| `configFile` | `string`             | auto              | Runtime-only                 |
| `env`        | `NodeJS.ProcessEnv`  | `process.env`     | Runtime-only                 |
| `logger`     | `Logger`             | `consola`         | Runtime-only                 |
| `signal`     | `AbortSignal`        | —                 | Runtime-only                 |

```ts
interface Logger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}
```

### Ports

```ts
import { resolveDevPort, parsePort } from 'tauri-nuxt-dev';

const port = await resolveDevPort(
  { port: 3000, portRange: [3000, 3100], host: '127.0.0.1' },
  process.env,
);

parsePort('3000'); // 3000
parsePort('0'); // undefined
parsePort('abc'); // undefined
```

| `resolveDevPort` option | Default                       |
| ----------------------- | ----------------------------- |
| `port`                  | `NUXT_PORT` / `PORT` / `3000` |
| `portRange`             | `[port, port+99]`             |
| `host`                  | `HOST` env                    |
| `name`                  | `'tauri-nuxt-dev'`            |

`parsePort` accepts a string or number and returns `undefined` outside `1..65535`.

### Tauri config payload

```ts
import { buildTauriDevConfig, serializeTauriDevConfig, toBrowserHost } from 'tauri-nuxt-dev';

const config = buildTauriDevConfig({
  port: 3000,
  host: '0.0.0.0',
  beforeDevCommand: 'pnpm run nuxt:dev -- --port 3000 --host 0.0.0.0',
});
// { build: { devUrl: 'http://localhost:3000', beforeDevCommand: '…' } }

serializeTauriDevConfig(config); // JSON string for `--config`
toBrowserHost('::1'); // '[::1]'
toBrowserHost('0.0.0.0'); // 'localhost'
```

### Nuxt command helpers

```ts
import { resolveNuxtDevCommandArgs, formatShellCommand, shellQuote } from 'tauri-nuxt-dev';

const args = resolveNuxtDevCommandArgs({
  cwd: process.cwd(),
  port: 4000,
  host: '0.0.0.0',
});
// ['pnpm', 'run', 'nuxt:dev', '--', '--port', '4000', '--host', '0.0.0.0']

formatShellCommand(args);
// 'pnpm run nuxt:dev -- --port 4000 --host 0.0.0.0'

shellQuote('hello world'); // "'hello world'" (POSIX)
shellQuote('hello world', 'win32'); // '"hello world"' (cmd.exe)
```

### Resolution helpers

```ts
import { detectPackageManager, resolveLocalNuxtBin, resolveTauriCli } from 'tauri-nuxt-dev';

detectPackageManager('/path/to/app');
// { name: 'pnpm', packageJsonPath: '…/package.json', scripts: { … } }

resolveLocalNuxtBin();
// absolute path to nuxt bin, or undefined

resolveTauriCli();
// local: { command: process.execPath, prefixArgs: [entry], source: 'local' }
// path:  { command: 'tauri', prefixArgs: [], source: 'path' }
```

Local Tauri CLI is spawned as `node <resolved-entry> …` (no shell, cross-platform).

## Environment variables

| Variable                | Role                                 |
| ----------------------- | ------------------------------------ |
| `NUXT_PORT`             | Preferred port after config/`--port` |
| `PORT`                  | Fallback preferred port              |
| `HOST`                  | Default host for port checks         |
| `npm_config_user_agent` | Last-resort package-manager hint     |

## Security

- Child processes use `shell: false`.
- Local Tauri CLI runs via `node <resolved-entry>`, not a shell string.
- Ports are validated as safe integers in `1..65535`.
- `devUrl` hosts are validated; wildcard binds map to `localhost` and bare IPv6 is bracketed.
- `beforeDevCommand` is a shell string only because Tauri requires one; argv tokens are shell-quoted for the platform (`sh`/POSIX single quotes on Unix, `cmd.exe` double quotes on Windows).
- Unknown CLI args are argv passthrough to `tauri dev`, not shell interpolation.
- `.env` is loaded without overwriting existing environment variables.

Report vulnerabilities via [GitHub Security Advisories](https://github.com/xcvzmoon/tauri-nuxt-dev/security/advisories/new).

## Migrating from `scripts/dev.ts`

**Before** — hand-rolled port scan + spawn in a template script.

**After** — config + one line:

```ts
// tauri-nuxt-dev.config.ts
import { defineConfig } from 'tauri-nuxt-dev';

export default defineConfig({ nuxt: 'vpr' });
```

```json
{
  "scripts": {
    "dev": "tauri-nuxt-dev"
  }
}
```

Or keep a thin script:

```ts
// scripts/dev.ts
import { tauriNuxtDev } from 'tauri-nuxt-dev';

process.exitCode = await tauriNuxtDev({ nuxt: 'vpr' });
```

## Related

- [create-tauri-nuxt](https://github.com/xcvzmoon/create-tauri-nuxt) — Tauri + Nuxt template this library was extracted from
- [get-port-please](https://github.com/unjs/get-port-please) — port resolution
- [c12](https://github.com/unjs/c12) — config loading
- [Tauri CLI](https://v2.tauri.app/develop/) — `tauri dev`
- [Nuxt](https://nuxt.com) — `nuxt dev`

## Development

```bash
pnpm install
pnpm test
pnpm build
pnpm check
```

| Script                     | Description                          |
| -------------------------- | ------------------------------------ |
| `pnpm build`               | tsdown build (+ publint)             |
| `pnpm test`                | Vitest unit tests                    |
| `pnpm typecheck`           | TypeScript check                     |
| `pnpm lint` / `pnpm check` | oxlint / format + lint gate          |
| `pnpm release`             | Version bump + publish (genbumppush) |

Optional peer for TypeScript config files: `jiti` (see [Configuration](#configuration-c12)).

## License

[MIT](https://github.com/xcvzmoon/tauri-nuxt-dev/blob/main/LICENSE) © [xcvzmoon](https://github.com/xcvzmoon)
