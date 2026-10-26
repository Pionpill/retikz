import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

type PackageJson = {
  scripts?: Record<string, string>;
};

const readPackageJson = (path: string): PackageJson => JSON.parse(readFileSync(path, 'utf8')) as PackageJson;

describe('文档站点检查命令', () => {
  it('公开来自存储库根的静态、构建、运行时和聚合检查', () => {
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

  it('从 Docs 包目录运行静态检查器', () => {
    const result = spawnSync(process.execPath, ['scripts/check-doc-static.mjs', '--scope', '__empty_scope__'], {
      cwd: resolve(import.meta.dirname, '..'),
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Docs integrity passed (0 pages, scope: __empty_scope__).');
  });

  it('向运行时检查器提供 MDX 挂载状态', () => {
    const source = readFileSync(
      resolve(import.meta.dirname, '..', 'src/modules/docs/components/mdx-content/MdxContent.tsx'),
      'utf8',
    );

    expect(source).toContain('data-doc-content-state="ready"');
    expect(source).toContain('data-doc-content-state="error"');
  });

  it('检查生产文档清单而不是热重载开发服务器', () => {
    const source = readFileSync(resolve(import.meta.dirname, '..', 'scripts/check-doc-runtime.mjs'), 'utf8');

    expect(source).toContain("import { preview } from 'vite'");
    expect(source).toContain("'dist', 'llms', 'manifest.json'");
    expect(source).toContain("base: '/retikz/'");
    expect(source).toContain("locator('[data-doc-content-state]:visible').last().innerText({ timeout: 1_000 })");
  });
});
