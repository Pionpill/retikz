import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

type PackageManifest = {
  private?: boolean;
  retikz?: {
    domain?: string;
    layer?: string;
    publishable?: boolean;
    releaseGroup?: string;
  };
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const readManifest = async (relativeUrl: string): Promise<PackageManifest> =>
  JSON.parse(await readFile(new URL(relativeUrl, import.meta.url), 'utf8')) as PackageManifest;

const commonDevDependencies = {
  '@types/node': 'catalog:',
  typescript: 'catalog:',
  vite: 'catalog:',
  'vite-plugin-dts': 'catalog:',
  vitest: 'catalog:',
};

describe('private Chart package boundaries', () => {
  it('keeps the core package private with its exact dependency map', async () => {
    const manifest = await readManifest('../package.json');

    expect(manifest.private).toBe(true);
    expect(manifest.retikz).toEqual({ domain: 'viz', layer: 'feature', publishable: false });
    expect(manifest.retikz).not.toHaveProperty('releaseGroup');
    expect(manifest.dependencies).toEqual({
      '@retikz/core': 'workspace:^',
      '@retikz/data': 'workspace:^',
      '@retikz/foundation': 'workspace:^',
      '@retikz/plot': 'workspace:*',
      '@retikz/standard': 'workspace:^',
      zod: 'catalog:',
    });
    expect(manifest.peerDependencies).toBeUndefined();
    expect(manifest.devDependencies).toEqual(commonDevDependencies);
  });

  it('keeps the React adapter private, empty, and free of runtime aggregation', async () => {
    const manifest = await readManifest('../../chart-react/package.json');
    const adapter = await import('../../chart-react/src/index');

    expect(manifest.private).toBe(true);
    expect(manifest.retikz).toEqual({ domain: 'viz', layer: 'adapter', publishable: false });
    expect(manifest.retikz).not.toHaveProperty('releaseGroup');
    expect(manifest.dependencies).toEqual({
      '@retikz/chart': 'workspace:*',
      '@retikz/plot-react': 'workspace:*',
    });
    expect(manifest.peerDependencies).toEqual({ react: '>=18', 'react-dom': '>=18' });
    expect(manifest.devDependencies).toEqual({
      '@types/node': 'catalog:',
      '@types/react': 'catalog:',
      '@types/react-dom': 'catalog:',
      react: 'catalog:',
      'react-dom': 'catalog:',
      typescript: 'catalog:',
      vite: 'catalog:',
      'vite-plugin-dts': 'catalog:',
      vitest: 'catalog:',
    });
    expect(manifest.dependencies).not.toHaveProperty('@retikz/standard');
    expect(manifest.dependencies).not.toHaveProperty('@retikz/react');
    expect(Object.keys(adapter)).toEqual([]);
  });

  it('keeps the Vanilla adapter private, empty, and free of identity bypasses', async () => {
    const manifest = await readManifest('../../chart-vanilla/package.json');
    const adapter = await import('../../chart-vanilla/src/index');

    expect(manifest.private).toBe(true);
    expect(manifest.retikz).toEqual({ domain: 'viz', layer: 'adapter', publishable: false });
    expect(manifest.retikz).not.toHaveProperty('releaseGroup');
    expect(manifest.dependencies).toEqual({
      '@retikz/chart': 'workspace:*',
      '@retikz/plot-vanilla': 'workspace:*',
    });
    expect(manifest.peerDependencies).toBeUndefined();
    expect(manifest.devDependencies).toEqual(commonDevDependencies);
    expect(manifest.dependencies).not.toHaveProperty('@retikz/standard');
    expect(manifest.dependencies).not.toHaveProperty('@retikz/vanilla');
    expect(Object.keys(adapter)).toEqual([]);
  });
});
