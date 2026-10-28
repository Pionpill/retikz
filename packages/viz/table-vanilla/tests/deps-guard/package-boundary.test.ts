import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

type PackageManifest = Readonly<{
  name: string;
  retikz: Readonly<{
    domain: string;
    releaseGroup: string;
    layer: string;
    publishable: boolean;
  }>;
  dependencies: Readonly<Record<string, string>>;
}>;

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const manifest = JSON.parse(readFileSync(path.join(packageDirectory, 'package.json'), 'utf8')) as PackageManifest;

describe('@retikz/table-vanilla 封装边界', () => {
  it('是 Table 发布组中的可发布可视化适配器', () => {
    expect(manifest.name).toBe('@retikz/table-vanilla');
    expect(manifest.retikz).toEqual({
      domain: 'viz',
      releaseGroup: 'table',
      layer: 'adapter',
      publishable: true,
    });
  });

  it('依赖于 Table、Foundation 和内核 Vanilla，而不采用 React 或 Plot 依赖项', () => {
    expect(Object.keys(manifest.dependencies).sort()).toEqual([
      '@retikz/core',
      '@retikz/data',
      '@retikz/foundation',
      '@retikz/table',
      '@retikz/vanilla',
    ]);
    expect(manifest.dependencies).not.toHaveProperty('@retikz/plot');
    expect(manifest.dependencies).not.toHaveProperty('react');
    expect(manifest.dependencies).not.toHaveProperty('react-dom');
  });
});
