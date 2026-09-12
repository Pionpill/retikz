import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import * as compile from '../../src/compile';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const source = (path: string): string => readFileSync(resolve(root, path), 'utf8');

describe('compile source structure', () => {
  it('compile barrel exposes only stable runtime entries', () => {
    expect(Object.keys(compile).sort()).toEqual([
      'CORE_PROGRAM_ID',
      'CompileWarningCode',
      'compileToScene',
      'computeLayout',
      'createCoreProgram',
      'fallbackMeasurer',
      'formatCompileOccurrence',
      'formatCompileWarning',
      'isNodeLayoutCompileArtifact',
      'lowerIRToKernel',
      'observeCompileToScene',
    ]);
  });

  it('node resolve stays free of compile dependencies', () => {
    for (const path of ['src/resolve/node/shape.ts', 'src/resolve/node/boundary.ts']) {
      expect(source(path)).not.toContain('/compile/');
    }
  });
});
