import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import * as core from '../src';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const sourceFiles = (directory: string): Array<string> => {
  const entries = readdirSync(resolve(root, directory), { withFileTypes: true });
  return entries.flatMap(entry => {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return sourceFiles(path);
    return entry.isFile() && path.endsWith('.ts') ? [path] : [];
  });
};

const source = (path: string): string => readFileSync(resolve(root, path), 'utf8');

describe('Core public API', () => {
  it('只公开 schema 派生的 Source IR，不定义 framework authoring 输入别名', () => {
    const forbidden = [
      'IRNodeLabelBoundaryPositionInput',
      'IRNodeLabelInput',
      'IRGeometryLabelInput',
      'IRStepLabelInput',
      'IRAtPositionInput',
      'IRAtTranslateTransformInput',
      'IRTransformInput',
    ];
    const offenders = sourceFiles('src/schemas').flatMap(path => {
      const content = source(path);
      return forbidden.filter(name => new RegExp(`\\b${name}\\b`).test(content)).map(name => `${path}: ${name}`);
    });

    expect(offenders).toEqual([]);
  });

  it('保留路径粗细词汇和确定性映射，不公开 typed authoring dispatch', () => {
    expect(core.PathThickness.Thick).toBe('thick');
    expect(core.THICKNESS_TO_WIDTH.thick).toBe(2);
    expect(core).not.toHaveProperty('parsePathThickness');
  });

  it('公开 occurrence 展开路径的稳定阶段类别', () => {
    expect(core.CompileExpansionKind).toEqual({
      Expand: 'expand',
      Output: 'output',
      Probe: 'probe',
      Replay: 'replay',
      ScopeChild: 'scopeChild',
    });
  });

  it('公开 occurrence 和 observation owner 的稳定比较工具', () => {
    const first = { sourcePath: 'children[0]', expansionPath: [{ kind: 'expand', index: 0 }] } as const;
    const second = { sourcePath: 'children[1]', expansionPath: [{ kind: 'expand', index: 0 }] } as const;
    expect(core.isCompileOccurrenceEqual(first, first)).toBe(true);
    expect(core.isCompileOccurrenceEqual(first, second)).toBe(false);
    expect(core.compareCompileOccurrences(first, second)).toBeLessThan(0);
    expect(
      core.isCompileObservationOwnerEqual(
        { kind: 'composite', namespace: 'retikz', type: 'card' },
        { kind: 'composite', namespace: 'retikz', type: 'card' },
      ),
    ).toBe(true);
  });
});
