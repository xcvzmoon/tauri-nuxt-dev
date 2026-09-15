export type LogLevel = 'info' | 'warn' | 'error';

export interface Logger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

export interface ResolvePortOptions {
  /** Preferred port. Defaults to `NUXT_PORT` or `3000`. */
  port?: number | undefined;
  /** Inclusive fallback range scanned when the preferred port is busy. */
  portRange?: readonly [fromInclusive: number, toInclusive: number] | undefined;
  /** Host used when checking port availability. */
  host?: string | undefined;
  /** Unique name used by get-port-please for port memoization. */
  name?: string | undefined;
}

export interface PackageManagerInfo {
  name: PackageManagerName;
  /** Absolute path to the package.json that was inspected, when available. */
  packageJsonPath?: string | undefined;
  /** Scripts map from package.json, when available. */
  scripts?: Record<string, string> | undefined;
}

export type PackageManagerName = 'bun' | 'npm' | 'pnpm' | 'yarn';

export interface NuxtDevCommandOptions {
  /** Fully override the Nuxt dev command (template parts). */
  command?: readonly string[] | undefined;
  /** Package manager used to run the `nuxt:dev` script. */
  packageManager?: PackageManagerName | undefined;
  /** Path used to resolve package.json / lockfiles. Defaults to `process.cwd()`. */
  cwd?: string | undefined;
  /** Port passed to Nuxt. */
  port: number;
  /** Optional host passed to Nuxt (`--host`). */
  host?: string | undefined;
}

export interface TauriDevConfig {
  build: {
    devUrl: string;
    beforeDevCommand: string;
  };
}

export interface BuildTauriConfigOptions {
  port: number;
  /** Host used in `devUrl`. Defaults to `localhost`. */
  host?: string | undefined;
  /** Shell command Tauri runs before the dev server is considered ready. */
  beforeDevCommand: string;
}

export interface ResolveTauriCliResult {
  /** Executable to spawn (`node` when a local JS CLI entry is used). */
  command: string;
  /** Args prepended before the Tauri subcommand (local CLI entry path). */
  prefixArgs: readonly string[];
  /** Where the CLI was resolved from. */
  source: 'local' | 'path';
}

/**
 * User-facing configuration for `tauri-nuxt-dev.config.*` and the
 * `"tauri-nuxt-dev"` key in `package.json`.
 *
 * Prefer {@link defineConfig} in a config file so your editor can check the shape.
 */
export interface TauriNuxtDevConfig {
  /**
   * Preferred Nuxt port.
   * @defaultValue `NUXT_PORT` / `PORT` / `3000`
   */
  port?: number | undefined;
  /**
   * Inclusive fallback range scanned when the preferred port is busy.
   * @defaultValue `[port, port + 99]`
   */
  portRange?: readonly [fromInclusive: number, toInclusive: number] | undefined;
  /** Host for port checks, Nuxt `--host`, and `devUrl`. */
  host?: string | undefined;
  /**
   * How to start Nuxt.
   * - omit: package-manager aware `nuxt:dev` script, or `nuxt dev`
   * - string: single binary (e.g. `nuxt` or `vpr`)
   * - string[]: full argv for the Nuxt starter
   */
  nuxt?: string | readonly string[] | undefined;
  /** Extra args forwarded to `tauri dev`. */
  tauriArgs?: readonly string[] | undefined;
}

/**
 * Runtime options for {@link tauriNuxtDev}.
 *
 * File-config fields are highest-priority overrides on top of c12 loading.
 * Runtime-only fields (`cwd`, `configFile`, `env`, `logger`, `signal`) are
 * never read from a config file.
 */
export interface TauriNuxtDevOptions extends TauriNuxtDevConfig {
  /** Working directory used for config discovery and spawn. Defaults to `process.cwd()`. */
  cwd?: string | undefined;
  /** Explicit C12 config file path. Overrides discovery and `package.json`. */
  configFile?: string | undefined;
  /** Extra env for the Tauri child process (merged over `process.env`). */
  env?: NodeJS.ProcessEnv | undefined;
  /** Logger used for port fallback notices and spawn errors. */
  logger?: Logger | undefined;
  /** Optional abort signal to stop the child process. */
  signal?: AbortSignal | undefined;
}
