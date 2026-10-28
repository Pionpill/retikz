import assert from 'node:assert/strict';
import { realpathSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  assertSafeTempPath,
  exportSpecifiers,
  peerTypePackageName,
  renderFixtureWorkspaceYaml,
  validateDistFiles,
  validatePackedDependencyRanges,
  validatePackedFiles,
  validatePackedManifestContract,
} from './check-publish-artifacts.mjs';
import { releaseGroups } from './release-groups.config.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('对等包名称映射到其 DefinitelyTyped 包名称', () => {
  assert.equal(peerTypePackageName('react'), '@types/react');
  assert.equal(peerTypePackageName('@scope/example'), '@types/scope__example');
});

test('有效的单一格式 dist 文件没有诊断', () => {
  const diagnostics = validateDistFiles('@retikz/example', [
    'index.js',
    'internal/helper.js',
    'types/index.d.ts',
    'types/index.d.ts.map',
  ]);

  assert.deepEqual(diagnostics, []);
});

test('遗留和重复的 dist 树被拒绝', () => {
  const invalidCases = [
    ['es/index.js', 'dist/es'],
    ['lib/index.cjs', 'dist/lib'],
    ['index.cjs', '.cjs'],
    ['index.cjs.map', '.cjs'],
    ['index.d.ts', 'dist/types'],
    ['index.d.ts.map', 'dist/types'],
    ['types/index.js', 'runtime JavaScript'],
    ['metadata.json', 'unexpected dist file'],
    ['types/metadata.json', 'unexpected dist file'],
  ];

  for (const [file, expected] of invalidCases) {
    assert.ok(
      validateDistFiles('@retikz/example', ['index.js', 'types/index.d.ts', file]).some(diagnostic =>
        diagnostic.includes(expected),
      ),
      file,
    );
  }
});

test('打包文件使用 pnpm 包相对路径', () => {
  const diagnostics = validatePackedFiles('@retikz/example', [
    { path: 'dist/index.js' },
    { path: 'dist/types/index.d.ts' },
    { path: 'LICENSE' },
    { path: 'README.md' },
    { path: 'package.json' },
  ]);

  assert.deepEqual(diagnostics, []);
  assert.ok(
    validatePackedFiles('@retikz/example', [{ path: 'package/dist/index.js' }]).some(diagnostic =>
      diagnostic.includes('unexpected packed file'),
    ),
  );
});

test('在固定装置覆盖之前必须重写打包工作空间依赖范围', () => {
  const sourceManifest = {
    name: '@retikz/example',
    dependencies: {
      '@retikz/same-group': 'workspace:*',
      '@retikz/other-group': 'workspace:^',
    },
  };
  const versionsByPackage = new Map([
    ['@retikz/same-group', '0.4.0-beta.2'],
    ['@retikz/other-group', '0.1.0-beta.2'],
  ]);
  const validPackedManifest = {
    name: '@retikz/example',
    dependencies: {
      '@retikz/same-group': '0.4.0-beta.2',
      '@retikz/other-group': '^0.1.0-beta.2',
    },
  };

  assert.deepEqual(
    validatePackedDependencyRanges({ sourceManifest, packedManifest: validPackedManifest, versionsByPackage }),
    [],
  );

  const invalidPackedManifest = structuredClone(validPackedManifest);
  invalidPackedManifest.dependencies['@retikz/same-group'] = 'workspace:*';

  assert.ok(
    validatePackedDependencyRanges({
      sourceManifest,
      packedManifest: invalidPackedManifest,
      versionsByPackage,
    }).some(diagnostic => diagnostic.includes('workspace:*')),
  );
});

test('打包清单字段和每个导出目标必须匹配 publishConfig', () => {
  const sourceManifest = {
    name: '@retikz/example',
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
  };
  const packedManifest = {
    name: '@retikz/example',
    main: './dist/index.js',
    module: './dist/index.js',
    types: './dist/types/index.d.ts',
    exports: structuredClone(sourceManifest.publishConfig.exports),
  };
  const packedFiles = [{ path: 'dist/index.js' }, { path: 'dist/types/index.d.ts' }];

  assert.deepEqual(validatePackedManifestContract({ sourceManifest, packedManifest, packedFiles }), []);

  const missingTypeTarget = [{ path: 'dist/index.js' }];

  assert.ok(
    validatePackedManifestContract({ sourceManifest, packedManifest, packedFiles: missingTypeTarget }).some(
      diagnostic => diagnostic.includes('dist/types/index.d.ts'),
    ),
  );

  const inconsistentCases = [
    ['main', manifest => (manifest.main = './dist/other.js'), 'packed main'],
    ['module', manifest => (manifest.module = './dist/other.js'), 'packed module'],
    ['types', manifest => (manifest.types = './dist/types/other.d.ts'), 'packed types'],
    ['exports', manifest => (manifest.exports['.'].default = './dist/other.js'), 'packed exports'],
  ];

  for (const [label, mutate, expected] of inconsistentCases) {
    const inconsistentManifest = structuredClone(packedManifest);
    mutate(inconsistentManifest);

    assert.ok(
      validatePackedManifestContract({ sourceManifest, packedManifest: inconsistentManifest, packedFiles }).some(
        diagnostic => diagnostic.includes(expected),
      ),
      label,
    );
  }
});

test('导出说明符包括包根目录和公共子路径', () => {
  assert.deepEqual(
    exportSpecifiers({
      name: '@retikz/tex',
      exports: {
        '.': {},
        './react': {},
      },
    }),
    ['@retikz/tex', '@retikz/tex/react'],
  );
});

test('测试数据覆盖写入 pnpm 11 工作区设置中', () => {
  assert.equal(
    renderFixtureWorkspaceYaml({
      '@retikz/core': 'file:C:/tmp/retikz-core.tgz',
      '@retikz/math': 'file:C:/tmp/retikz-math.tgz',
    }),
    [
      'overrides:',
      '  "@retikz/core": "file:C:/tmp/retikz-core.tgz"',
      '  "@retikz/math": "file:C:/tmp/retikz-math.tgz"',
      '',
    ].join('\n'),
  );
});

test('安全临时路径仅接受直接 retikz 发布任务目录', () => {
  const tempRoot = realpathSync(os.tmpdir());
  const validPath = path.join(tempRoot, 'retikz-publish-123');

  assert.doesNotThrow(() => assertSafeTempPath(validPath));

  const invalidPaths = [
    tempRoot,
    path.dirname(tempRoot),
    path.resolve(tempRoot, '..', 'workspace'),
    path.join(tempRoot, 'other-task-123'),
    path.join(validPath, 'nested'),
  ];

  for (const invalidPath of invalidPaths) {
    assert.throws(() => assertSafeTempPath(invalidPath), /Refusing to delete/);
  }
});

test('Foundation 发布产物仅限 root，并且仅具有 Zod 运行时依赖项', async () => {
  assert.ok(releaseGroups.kernel.packages.includes('@retikz/foundation'));

  const manifest = JSON.parse(
    await readFile(path.join(repoRoot, 'packages', 'kernel', 'foundation', 'package.json'), 'utf8'),
  );

  assert.equal(manifest.sideEffects, false);
  assert.deepEqual(Object.keys(manifest.exports), ['.']);
  assert.deepEqual(Object.keys(manifest.publishConfig.exports), ['.']);
  assert.deepEqual(manifest.dependencies ?? {}, { zod: 'catalog:' });
  assert.deepEqual(manifest.peerDependencies ?? {}, {});
});
