import { defineConfig } from 'genbumppush';

export default defineConfig({
  release: 'patch',
  hooks: {
    before: ['pnpm check', 'pnpm typecheck', 'pnpm test'],
  },
  github: {
    enabled: true,
  },
});
