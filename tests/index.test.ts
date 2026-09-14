import { expect, it } from 'vitest';
import { name } from '../src/index.ts';

it('exports the package name', () => {
  expect(name).toBe('tauri-nuxt-dev');
});
