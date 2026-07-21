import assert from 'node:assert/strict';
import test from 'node:test';

import { validateEsmPublishContract, validateReleaseGroupPackages } from './check-release-groups.mjs';

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

test('feature release groups cannot depend on other feature release groups', () => {
  const packages = structuredClone(basePackages);
  packages.find(({ manifest }) => manifest.name === '@retikz/plot').manifest.dependencies['@retikz/table'] =
    'workspace:^';

  const diagnostics = validateReleaseGroupPackages({
    releaseGroups: baseGroups,
    packageRecords: packages,
  });

  assert.ok(diagnostics.some(diagnostic => diagnostic.includes('@retikz/plot cannot depend on feature group table')));
});
