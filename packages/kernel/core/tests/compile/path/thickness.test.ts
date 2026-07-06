import { describe, expect, it } from 'vitest';

import type { IRScene } from '../../../src/schemas';

import { compileToScene } from '../../../src/compile/compile';
import { findPathPrim } from './helpers';

describe('alpha.3 P2：thickness 语义档位', () => {
  it.each([
    ['ultraThin', 0.25],
    ['veryThin', 0.5],
    ['thin', 1],
    ['semithick', 1.5],
    ['thick', 2],
    ['veryThick', 3],
    ['ultraThick', 4],
  ] as const)('thickness=%s → strokeWidth=%s', (thickness, width) => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          thickness,
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).strokeWidth).toBe(width);
  });

  it('显式 strokeWidth 始终覆盖 thickness（thickness 仅在 strokeWidth 缺省时生效）', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          thickness: 'thick',
          strokeWidth: 7,
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).strokeWidth).toBe(7);
  });

  it('两者都缺省时退回默认 1', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ],
    };
    expect(findPathPrim(compileToScene(ir).primitives).strokeWidth).toBe(1);
  });
});
