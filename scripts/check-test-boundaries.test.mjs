import assert from 'node:assert/strict';
import test from 'node:test';

import { collectTestBoundaryDiagnostics, formatTestBoundaryDiagnostic } from './check-test-boundaries.mjs';

const source = (filePath, content, tracked = true) => ({ content, filePath, tracked });

test('拒绝运行时测试和规范文件中的每个仅类型标记', () => {
  const diagnostics = collectTestBoundaryDiagnostics([
    source(
      'packages/kernel/core/tests/example.test.ts',
      [
        'expectTypeOf<Value>().toBeString();',
        '// @ts-expect-error invalid field',
        'expectTypeOf<Value>().toMatchTypeOf<string>();',
        'expectTypeOf<Value>().toEqualTypeOf<string>();',
      ].join('\n'),
    ),
    source('apps/docs/tests/example.spec.tsx', 'expectTypeOf<Props>().toBeObject();'),
  ]);

  assert.deepEqual(
    diagnostics.map(diagnostic => [diagnostic.filePath, diagnostic.line, diagnostic.rule]),
    [
      ['packages/kernel/core/tests/example.test.ts', 1, 'runtime-type-marker'],
      ['packages/kernel/core/tests/example.test.ts', 2, 'runtime-type-marker'],
      ['packages/kernel/core/tests/example.test.ts', 3, 'runtime-type-marker'],
      ['packages/kernel/core/tests/example.test.ts', 4, 'runtime-type-marker'],
      ['apps/docs/tests/example.spec.tsx', 1, 'runtime-type-marker'],
    ],
  );
});

test('拒绝独立的类型检查测试数据', () => {
  const diagnostics = collectTestBoundaryDiagnostics([
    source('packages/viz/table/tests/types/public.typecheck.ts', 'const value: string = "ok";'),
    source('apps/docs/tests/types/preview.typecheck.tsx', 'export {};', false),
  ]);

  assert.deepEqual(
    diagnostics.map(diagnostic => [diagnostic.filePath, diagnostic.line, diagnostic.rule]),
    [
      ['packages/viz/table/tests/types/public.typecheck.ts', 1, 'standalone-typecheck'],
      ['apps/docs/tests/types/preview.typecheck.tsx', 1, 'standalone-typecheck'],
    ],
  );
});

test('接受运行时断言和普通源类型', () => {
  const diagnostics = collectTestBoundaryDiagnostics([
    source('packages/kernel/core/tests/example.test.ts', 'expect(value).toEqual(expected);'),
    source('packages/kernel/core/src/example.ts', 'const value: string = "ok";'),
  ]);

  assert.deepEqual(diagnostics, []);
});

test('拒绝被 Git 跟踪的临时测试且跳过已忽略的未跟踪临时文件', () => {
  const diagnostics = collectTestBoundaryDiagnostics([
    source('packages/kernel/core/tests/_scratch/tracked.test.ts', 'expect(true).toBe(true);'),
    source('packages/kernel/core/tests/_scratch/local.test.ts', 'expectTypeOf<Value>();', false),
  ]);

  assert.deepEqual(
    diagnostics.map(diagnostic => [diagnostic.filePath, diagnostic.rule]),
    [['packages/kernel/core/tests/_scratch/tracked.test.ts', 'tracked-scratch']],
  );
});

test('标准化 Windows 分隔符并报告多个诊断', () => {
  const diagnostics = collectTestBoundaryDiagnostics([
    source('apps\\docs\\tests\\types\\preview.typecheck.tsx', 'export {};'),
    source('packages\\kernel\\core\\tests\\scene.spec.ts', '// @ts-expect-error invalid scene'),
  ]);

  assert.equal(diagnostics.length, 2);
  assert.match(formatTestBoundaryDiagnostic(diagnostics[0]), /^apps[\\/]docs[\\/]tests[\\/]types/);
  assert.match(formatTestBoundaryDiagnostic(diagnostics[0]), /standalone typecheck fixtures are not allowed/);
  assert.match(formatTestBoundaryDiagnostic(diagnostics[1]), /runtime tests must not contain type-only markers/);
});
