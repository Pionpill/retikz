import { readdir, readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

type PackageExport = {
  types: string;
  default: string;
};

type PublishedPackageExport = {
  types: string;
  import: string;
  default: string;
};

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
  exports?: Record<string, PackageExport>;
  publishConfig?: {
    exports?: Record<string, PublishedPackageExport>;
  };
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

const sourceFilesOf = async (directoryUrl: URL): Promise<Array<URL>> => {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async entry => {
      const entryUrl = new URL(entry.name, directoryUrl);
      if (entry.isDirectory()) return sourceFilesOf(new URL(`${entry.name}/`, directoryUrl));
      return entry.isFile() && /\.tsx?$/.test(entry.name) ? [entryUrl] : [];
    }),
  );

  return nestedFiles.flat();
};

const packageImportsOf = async (relativeDirectoryUrl: string): Promise<Array<string>> => {
  const sourceFiles = await sourceFilesOf(new URL(relativeDirectoryUrl, import.meta.url));
  const sources = await Promise.all(sourceFiles.map(sourceFile => readFile(sourceFile, 'utf8')));

  return [
    ...new Set(
      sources.flatMap(source =>
        [...source.matchAll(/from ['"](@retikz\/[^'"]+)['"]/g)].map(([, packageName]) =>
          packageName.split('/').slice(0, 2).join('/'),
        ),
      ),
    ),
  ];
};

const publicProviderExportPattern =
  /export\s*(?:\{[^}]*\b(?:SurfaceProvider|FlexLayoutProvider|ChartProvider|PlotProvider)\b|const\s+(?:SurfaceProvider|FlexLayoutProvider|ChartProvider|PlotProvider)|\*\s+from\s+['"]@retikz\/(?:standard|layout|plot|chart)(?:\/[^'"]+)?['"])/;

const publicSourceOf = async (relativeDirectoryUrl: string): Promise<string> => {
  const sourceFiles = await sourceFilesOf(new URL(relativeDirectoryUrl, import.meta.url));
  const sources = await Promise.all(sourceFiles.map(sourceFile => readFile(sourceFile, 'utf8')));
  return sources.join('\n');
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
    entrySource: '../../chart-react/src/index.ts',
    sourceDirectory: '../../chart-react/src/',
    retikz: { domain: 'viz', layer: 'adapter', publishable: true, releaseGroup: 'chart' },
    dependencies: {
      '@retikz/chart': 'workspace:*',
      '@retikz/chart-vanilla': 'workspace:*',
      '@retikz/core': 'workspace:^',
      '@retikz/data': 'workspace:^',
      '@retikz/foundation': 'workspace:^',
      '@retikz/plot': 'workspace:^',
      '@retikz/plot-react': 'workspace:^',
      '@retikz/react': 'workspace:^',
    },
  },
  vanilla: {
    manifest: '../../chart-vanilla/package.json',
    entrySource: '../../chart-vanilla/src/index.ts',
    sourceDirectory: '../../chart-vanilla/src/',
    retikz: { domain: 'viz', layer: 'adapter', publishable: true, releaseGroup: 'chart' },
    dependencies: {
      '@retikz/chart': 'workspace:*',
      '@retikz/core': 'workspace:^',
      '@retikz/data': 'workspace:^',
      '@retikz/foundation': 'workspace:^',
      '@retikz/plot': 'workspace:^',
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
    expect(manifest.exports).toEqual({
      '.': { types: './src/index.ts', default: './src/index.ts' },
      './point': { types: './src/point/index.ts', default: './src/point/index.ts' },
      './point/bubble': { types: './src/point/bubble/index.ts', default: './src/point/bubble/index.ts' },
      './point/scatter': { types: './src/point/scatter/index.ts', default: './src/point/scatter/index.ts' },
    });
    expect(manifest.publishConfig?.exports).toEqual({
      '.': {
        types: './dist/types/index.d.ts',
        import: './dist/index.js',
        default: './dist/index.js',
      },
      './point': {
        types: './dist/types/point/index.d.ts',
        import: './dist/point/index.js',
        default: './dist/point/index.js',
      },
      './point/bubble': {
        types: './dist/types/point/bubble/index.d.ts',
        import: './dist/point/bubble/index.js',
        default: './dist/point/bubble/index.js',
      },
      './point/scatter': {
        types: './dist/types/point/scatter/index.d.ts',
        import: './dist/point/scatter/index.js',
        default: './dist/point/scatter/index.js',
      },
    });
  });

  it.each([
    ['React', publishablePackageExpectations.react],
    ['Vanilla', publishablePackageExpectations.vanilla],
  ])('declares every %s adapter source import without re-exporting foreign providers', async (_name, expectation) => {
    const manifest = await readManifest(expectation.manifest);
    const importedPackages = await packageImportsOf(expectation.sourceDirectory);
    const publicSource = await publicSourceOf(expectation.sourceDirectory);

    expect(manifest.private).toBeUndefined();
    expect(manifest.retikz).toEqual(expectation.retikz);
    expect(manifest.dependencies).toEqual(expectation.dependencies);
    expect(manifest.files).toEqual(['LICENSE', 'README.md', 'dist/**/*']);
    expect(Object.keys(expectation.dependencies).sort()).toEqual(importedPackages.sort());
    expect(publicSource).not.toMatch(publicProviderExportPattern);
  });

  it.each([
    ['React', publishablePackageExpectations.react, './src/point/index.ts', './dist/point/index.js'],
    ['Vanilla', publishablePackageExpectations.vanilla, './src/point/index.ts', './dist/point/index.js'],
  ])('publishes the %s Point family subpath', async (_name, expectation, sourcePath, distPath) => {
    const manifest = await readManifest(expectation.manifest);

    expect(manifest.exports?.['./point']).toEqual({ types: sourcePath, default: sourcePath });
    expect(manifest.publishConfig?.exports?.['./point']).toEqual({
      types: './dist/types/point/index.d.ts',
      import: distPath,
      default: distPath,
    });
  });

  it.each([
    ['React', publishablePackageExpectations.react, 'ts'],
    ['Vanilla', publishablePackageExpectations.vanilla, 'ts'],
  ])('publishes concrete %s chartType source entries', async (_name, expectation, extension) => {
    const manifest = await readManifest(expectation.manifest);
    for (const chartType of ['bubble', 'scatter']) {
      const sourcePath = `./src/point/${chartType}/index.${extension}`;
      expect(manifest.exports?.[`./point/${chartType}`]).toEqual({ types: sourcePath, default: sourcePath });
      expect(manifest.publishConfig?.exports?.[`./point/${chartType}`]).toEqual({
        types: `./dist/types/point/${chartType}/index.d.ts`,
        import: `./dist/point/${chartType}/index.js`,
        default: `./dist/point/${chartType}/index.js`,
      });
    }
  });
});
