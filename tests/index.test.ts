import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { parseCliArgs } from '../src/cli.ts';
import { defineConfig, loadTauriNuxtDevConfig, toConfigOverrides } from '../src/config.ts';
import { formatShellCommand, resolveNuxtDevCommandArgs, shellQuote } from '../src/nuxt-command.ts';
import { detectPackageManager } from '../src/package-manager.ts';
import { parsePort, resolveDevPort } from '../src/port.ts';
import { resolveTauriCli } from '../src/tauri-cli.ts';
import { buildTauriDevConfig, serializeTauriDevConfig } from '../src/tauri-config.ts';

const tempDirs: string[] = [];

async function createTempProject(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'tauri-nuxt-dev-'));
  tempDirs.push(dir);
  await Promise.all(
    Object.entries(files).map(async ([relative, contents]) => {
      const target = path.join(dir, relative);
      await writeFile(target, contents, 'utf8');
    }),
  );
  return dir;
}

function listen(port: number): Promise<() => Promise<void>> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      resolve(
        () =>
          new Promise<void>((done) => {
            server.close(() => {
              done();
            });
          }),
      );
    });
  });
}

afterAll(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('parsePort', () => {
  it('accepts valid ports', () => {
    expect(parsePort('3000')).toBe(3000);
    expect(parsePort(8080)).toBe(8080);
    expect(parsePort(' 4173 ')).toBe(4173);
  });

  it('rejects invalid values', () => {
    expect(parsePort(undefined)).toBeUndefined();
    expect(parsePort('')).toBeUndefined();
    expect(parsePort('abc')).toBeUndefined();
    expect(parsePort('0')).toBeUndefined();
    expect(parsePort('65536')).toBeUndefined();
    expect(parsePort('-1')).toBeUndefined();
    expect(parsePort('1.5')).toBeUndefined();
  });
});

describe('resolveDevPort', () => {
  it('returns the preferred port when free', async () => {
    const port = await resolveDevPort({ port: 45_123 }, {});
    expect(port).toBe(45_123);
  });

  it('falls back when the preferred port is busy', async () => {
    const close = await listen(45_200);
    try {
      const port = await resolveDevPort(
        { port: 45_200, portRange: [45_200, 45_210], host: '127.0.0.1' },
        {},
      );
      expect(port).toBeGreaterThanOrEqual(45_200);
      expect(port).toBeLessThanOrEqual(45_210);
      expect(port).not.toBe(45_200);
    } finally {
      await close();
    }
  });

  it('reads NUXT_PORT from env', async () => {
    const port = await resolveDevPort({}, { NUXT_PORT: '45300' });
    expect(port).toBe(45300);
  });
});

describe('buildTauriDevConfig', () => {
  it('builds a config override', () => {
    const config = buildTauriDevConfig({
      port: 3000,
      beforeDevCommand: 'pnpm run nuxt:dev -- --port 3000',
    });
    expect(config).toEqual({
      build: {
        devUrl: 'http://localhost:3000',
        beforeDevCommand: 'pnpm run nuxt:dev -- --port 3000',
      },
    });
  });

  it('maps wildcard hosts to localhost for the webview', () => {
    const config = buildTauriDevConfig({
      port: 4000,
      host: '0.0.0.0',
      beforeDevCommand: 'nuxt dev --port 4000 --host 0.0.0.0',
    });
    expect(config.build.devUrl).toBe('http://localhost:4000');
  });

  it('rejects invalid ports and empty commands', () => {
    expect(() => buildTauriDevConfig({ port: 0, beforeDevCommand: 'nuxt dev' })).toThrow(
      /Invalid dev port/,
    );
    expect(() => buildTauriDevConfig({ port: 3000, beforeDevCommand: '   ' })).toThrow(
      /beforeDevCommand/,
    );
  });

  it('serializes to JSON for --config', () => {
    const serialized = serializeTauriDevConfig(
      buildTauriDevConfig({ port: 3000, beforeDevCommand: 'nuxt dev --port 3000' }),
    );
    expect(JSON.parse(serialized)).toEqual({
      build: {
        devUrl: 'http://localhost:3000',
        beforeDevCommand: 'nuxt dev --port 3000',
      },
    });
  });
});

describe('shell quoting', () => {
  it('leaves safe tokens unquoted', () => {
    expect(shellQuote('nuxt')).toBe('nuxt');
    expect(shellQuote('--port')).toBe('--port');
    expect(shellQuote('http://localhost:3000')).toBe('http://localhost:3000');
  });

  it('quotes unsafe tokens', () => {
    expect(shellQuote('hello world')).toBe(`'hello world'`);
    expect(shellQuote(`it's`)).toBe(`'it'\\''s'`);
  });

  it('formats a full command', () => {
    expect(formatShellCommand(['pnpm', 'run', 'nuxt:dev', '--', '--port', '3000'])).toBe(
      'pnpm run nuxt:dev -- --port 3000',
    );
  });
});

describe('detectPackageManager', () => {
  it('prefers the packageManager field', async () => {
    const dir = await createTempProject({
      'package.json': JSON.stringify({
        packageManager: 'pnpm@12.4.1',
        scripts: { 'nuxt:dev': 'nuxt dev' },
      }),
      'yarn.lock': '',
    });
    const info = detectPackageManager(dir, {});
    expect(info.name).toBe('pnpm');
    expect(info.scripts?.['nuxt:dev']).toBe('nuxt dev');
  });

  it('falls back to lockfiles', async () => {
    const dir = await createTempProject({
      'package.json': JSON.stringify({ scripts: { 'nuxt:dev': 'nuxt dev' } }),
      'pnpm-lock.yaml': '',
    });
    expect(detectPackageManager(dir, {}).name).toBe('pnpm');
  });

  it('falls back to npm_config_user_agent', async () => {
    const dir = await createTempProject({
      'package.json': JSON.stringify({}),
    });
    expect(detectPackageManager(dir, { npm_config_user_agent: 'yarn/1.22.0' }).name).toBe('yarn');
  });
});

describe('resolveNuxtDevCommandArgs', () => {
  it('uses an explicit command override', () => {
    expect(
      resolveNuxtDevCommandArgs({
        command: ['vpr', 'nuxt:dev'],
        port: 3000,
      }),
    ).toEqual(['vpr', 'nuxt:dev', '--port', '3000']);
  });

  it('uses the package-manager script when present', async () => {
    const dir = await createTempProject({
      'package.json': JSON.stringify({
        packageManager: 'pnpm@12.4.1',
        scripts: { 'nuxt:dev': 'nuxt dev' },
      }),
    });
    expect(
      resolveNuxtDevCommandArgs({
        cwd: dir,
        port: 4000,
        host: '0.0.0.0',
      }),
    ).toEqual(['pnpm', 'run', 'nuxt:dev', '--', '--port', '4000', '--host', '0.0.0.0']);
  });

  it('falls back to nuxt dev when no script exists', async () => {
    const dir = await createTempProject({
      'package.json': JSON.stringify({ scripts: {} }),
    });
    expect(resolveNuxtDevCommandArgs({ cwd: dir, port: 3000 })).toEqual([
      'nuxt',
      'dev',
      '--port',
      '3000',
    ]);
  });
});

describe('resolveTauriCli', () => {
  it('falls back to PATH when @tauri-apps/cli is missing', async () => {
    const dir = await createTempProject({
      'package.json': JSON.stringify({}),
    });
    const resolved = resolveTauriCli(dir);
    expect(resolved.source).toBe('path');
    expect(resolved.command).toBe('tauri');
    expect(resolved.prefixArgs).toEqual([]);
  });
});

describe('parseCliArgs', () => {
  it('parses flags and passthrough', () => {
    expect(
      parseCliArgs(['--port', '4000', '--host', '0.0.0.0', '--', '--features', 'foo']),
    ).toEqual({
      help: false,
      version: false,
      configFile: undefined,
      port: 4000,
      host: '0.0.0.0',
      nuxt: undefined,
      cwd: undefined,
      passthrough: ['--features', 'foo'],
    });
  });

  it('parses equals-form flags', () => {
    expect(parseCliArgs(['--port=5173', '--nuxt=vpr'])).toMatchObject({
      port: 5173,
      nuxt: 'vpr',
    });
  });

  it('parses --config', () => {
    expect(parseCliArgs(['--config', './custom.config.ts'])).toMatchObject({
      configFile: './custom.config.ts',
    });
    expect(parseCliArgs(['--config=./other.config.ts'])).toMatchObject({
      configFile: './other.config.ts',
    });
  });

  it('rejects invalid port', () => {
    expect(() => parseCliArgs(['--port', 'nope'])).toThrow(/Invalid --port/);
  });
});

describe('c12 config', () => {
  it('defineConfig is an identity helper', () => {
    const input = { port: 4000, nuxt: 'vpr' as const };
    expect(defineConfig(input)).toBe(input);
  });

  it('toConfigOverrides only includes defined fields', () => {
    expect(toConfigOverrides({ port: 4000, cwd: '/tmp', signal: undefined })).toEqual({
      port: 4000,
    });
    expect(
      toConfigOverrides({
        host: '0.0.0.0',
        nuxt: 'vpr',
        tauriArgs: ['--features', 'foo'],
        logger: { info: () => {}, warn: () => {}, error: () => {} },
      }),
    ).toEqual({
      host: '0.0.0.0',
      nuxt: 'vpr',
      tauriArgs: ['--features', 'foo'],
    });
  });

  it('loads package.json#tauri-nuxt-dev', async () => {
    const dir = await createTempProject({
      'package.json': JSON.stringify({
        name: 'fixture',
        'tauri-nuxt-dev': {
          port: 4100,
          nuxt: 'vpr',
        },
      }),
    });

    const config = await loadTauriNuxtDevConfig(dir);
    expect(config.port).toBe(4100);
    expect(config.nuxt).toBe('vpr');
  });

  it('loads tauri-nuxt-dev.config.json', async () => {
    const dir = await createTempProject({
      'package.json': JSON.stringify({ name: 'fixture' }),
      'tauri-nuxt-dev.config.json': JSON.stringify({
        port: 4200,
        host: '127.0.0.1',
        tauriArgs: ['--features', 'debug'],
      }),
    });

    const config = await loadTauriNuxtDevConfig(dir);
    expect(config).toMatchObject({
      port: 4200,
      host: '127.0.0.1',
      tauriArgs: ['--features', 'debug'],
    });
  });

  it('applies overrides on top of the config file', async () => {
    const dir = await createTempProject({
      'package.json': JSON.stringify({
        name: 'fixture',
        'tauri-nuxt-dev': { port: 4100, host: 'localhost' },
      }),
      'tauri-nuxt-dev.config.json': JSON.stringify({ port: 4200, nuxt: 'vpr' }),
    });

    const config = await loadTauriNuxtDevConfig(dir, undefined, { port: 4300 });
    expect(config.port).toBe(4300);
    expect(config.nuxt).toBe('vpr');
    expect(config.host).toBe('localhost');
  });

  it('prefers an explicit configFile path', async () => {
    const dir = await createTempProject({
      'package.json': JSON.stringify({
        name: 'fixture',
        'tauri-nuxt-dev': { port: 4100 },
      }),
      'custom.config.json': JSON.stringify({ port: 4400 }),
    });

    const config = await loadTauriNuxtDevConfig(dir, path.join(dir, 'custom.config.json'));
    expect(config.port).toBe(4400);
  });
});
