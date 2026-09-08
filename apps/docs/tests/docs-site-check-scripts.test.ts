import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type PackageJson = {
  scripts?: Record<string, string>;
};

const readPackageJson = (path: string): PackageJson => JSON.parse(readFileSync(path, 'utf8')) as PackageJson;

describe('Docs site check commands', () => {
  it('exposes static, build, runtime, and aggregate checks from the repository root', () => {
    const docsPackage = readPackageJson(resolve(import.meta.dirname, '..', 'package.json'));
    const rootPackage = readPackageJson(resolve(import.meta.dirname, '..', '..', '..', 'package.json'));

    expect(docsPackage.scripts).toMatchObject({
      'check:static': 'node scripts/check-doc-static.mjs',
      'check:build': 'pnpm run build',
      'check:runtime': 'node scripts/check-doc-runtime.mjs',
      'check:site': expect.any(String),
    });
    expect(rootPackage.scripts?.['check:docs']).toContain('@retikz/docs');
  });

  it('runs the static checker from the Docs package directory', () => {
    const result = spawnSync(process.execPath, ['scripts/check-doc-static.mjs', '--scope', '__empty_scope__'], {
      cwd: resolve(import.meta.dirname, '..'),
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Docs integrity passed (0 pages, scope: __empty_scope__).');
  });

  it('exposes an MDX mounted state for the runtime checker', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '..', 'src/modules/docs/components/mdx-content/MdxContent.tsx'),
      'utf8',
    );

    expect(source).toContain('data-doc-content-state="ready"');
    expect(source).toContain('data-doc-content-state="error"');
  });

  it('checks the production Docs manifest instead of a hot-reloading development server', () => {
    const source = readFileSync(resolve(import.meta.dirname, '..', 'scripts/check-doc-runtime.mjs'), 'utf8');

    expect(source).toContain("import { preview } from 'vite'");
    expect(source).toContain("'dist', 'llms', 'manifest.json'");
    expect(source).toContain("base: '/retikz/'");
    expect(source).toContain("locator('[data-doc-content-state]:visible').last().innerText({ timeout: 1_000 })");
  });
});
