# Changelog

## v0.0.1


### 🚀 Enhancements

- **types:** Add shared config and option types ([8ab9e71](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/8ab9e71))
- **port:** Resolve free ports with get-port-please ([220c2e8](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/220c2e8))
- **package-manager:** Detect package manager from lockfiles ([9effbc7](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/9effbc7))
- **nuxt-command:** Build package-manager aware beforeDevCommand ([54801f4](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/54801f4))
- **tauri-config:** Build tauri --config override payload ([07206ac](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/07206ac))
- **tauri-cli:** Resolve local @tauri-apps/cli with PATH fallback ([95e56f9](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/95e56f9))
- **config:** Load project settings via c12 ([cf9e02f](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/cf9e02f))
- **runner:** Run tauri dev with automatic port resolution ([5f0216d](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/5f0216d))
- **cli:** Add tauri-nuxt-dev bin ([2c6a893](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/2c6a893))
- Export public library API ([a2d8a55](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/a2d8a55))

### 🩹 Fixes

- **nuxt-command:** Quote beforeDevCommand for cmd.exe on Windows ([1c6e325](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/1c6e325))
- **tauri-config:** Validate devUrl hosts and bracket IPv6 ([7ca3cb9](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/7ca3cb9))
- **runner:** Reuse parsePort for preferred-port logging ([d37d4a1](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/d37d4a1))
- Enforce LF line endings for Windows checkouts ([1944912](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/1944912))

### 📖 Documentation

- Add comprehensive README ([dc99408](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/dc99408))
- Document jiti peer, host validation, and reporting ([43241e7](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/43241e7))

### 🏡 Chore

- Initialize repository ([0bc92f2](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/0bc92f2))
- Add formatter and linter ([181e953](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/181e953))
- Add type checker ([4d59a14](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/4d59a14))
- Add test runner ([30dac69](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/30dac69))
- Add git hooks manager ([3b5e4b4](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/3b5e4b4))
- Add bundler ([9ae27e6](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/9ae27e6))
- Add release script ([9b435fa](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/9b435fa))
- Add placeholder ([b92cd7e](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/b92cd7e))
- **github:** Add actions, renovate, templates, and workflows ([c3c3d8e](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/c3c3d8e))
- **github:** Remove release workflow ([abe844f](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/abe844f))
- **package:** Declare bin, exports, and runtime deps ([7d2df2b](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/7d2df2b))
- **build:** Add cli entry to tsdown ([a6e7af4](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/a6e7af4))
- **package:** Declare engines and optional jiti peer ([46f715c](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/46f715c))
- Drop passWithNoTests and clean gitignore ([afa00d8](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/afa00d8))

### ✅ Tests

- Cover port, config, package manager, and cli ([0683109](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/0683109))
- Cover platform quoting, hosts, and runner spawn ([74855e1](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/74855e1))

### 🤖 CI

- Run checks on linux, windows, and macos ([36c717c](https://github.com/xcvzmoon/tauri-nuxt-dev/commit/36c717c))

### ❤️ Contributors

- Mon Albert Gamil ([@xcvzmoon](https://github.com/xcvzmoon))
