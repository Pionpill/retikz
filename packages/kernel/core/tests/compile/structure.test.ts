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
      'CompileWarningCode',
      'compileToScene',
      'computeLayout',
      'fallbackMeasurer',
      'formatCompileWarning',
    ]);
  });

  it('path index is a barrel, not the path emitter implementation', () => {
    const text = source('src/compile/path/index.ts');
    expect(text).not.toContain('export const emitPathPrimitive =');
    expect(text).not.toContain('const buildPathTransforms =');
  });

  it('path emit module delegates focused helpers', () => {
    const text = source('src/compile/path/emit.ts');
    expect(text).not.toContain('const buildMarkMarkerGroup =');
    expect(text).not.toContain('const buildPathTransforms =');
    expect(text).not.toContain('const assertValidGeneratedCommand =');
  });
});
