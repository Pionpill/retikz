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
  files?: Array<string>;
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

const packageImportsOf = async (relativeUrl: string): Promise<Array<string>> => {
  const source = await readFile(new URL(relativeUrl, import.meta.url), 'utf8');
  return [...new Set([...source.matchAll(/from ['"](@retikz\/[^'"]+)['"]/g)].map(([, packageName]) => packageName))];
};

const publishablePackageExpectations = {
  chart: {
    manifest: '../package.json',
    source: '../src/index.ts',
    retikz: { domain: 'viz', layer: 'feature', publishable: true, releaseGroup: 'chart' },
    dependencies: {
      '@retikz/core': 'workspace:^',
      '@retikz/data': 'workspace:^',
      '@retikz/foundation': 'workspace:^',
      '@retikz/layout': 'workspace:^',
      '@retikz/plot': 'workspace:^',
      '@retikz/standard': 'workspace:^',
      zod: 'catalog:',
    },
  },
  react: {
    manifest: '../../chart-react/package.json',
    source: '../../chart-react/src/index.ts',
    retikz: { domain: 'viz', layer: 'adapter', publishable: true, releaseGroup: 'chart' },
    dependencies: {
      '@retikz/chart': 'workspace:*',
      '@retikz/core': 'workspace:^',
      '@retikz/data': 'workspace:^',
      '@retikz/layout': 'workspace:^',
      '@retikz/plot': 'workspace:^',
      '@retikz/plot-react': 'workspace:^',
      '@retikz/react': 'workspace:^',
      '@retikz/standard': 'workspace:^',
    },
  },
  vanilla: {
    manifest: '../../chart-vanilla/package.json',
    source: '../../chart-vanilla/src/index.ts',
    retikz: { domain: 'viz', layer: 'adapter', publishable: true, releaseGroup: 'chart' },
    dependencies: {
      '@retikz/chart': 'workspace:*',
      '@retikz/core': 'workspace:^',
      '@retikz/data': 'workspace:^',
      '@retikz/layout': 'workspace:^',
      '@retikz/plot': 'workspace:^',
      '@retikz/plot-vanilla': 'workspace:^',
      '@retikz/standard': 'workspace:^',
      '@retikz/vanilla': 'workspace:^',
    },
  },
} as const;

describe('published Chart release-group boundaries', () => {
  it('publishes the core package with the exact Chart group dependency map', async () => {
    const manifest = await readManifest('../package.json');

    expect(manifest.private).toBeUndefined();
    expect(manifest.retikz).toEqual(publishablePackageExpectations.chart.retikz);
    expect(manifest.dependencies).toEqual(publishablePackageExpectations.chart.dependencies);
    expect(manifest.files).toEqual(['LICENSE', 'README.md', 'dist/**/*']);
    expect(manifest.peerDependencies).toBeUndefined();
    expect(manifest.devDependencies).toEqual(commonDevDependencies);
  });

  it.each([
    ['React', publishablePackageExpectations.react],
    ['Vanilla', publishablePackageExpectations.vanilla],
  ])('declares every %s adapter source import without re-exporting foreign providers', async (_name, expectation) => {
    const manifest = await readManifest(expectation.manifest);
    const source = await readFile(new URL(expectation.source, import.meta.url), 'utf8');
    const importedPackages = await packageImportsOf(expectation.source);

    expect(manifest.private).toBeUndefined();
    expect(manifest.retikz).toEqual(expectation.retikz);
    expect(manifest.dependencies).toEqual(expectation.dependencies);
    expect(manifest.files).toEqual(['LICENSE', 'README.md', 'dist/**/*']);
    expect(Object.keys(expectation.dependencies).sort()).toEqual(importedPackages.sort());
    expect(source).not.toMatch(
      /export\s*(?:\{[^}]*\b(?:SurfaceProvider|FlexLayoutProvider|ChartProvider|PlotProvider)\b|const\s+(?:SurfaceProvider|FlexLayoutProvider|ChartProvider|PlotProvider))/,
    );
  });
});
