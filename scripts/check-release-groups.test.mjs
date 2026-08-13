import assert from 'node:assert/strict';
import test from 'node:test';

import {
  readPackageRecords,
  validateEsmPublishContract,
  validateReleaseGroupPackages,
} from './check-release-groups.mjs';
import { releaseGroups } from './release-groups.config.mjs';

const createRootPublishContract = () => ({
  type: 'module',
  engines: {
    node: '>=24',
  },
  exports: {
    '.': './src/index.ts',
  },
  publishConfig: {
    main: './dist/index.js',
    module: './dist/index.js',
    types: './dist/types/index.d.ts',
    exports: {
      '.': {
        types: './dist/types/index.d.ts',
        import: './dist/index.js',
        default: './dist/index.js',
      },
    },
  },
});

const baseGroups = {
  kernel: {
    domain: 'kernel',
    kind: 'foundation',
    packages: ['@retikz/math', '@retikz/core'],
  },
  data: {
    domain: 'viz',
    kind: 'foundation',
    packages: ['@retikz/data'],
  },
  standard: {
    domain: 'library',
    kind: 'feature',
    packages: ['@retikz/standard'],
  },
  layout: {
    domain: 'library',
    kind: 'feature',
    packages: ['@retikz/layout', '@retikz/layout-react', '@retikz/layout-vanilla'],
  },
  notation: {
    domain: 'diagram',
    kind: 'foundation',
    packages: ['@retikz/notation', '@retikz/notation-react', '@retikz/notation-vanilla'],
  },
  plot: {
    domain: 'viz',
    kind: 'feature',
    packages: ['@retikz/plot', '@retikz/plot-react'],
  },
  table: {
    domain: 'viz',
    kind: 'feature',
    packages: ['@retikz/table', '@retikz/table-react', '@retikz/table-vanilla'],
  },
};

const basePackages = [
  {
    path: 'packages/kernel/math/package.json',
    manifest: {
      ...createRootPublishContract(),
      name: '@retikz/math',
      version: '0.4.0-beta.1',
      retikz: {
        domain: 'kernel',
        releaseGroup: 'kernel',
        publishable: true,
      },
    },
  },
  {
    path: 'packages/kernel/core/package.json',
    manifest: {
      ...createRootPublishContract(),
      name: '@retikz/core',
      version: '0.4.0-beta.1',
      retikz: {
        domain: 'kernel',
        releaseGroup: 'kernel',
        publishable: true,
      },
      dependencies: {
        '@retikz/math': 'workspace:*',
      },
    },
  },
  {
    path: 'packages/viz/data/package.json',
    manifest: {
      ...createRootPublishContract(),
      name: '@retikz/data',
      version: '0.1.0-beta.1',
      retikz: {
        domain: 'viz',
        releaseGroup: 'data',
        publishable: true,
      },
      dependencies: {
        '@retikz/core': 'workspace:^',
      },
    },
  },
  {
    path: 'packages/library/layout/package.json',
    manifest: {
      ...createRootPublishContract(),
      name: '@retikz/layout',
      version: '0.1.0-alpha.1',
      retikz: {
        domain: 'library',
        releaseGroup: 'layout',
        publishable: true,
      },
    },
  },
  {
    path: 'packages/library/layout-react/package.json',
    manifest: {
      ...createRootPublishContract(),
      name: '@retikz/layout-react',
      version: '0.1.0-alpha.1',
      retikz: {
        domain: 'library',
        releaseGroup: 'layout',
        publishable: true,
      },
      dependencies: {
        '@retikz/layout': 'workspace:*',
      },
    },
  },
  {
    path: 'packages/library/layout-vanilla/package.json',
    manifest: {
      ...createRootPublishContract(),
      name: '@retikz/layout-vanilla',
      version: '0.1.0-alpha.1',
      retikz: {
        domain: 'library',
        releaseGroup: 'layout',
        publishable: true,
      },
      dependencies: {
        '@retikz/layout': 'workspace:*',
      },
    },
  },
  {
    path: 'packages/library/standard/package.json',
    manifest: {
      ...createRootPublishContract(),
      name: '@retikz/standard',
      version: '0.1.0-alpha.2',
      retikz: {
        domain: 'library',
        releaseGroup: 'standard',
        publishable: true,
      },
      dependencies: {
        '@retikz/layout': 'workspace:^',
      },
    },
  },
  {
    path: 'packages/diagram/notation/package.json',
    manifest: {
      ...createRootPublishContract(),
      name: '@retikz/notation',
      version: '0.1.0-alpha.1',
      retikz: {
        domain: 'diagram',
        releaseGroup: 'notation',
        publishable: true,
      },
      dependencies: {
        '@retikz/core': 'workspace:^',
        '@retikz/math': 'workspace:^',
        '@retikz/layout': 'workspace:^',
      },
    },
  },
  {
    path: 'packages/diagram/notation-react/package.json',
    manifest: {
      ...createRootPublishContract(),
      name: '@retikz/notation-react',
      version: '0.1.0-alpha.1',
      retikz: {
        domain: 'diagram',
        releaseGroup: 'notation',
        publishable: true,
      },
      dependencies: {
        '@retikz/notation': 'workspace:*',
        '@retikz/react': 'workspace:^',
      },
    },
  },
  {
    path: 'packages/diagram/notation-vanilla/package.json',
    manifest: {
      ...createRootPublishContract(),
      name: '@retikz/notation-vanilla',
      version: '0.1.0-alpha.1',
      retikz: {
        domain: 'diagram',
        releaseGroup: 'notation',
        publishable: true,
      },
      dependencies: {
        '@retikz/notation': 'workspace:*',
        '@retikz/vanilla': 'workspace:^',
      },
    },
  },
  {
    path: 'packages/viz/plot/package.json',
    manifest: {
      ...createRootPublishContract(),
      name: '@retikz/plot',
      version: '0.1.0-beta.1',
      retikz: {
        domain: 'viz',
        releaseGroup: 'plot',
        publishable: true,
      },
      dependencies: {
        '@retikz/data': 'workspace:^',
        '@retikz/layout': 'workspace:^',
      },
    },
  },
  {
    path: 'packages/viz/plot-react/package.json',
    manifest: {
      ...createRootPublishContract(),
      name: '@retikz/plot-react',
      version: '0.1.0-beta.1',
      retikz: {
        domain: 'viz',
        releaseGroup: 'plot',
        publishable: true,
      },
      dependencies: {
        '@retikz/data': 'workspace:^',
        '@retikz/plot': 'workspace:*',
      },
    },
  },
  {
    path: 'packages/viz/table/package.json',
    manifest: {
      ...createRootPublishContract(),
      name: '@retikz/table',
      version: '0.1.0-beta.1',
      retikz: {
        domain: 'viz',
        releaseGroup: 'table',
        publishable: true,
      },
      dependencies: {
        '@retikz/data': 'workspace:^',
      },
    },
  },
  {
    path: 'packages/viz/table-react/package.json',
    manifest: {
      ...createRootPublishContract(),
      name: '@retikz/table-react',
      version: '0.1.0-beta.1',
      retikz: {
        domain: 'viz',
        releaseGroup: 'table',
        publishable: true,
      },
      dependencies: {
        '@retikz/data': 'workspace:^',
        '@retikz/table': 'workspace:*',
      },
    },
  },
  {
    path: 'packages/viz/table-vanilla/package.json',
    manifest: {
      ...createRootPublishContract(),
      name: '@retikz/table-vanilla',
      version: '0.1.0-beta.1',
      retikz: {
        domain: 'viz',
        releaseGroup: 'table',
        publishable: true,
      },
      dependencies: {
        '@retikz/data': 'workspace:^',
        '@retikz/table': 'workspace:*',
      },
    },
  },
];

test('valid root and subpath ESM publish contracts have no diagnostics', () => {
  const rootManifest = {
    ...createRootPublishContract(),
    name: '@retikz/core',
  };
  const renderSubpaths = ['./svg', './canvas', './canvas-node', './hydration', './animation'];
  const renderManifest = {
    name: '@retikz/render',
    type: 'module',
    engines: {
      node: '>=24',
    },
    exports: Object.fromEntries(renderSubpaths.map(subpath => [subpath, `./src/${subpath.slice(2)}/index.ts`])),
    publishConfig: {
      exports: Object.fromEntries(
        renderSubpaths.map(subpath => [
          subpath,
          {
            types: `./dist/types/${subpath.slice(2)}/index.d.ts`,
            import: `./dist/${subpath.slice(2)}/index.js`,
            default: `./dist/${subpath.slice(2)}/index.js`,
          },
        ]),
      ),
    },
  };

  assert.deepEqual(validateEsmPublishContract(rootManifest), []);
  assert.deepEqual(validateEsmPublishContract(renderManifest), []);
});

test('legacy or inconsistent ESM publish contracts are reported', () => {
  const invalidCases = [
    {
      label: 'package type',
      mutate: manifest => {
        manifest.type = 'commonjs';
      },
      expected: 'type',
    },
    {
      label: 'Node engine',
      mutate: manifest => {
        manifest.engines.node = '>=20';
      },
      expected: 'engines.node',
    },
    {
      label: 'require condition',
      mutate: manifest => {
        manifest.publishConfig.exports['.'].require = './dist/index.cjs';
      },
      expected: 'require',
    },
    {
      label: 'CJS path',
      mutate: manifest => {
        manifest.publishConfig.exports['.'].default = './dist/index.cjs';
      },
      expected: '.cjs',
    },
    {
      label: 'dist/es path',
      mutate: manifest => {
        manifest.publishConfig.exports['.'].import = './dist/es/index.js';
      },
      expected: './dist/index.js',
    },
    {
      label: 'dist/lib path',
      mutate: manifest => {
        manifest.publishConfig.main = './dist/lib/index.cjs';
      },
      expected: 'publishConfig.main',
    },
    {
      label: 'source and publish subpaths',
      mutate: manifest => {
        manifest.exports['./extra'] = './src/extra/index.ts';
      },
      expected: 'export keys',
    },
    {
      label: 'condition ordering',
      mutate: manifest => {
        manifest.publishConfig.exports['.'] = {
          import: './dist/index.js',
          types: './dist/types/index.d.ts',
          default: './dist/index.js',
        };
      },
      expected: 'condition order',
    },
    {
      label: 'root field synchronization',
      mutate: manifest => {
        manifest.publishConfig.types = './dist/index.d.ts';
      },
      expected: 'publishConfig.types',
    },
  ];

  for (const invalidCase of invalidCases) {
    const manifest = {
      ...structuredClone(createRootPublishContract()),
      name: '@retikz/core',
    };
    invalidCase.mutate(manifest);

    assert.ok(
      validateEsmPublishContract(manifest).some(diagnostic => diagnostic.includes(invalidCase.expected)),
      invalidCase.label,
    );
  }
});

test('packages without a root export reject publish-time root fields', () => {
  const manifest = {
    name: '@retikz/render',
    type: 'module',
    engines: {
      node: '>=24',
    },
    exports: {
      './svg': './src/svg/index.ts',
    },
    publishConfig: {
      main: './dist/index.js',
      exports: {
        './svg': {
          types: './dist/types/svg/index.d.ts',
          import: './dist/svg/index.js',
          default: './dist/svg/index.js',
        },
      },
    },
  };

  assert.ok(validateEsmPublishContract(manifest).some(diagnostic => diagnostic.includes('must not declare')));
});

test('valid package topology has no release group diagnostics', () => {
  const diagnostics = validateReleaseGroupPackages({
    releaseGroups: baseGroups,
    packageRecords: basePackages,
  });

  assert.deepEqual(diagnostics, []);
});

test('cross-group workspace:* dependency is reported', () => {
  const packages = structuredClone(basePackages);
  packages.find(({ manifest }) => manifest.name === '@retikz/plot').manifest.dependencies['@retikz/data'] =
    'workspace:*';

  const diagnostics = validateReleaseGroupPackages({
    releaseGroups: baseGroups,
    packageRecords: packages,
  });

  assert.ok(
    diagnostics.some(diagnostic => diagnostic.includes('@retikz/plot depends on @retikz/data with workspace:*')),
  );
});

test('viz feature release groups can depend on library feature release groups', () => {
  const packages = structuredClone(basePackages);
  packages.find(({ manifest }) => manifest.name === '@retikz/plot').manifest.dependencies['@retikz/standard'] =
    'workspace:^';

  const diagnostics = validateReleaseGroupPackages({
    releaseGroups: baseGroups,
    packageRecords: packages,
  });

  assert.deepEqual(diagnostics, []);
});

const chartGroup = dependsOn => ({
  domain: 'viz',
  kind: 'feature',
  ...(dependsOn === undefined ? {} : { dependsOn }),
  packages: ['@retikz/chart'],
});

const chartPackage = dependencies => ({
  path: 'packages/viz/chart/package.json',
  manifest: {
    ...createRootPublishContract(),
    name: '@retikz/chart',
    version: '0.1.0-alpha.1',
    retikz: {
      domain: 'viz',
      releaseGroup: 'chart',
      publishable: true,
    },
    ...(dependencies === undefined ? {} : { dependencies }),
  },
});

const withChartTopology = ({ dependsOn, dependencies } = {}) => ({
  releaseGroups: { ...baseGroups, chart: chartGroup(dependsOn) },
  packageRecords: [...structuredClone(basePackages), chartPackage(dependencies)],
});

test('an explicit Chart-to-Plot feature dependency is valid when a package consumes Plot', () => {
  const { releaseGroups, packageRecords } = withChartTopology({
    dependsOn: ['plot'],
    dependencies: { '@retikz/plot': 'workspace:^' },
  });

  assert.deepEqual(validateReleaseGroupPackages({ releaseGroups, packageRecords }), []);
});

test('an explicit feature dependency must name an existing release group', () => {
  const { releaseGroups, packageRecords } = withChartTopology({ dependsOn: ['missing'] });
  const diagnostics = validateReleaseGroupPackages({ releaseGroups, packageRecords });

  assert.ok(diagnostics.some(diagnostic => diagnostic.includes('chart dependsOn references unknown group missing')));
});

test('an explicit feature dependency must not repeat a release group', () => {
  const { releaseGroups, packageRecords } = withChartTopology({
    dependsOn: ['plot', 'plot'],
    dependencies: { '@retikz/plot': 'workspace:^' },
  });
  const diagnostics = validateReleaseGroupPackages({ releaseGroups, packageRecords });

  assert.ok(
    diagnostics.some(diagnostic => diagnostic.includes('chart dependsOn must not contain duplicate group plot')),
  );
});

test('an explicit feature dependency must not target its own release group', () => {
  const { releaseGroups, packageRecords } = withChartTopology({ dependsOn: ['chart'] });
  const diagnostics = validateReleaseGroupPackages({ releaseGroups, packageRecords });

  assert.ok(diagnostics.some(diagnostic => diagnostic.includes('chart dependsOn must not reference itself')));
});

test('the explicit feature dependency graph must be acyclic', () => {
  const { releaseGroups, packageRecords } = withChartTopology({
    dependsOn: ['plot'],
    dependencies: { '@retikz/plot': 'workspace:^' },
  });
  releaseGroups.plot.dependsOn = ['chart'];
  packageRecords.find(({ manifest }) => manifest.name === '@retikz/plot').manifest.dependencies['@retikz/chart'] =
    'workspace:^';

  const diagnostics = validateReleaseGroupPackages({ releaseGroups, packageRecords });

  assert.ok(diagnostics.some(diagnostic => diagnostic.includes('release group dependsOn contains a cycle')));
});

test('an explicit feature dependency must be backed by a real package dependency', () => {
  const { releaseGroups, packageRecords } = withChartTopology({ dependsOn: ['plot'] });
  const diagnostics = validateReleaseGroupPackages({ releaseGroups, packageRecords });

  assert.ok(
    diagnostics.some(diagnostic =>
      diagnostic.includes('chart dependsOn plot but no package consumes that feature group'),
    ),
  );
});

test('a real feature dependency must be declared directly by its release group', () => {
  const { releaseGroups, packageRecords } = withChartTopology({
    dependencies: { '@retikz/plot': 'workspace:^' },
  });
  const diagnostics = validateReleaseGroupPackages({ releaseGroups, packageRecords });

  assert.ok(diagnostics.some(diagnostic => diagnostic.includes('chart has an undeclared feature dependency on plot')));
});

test('Foundation belongs to the kernel release group with its Zod-only publish contract', async () => {
  assert.ok(releaseGroups.kernel.packages.includes('@retikz/foundation'));

  const packageRecords = await readPackageRecords();
  const foundationRecord = packageRecords.find(({ manifest }) => manifest.name === '@retikz/foundation');

  assert.ok(foundationRecord, 'Foundation package manifest must be discoverable');
  assert.equal(foundationRecord.manifest.version, '0.5.0-alpha.2');
  assert.equal(foundationRecord.manifest.retikz?.releaseGroup, 'kernel');
  assert.equal(foundationRecord.manifest.sideEffects, false);
  assert.deepEqual(Object.keys(foundationRecord.manifest.exports), ['.']);
  assert.deepEqual(Object.keys(foundationRecord.manifest.publishConfig.exports), ['.']);
  assert.deepEqual(foundationRecord.manifest.dependencies ?? {}, { zod: 'catalog:' });
  assert.deepEqual(foundationRecord.manifest.peerDependencies ?? {}, {});

  const kernelRecords = packageRecords.filter(({ manifest }) => releaseGroups.kernel.packages.includes(manifest.name));
  assert.ok(kernelRecords.length > 0);
  assert.ok(kernelRecords.every(({ manifest }) => manifest.version === foundationRecord.manifest.version));
});
