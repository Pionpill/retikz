import assert from 'node:assert/strict';
import test from 'node:test';

import { validateReleaseGroupPackages } from './check-release-groups.mjs';

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
    packages: ['@retikz/table'],
  },
};

const basePackages = [
  {
    path: 'packages/kernel/math/package.json',
    manifest: {
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
];

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
