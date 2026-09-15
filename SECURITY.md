# Security Policy

## Supported versions

This package is pre-1.0. Security fixes are applied to the latest published release on the `main` branch.

| Version                     | Supported |
| --------------------------- | --------- |
| `main` / latest npm release | Yes       |
| Older releases              | No        |

## Reporting a vulnerability

Please report security issues privately via [GitHub Security Advisories](https://github.com/xcvzmoon/tauri-nuxt-dev/security/advisories/new).

Do not open a public issue for vulnerabilities.

Include:

- A description of the issue and its impact
- Steps to reproduce or a proof of concept
- Affected versions / commit SHAs if known

You should receive an acknowledgement within a few days. Once a fix is available, credit will be given unless you prefer to remain anonymous.

## Scope notes

`tauri-nuxt-dev` is a **local development runner**. It spawns the Tauri CLI and builds a `beforeDevCommand` shell string for the platform shell. Highest-priority reports are those that:

- Allow command injection through config, CLI flags, or environment variables
- Bypass port/host validation in a way that produces a dangerous `devUrl` or bind address
- Compromise the npm publish pipeline or package contents
