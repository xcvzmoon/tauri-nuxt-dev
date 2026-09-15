import type { TauriNuxtDevConfig, TauriNuxtDevOptions } from './types.ts';
import { loadConfig, setupDotenv } from 'c12';
import process from 'node:process';

/**
 * Built-in defaults used when neither the CLI, a config file, nor
 * `package.json` sets a field.
 *
 * Port resolution still understands `NUXT_PORT` / `PORT` after these defaults.
 */
export const defaults: TauriNuxtDevConfig = {};

/**
 * Identity helper that types a dev config for your editor.
 *
 * It does not change the object at runtime — it only enables autocomplete
 * and catches typos inside `defineConfig({ … })`.
 *
 * The return type is intentionally {@link TauriNuxtDevConfig} (not c12’s
 * `InputConfig`), so consumer `declaration` emit stays portable under pnpm
 * even when `c12` is not hoisted to the project root.
 *
 * @returns The same object you passed in.
 *
 * @example `tauri-nuxt-dev.config.ts`
 * ```ts
 * import { defineConfig } from 'tauri-nuxt-dev';
 *
 * export default defineConfig({
 *   port: 3000,
 *   host: '0.0.0.0',
 *   nuxt: 'vpr',
 * });
 * ```
 */
export function defineConfig(config: TauriNuxtDevConfig): TauriNuxtDevConfig {
  return config;
}

/** Pick only the file-config fields that are actually set (skip `undefined`). */
export function toConfigOverrides(options: TauriNuxtDevOptions): TauriNuxtDevConfig {
  const overrides: TauriNuxtDevConfig = {};

  if (options.port !== undefined) {
    overrides.port = options.port;
  }
  if (options.portRange !== undefined) {
    overrides.portRange = options.portRange;
  }
  if (options.host !== undefined) {
    overrides.host = options.host;
  }
  if (options.nuxt !== undefined) {
    overrides.nuxt = options.nuxt;
  }
  if (options.tauriArgs !== undefined) {
    overrides.tauriArgs = options.tauriArgs;
  }

  return overrides;
}

/**
 * Load the effective dev config for a project.
 *
 * Resolution order (later wins):
 * 1. {@link defaults}
 * 2. `"tauri-nuxt-dev"` key in that directory’s `package.json`
 * 3. C12 config file (`tauri-nuxt-dev.config.ts` / `.js` / `.mjs` / `.cjs` / `.json`,
 *    or `configFile` when given)
 * 4. `overrides` you pass here (CLI flags in the binary go through this)
 *
 * Also loads `.env` from `cwd` into `process.env` without overwriting
 * variables that are already set. Secrets still belong in the environment —
 * not in config files.
 *
 * @param cwd - Project root to load config from.
 * @param configFile - Optional explicit path to a C12 config file.
 * @param overrides - Highest-priority values (for example CLI flags).
 * @returns The fully merged config object.
 * @throws May reject if the config file throws or cannot be loaded.
 *
 * @example Read what a project already configured
 * ```ts
 * import { loadTauriNuxtDevConfig } from 'tauri-nuxt-dev';
 *
 * const config = await loadTauriNuxtDevConfig(process.cwd());
 * console.log(config.port ?? 3000);
 * ```
 *
 * @example Force a port from a script
 * ```ts
 * import { loadTauriNuxtDevConfig } from 'tauri-nuxt-dev';
 *
 * const config = await loadTauriNuxtDevConfig(process.cwd(), undefined, {
 *   port: 4000,
 * });
 * // config.port === 4000 even if the file set another port
 * ```
 */
export async function loadTauriNuxtDevConfig(
  cwd: string = process.cwd(),
  configFile?: string,
  overrides?: TauriNuxtDevConfig,
): Promise<TauriNuxtDevConfig> {
  await setupDotenv({ cwd });
  return (
    await loadConfig<TauriNuxtDevConfig>({
      name: 'tauri-nuxt-dev',
      cwd,
      configFile,
      packageJson: 'tauri-nuxt-dev',
      defaults,
      overrides,
      rcFile: false,
      globalRc: false,
    })
  ).config;
}
