import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import ts from 'typescript';

import {
  collectDeprecatedDiagnostics,
  filterTypeScriptPaths,
  formatDeprecatedDiagnostic,
} from './check-deprecations.mjs';

test('报告标记为已弃用的消费声明', () => {
  const fixtureDirectory = mkdtempSync(path.join(os.tmpdir(), 'retikz-deprecation-'));
  const fixturePath = path.join(fixtureDirectory, 'deprecated-api.ts');

  try {
    writeFileSync(
      fixturePath,
      ['/** @deprecated Use currentApi instead */', 'export const legacyApi = () => undefined;', 'legacyApi();'].join(
        '\n',
      ),
      'utf8',
    );

    const diagnostics = collectDeprecatedDiagnostics({
      rootNames: [fixturePath],
      options: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ESNext,
      },
    });

    assert.equal(diagnostics.length, 1);
    assert.match(formatDeprecatedDiagnostic(diagnostics[0]), /legacyApi/);
  } finally {
    rmSync(fixtureDirectory, { force: true, recursive: true });
  }
});

test('仅保留更改的 TypeScript 源路径', () => {
  assert.deepEqual(
    filterTypeScriptPaths(['packages/viz/table/src/schema.ts', 'apps/docs/example.demo.tsx', 'README.md']),
    ['packages/viz/table/src/schema.ts', 'apps/docs/example.demo.tsx'],
  );
});
