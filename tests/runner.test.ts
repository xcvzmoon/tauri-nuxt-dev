import { mkdtemp, mkdir, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { tauriNuxtDev } from '../src/runner.ts';
import { resolveTauriCli } from '../src/tauri-cli.ts';

const tempDirs: string[] = [];

async function createTempProject(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'tauri-nuxt-dev-runner-'));
  tempDirs.push(dir);
  await Promise.all(
    Object.entries(files).map(async ([relative, contents]) => {
      const target = path.join(dir, relative);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, contents, 'utf8');
    }),
  );
  return dir;
}

/**
 * Install a local @tauri-apps/cli that records argv (and optionally stays alive
 * for signal tests). Uses the real spawn path — no child_process mocks.
 */
async function installFakeTauriCli(
  dir: string,
  mode: 'exit0' | 'exit2' | 'stay-alive',
): Promise<string> {
  const outFile = path.join(dir, 'tauri-argv.json');
  const body =
    mode === 'stay-alive'
      ? `import { writeFileSync } from 'node:fs';
writeFileSync(${JSON.stringify(outFile)}, JSON.stringify(process.argv.slice(2)));
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
setInterval(() => {}, 1000);
`
      : `import { writeFileSync } from 'node:fs';
writeFileSync(${JSON.stringify(outFile)}, JSON.stringify(process.argv.slice(2)));
process.exit(${mode === 'exit2' ? 2 : 0});
`;

  await mkdir(path.join(dir, 'node_modules', '@tauri-apps', 'cli'), { recursive: true });
  await writeFile(
    path.join(dir, 'node_modules/@tauri-apps/cli/package.json'),
    JSON.stringify({ name: '@tauri-apps/cli', bin: { tauri: 'tauri.mjs' } }),
    'utf8',
  );
  await writeFile(path.join(dir, 'node_modules/@tauri-apps/cli/tauri.mjs'), body, 'utf8');
  return outFile;
}

async function readArgv(outFile: string): Promise<string[]> {
  const { readFile } = await import('node:fs/promises');
  const raw = await readFile(outFile, 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed) || !parsed.every((v) => typeof v === 'string')) {
    throw new Error(`Unexpected argv payload: ${raw}`);
  }
  return parsed;
}

interface TauriConfigPayload {
  build: { devUrl: string; beforeDevCommand: string };
}

function parseTauriConfig(raw: string): TauriConfigPayload {
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null || !('build' in parsed)) {
    throw new Error(`Unexpected tauri --config payload: ${raw}`);
  }
  const { build } = parsed;
  if (
    typeof build !== 'object' ||
    build === null ||
    !('devUrl' in build) ||
    !('beforeDevCommand' in build) ||
    typeof build.devUrl !== 'string' ||
    typeof build.beforeDevCommand !== 'string'
  ) {
    throw new Error(`Unexpected tauri --config payload: ${raw}`);
  }
  return { build: { devUrl: build.devUrl, beforeDevCommand: build.beforeDevCommand } };
}

function silentLogger() {
  return { info: () => {}, warn: () => {}, error: () => {} };
}

async function baseProject(): Promise<string> {
  return createTempProject({
    'package.json': JSON.stringify({
      name: 'fixture',
      packageManager: 'pnpm@12.4.1',
      scripts: { 'nuxt:dev': 'nuxt dev' },
    }),
  });
}

afterAll(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('resolveTauriCli local package', () => {
  it('resolves a local @tauri-apps/cli bin via node', async () => {
    const dir = await baseProject();
    await installFakeTauriCli(dir, 'exit0');

    const resolved = resolveTauriCli(dir);
    expect(resolved.source).toBe('local');
    expect(resolved.command).toBe(process.execPath);
    const expected = path.join(dir, 'node_modules', '@tauri-apps', 'cli', 'tauri.mjs');
    const entry = resolved.prefixArgs[0];
    expect(entry).toBeDefined();
    // macOS tmpdir may be /var vs /private/var — compare real paths.
    await expect(realpath(entry)).resolves.toBe(await realpath(expected));
  });

  it('falls back to PATH when the bin entry is missing on disk', async () => {
    const dir = await createTempProject({
      'package.json': JSON.stringify({ name: 'fixture' }),
      'node_modules/@tauri-apps/cli/package.json': JSON.stringify({
        name: '@tauri-apps/cli',
        bin: { tauri: 'missing.js' },
      }),
    });

    const resolved = resolveTauriCli(dir);
    expect(resolved.source).toBe('path');
  });
});

describe('tauriNuxtDev runner', () => {
  it('spawns tauri dev with a resolved port and shell:false', { timeout: 15_000 }, async () => {
    const dir = await baseProject();
    const outFile = await installFakeTauriCli(dir, 'exit0');

    const code = await tauriNuxtDev({
      cwd: dir,
      port: 45_400,
      logger: silentLogger(),
    });

    expect(code).toBe(0);
    const argv = await readArgv(outFile);
    expect(argv[0]).toBe('dev');
    expect(argv[1]).toBe('--config');
    const configArg = argv[2];
    expect(configArg).toBeDefined();
    const configJson = parseTauriConfig(configArg);
    expect(configJson.build.devUrl).toBe('http://localhost:45400');
    expect(configJson.build.beforeDevCommand).toContain('--port');
    expect(configJson.build.beforeDevCommand).toContain('45400');
  });

  it(
    'maps wildcard host to localhost in devUrl and passes --host to nuxt',
    { timeout: 15_000 },
    async () => {
      const dir = await baseProject();
      const outFile = await installFakeTauriCli(dir, 'exit0');

      await tauriNuxtDev({
        cwd: dir,
        port: 45_410,
        host: '0.0.0.0',
        logger: silentLogger(),
      });

      const argv = await readArgv(outFile);
      const configArg = argv[2];
      expect(configArg).toBeDefined();
      const configJson = parseTauriConfig(configArg);
      expect(configJson.build.devUrl).toBe('http://localhost:45410');
      expect(configJson.build.beforeDevCommand).toContain('--host');
      expect(configJson.build.beforeDevCommand).toContain('0.0.0.0');
    },
  );

  it('forwards tauriArgs after --config', { timeout: 15_000 }, async () => {
    const dir = await baseProject();
    const outFile = await installFakeTauriCli(dir, 'exit0');

    await tauriNuxtDev({
      cwd: dir,
      port: 45_420,
      tauriArgs: ['--features', 'debug'],
      logger: silentLogger(),
    });

    const argv = await readArgv(outFile);
    expect(argv.slice(-2)).toEqual(['--features', 'debug']);
  });

  it('resolves 0 when the child exits on SIGINT', { timeout: 15_000 }, async () => {
    const dir = await baseProject();
    await installFakeTauriCli(dir, 'stay-alive');

    const controller = new AbortController();
    const exitPromise = tauriNuxtDev({
      cwd: dir,
      port: 45_430,
      signal: controller.signal,
      logger: silentLogger(),
    });

    // Abort after the child has had a moment to start.
    setTimeout(() => {
      controller.abort();
    }, 200);
    await expect(exitPromise).resolves.toBe(0);
  });

  it('rejects and logs when spawn fails (tauri not on PATH)', { timeout: 15_000 }, async () => {
    const dir = await baseProject();
    const errors: string[] = [];

    // No local CLI → resolveTauriCli falls back to `tauri` on PATH.
    // In CI/local without tauri installed, spawn emits ENOENT.
    await expect(
      tauriNuxtDev({
        cwd: dir,
        port: 45_450,
        env: { PATH: '/nonexistent-bin-dir' },
        logger: { info: () => {}, warn: () => {}, error: (m) => errors.push(m) },
      }),
    ).rejects.toThrow();
    expect(errors.length).toBeGreaterThan(0);
  });

  it('returns the child exit code when non-zero', { timeout: 15_000 }, async () => {
    const dir = await baseProject();
    await installFakeTauriCli(dir, 'exit2');

    const code = await tauriNuxtDev({
      cwd: dir,
      port: 45_460,
      logger: silentLogger(),
    });
    expect(code).toBe(2);
  });
});
