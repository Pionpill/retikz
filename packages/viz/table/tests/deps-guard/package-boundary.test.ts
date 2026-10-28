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
  devDependencies: Readonly<Record<string, string>>;
}>;

const packageDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const manifest = JSON.parse(readFileSync(path.join(packageDirectory, 'package.json'), 'utf8')) as PackageManifest;

describe('@retikz/table 封装边界', () => {
  it('是 Table 发布组中的可发布可视化功能', () => {
    expect(manifest.name).toBe('@retikz/table');
    expect(manifest.retikz).toEqual({
      domain: 'viz',
      releaseGroup: 'table',
      layer: 'feature',
      publishable: true,
    });
  });

  it('仅取决于 Core、Foundation、数据、数学、格式化程序和缩放运行时以及 schema 运行时', () => {
    expect(Object.keys(manifest.dependencies).sort()).toEqual([
      '@retikz/core',
      '@retikz/data',
      '@retikz/foundation',
      '@retikz/math',
      'd3-format',
      'd3-scale',
      'zod',
    ]);
    expect(manifest.dependencies['d3-format']).toBe('catalog:');
    expect(manifest.dependencies['d3-scale']).toBe('catalog:');
    expect(manifest.devDependencies['@types/d3-format']).toBe('catalog:');
    expect(manifest.devDependencies['@types/d3-scale']).toBe('catalog:');
    expect(manifest.dependencies).not.toHaveProperty('@retikz/plot');
    expect(manifest.dependencies).not.toHaveProperty('react');
    expect(manifest.dependencies).not.toHaveProperty('react-dom');
  });
});
